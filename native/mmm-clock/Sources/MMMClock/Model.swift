import Foundation
import CoreMIDI
import Combine
import AppKit
import Carbon.HIToolbox

enum MIDIProps {
    static func string(_ obj: MIDIObjectRef, _ prop: CFString) -> String {
        var cf: Unmanaged<CFString>?
        MIDIObjectGetStringProperty(obj, prop, &cf)
        if let c = cf { return c.takeRetainedValue() as String }
        return "?"
    }
    static func int(_ obj: MIDIObjectRef, _ prop: CFString) -> Int32 {
        var v: Int32 = 0
        MIDIObjectGetIntegerProperty(obj, prop, &v)
        return v
    }
}

final class OutputRoute: ObservableObject, Identifiable {
    let id: Int32
    let name: String
    let isVirtual: Bool
    var endpoint: MIDIEndpointRef
    var changed: (() -> Void)?

    @Published var enabled: Bool {
        didSet { UserDefaults.standard.set(enabled, forKey: "route.\(id).enabled"); changed?() }
    }
    @Published var offsetMs: Double {
        didSet { UserDefaults.standard.set(offsetMs, forKey: "route.\(id).offset"); changed?() }
    }

    init(id: Int32, name: String, isVirtual: Bool, endpoint: MIDIEndpointRef) {
        let d = UserDefaults.standard
        self.id = id; self.name = name; self.isVirtual = isVirtual; self.endpoint = endpoint
        enabled = d.object(forKey: "route.\(id).enabled") as? Bool ?? isVirtual
        offsetMs = d.double(forKey: "route.\(id).offset")
    }

    var config: RouteConfig {
        RouteConfig(uid: id, endpoint: endpoint, isVirtual: isVirtual, enabled: enabled, offsetMs: offsetMs)
    }
}

final class AppModel: ObservableObject {
    let engine = ClockEngine()
    let monitor: ClockMonitor
    let audioSync = AudioSync()
    private var cancellables: [AnyCancellable] = []

    @Published var routes: [OutputRoute] = []
    @Published var playing = false
    @Published var bpm: Double {
        didSet {
            // Assigning inside didSet re-fires it on a @Published property, so only write when the
            // value actually changes (the re-entry then sees a clean value and falls through).
            guard bpm.isFinite else { bpm = 120; return }
            let clamped = min(300, max(20, bpm))
            if clamped != bpm { bpm = clamped; return }
            if !tempoFromLink { engine.setBPM(bpm) }
            UserDefaults.standard.set(bpm, forKey: "bpm")
        }
    }
    // Ableton Link: the clock follows the Link session (Live, other apps, Link hardware) and sends MIDI
    // clock / audio pulses to gear that has no Link. Tempo and (optionally) start/stop are shared.
    @Published var linkEnabled: Bool { didSet { applyLink() } }
    @Published var linkStartStop: Bool { didSet { applyLink() } }
    @Published var linkPeers = 0
    private var tempoFromLink = false
    private var linkTimer: Timer?

    @Published var clockWhileStopped: Bool { didSet { pushOptions() } }
    @Published var sendSPP: Bool { didSet { pushOptions() } }
    @Published var keepOnTop: Bool {
        didSet { UserDefaults.standard.set(keepOnTop, forKey: "keepOnTop"); applyKeepOnTop() }
    }

    @Published var appearance: AppearanceMode {
        didSet {
            UserDefaults.standard.set(appearance.rawValue, forKey: "appearance")
            NSApplication.shared.appearance = appearance.nsAppearance
        }
    }

    // Audio sync (pulse output for non-MIDI gear); every change goes through applyAudio().
    @Published var audioEnabled: Bool { didSet { applyAudio() } }
    @Published var audioDeviceUID: String { didSet { applyAudio() } }
    @Published var audioPPQ: Int { didSet { applyAudio() } }               // pulses per quarter note
    @Published var audioWidthMs: Double { didSet { applyAudio() } }
    @Published var audioLevel: Double { didSet { applyAudio() } }
    @Published var audioInvert: Bool { didSet { applyAudio() } }
    @Published var audioOffsetMs: Double { didSet { applyAudio() } }
    @Published var audioOnlyWhilePlaying: Bool { didSet { applyAudio() } }
    static let audioPPQChoices = [1, 2, 3, 4, 6, 8, 12, 24]

    private var taps: [Date] = []
    private var keyMonitor: Any?
    private var hotKey: GlobalHotKey?

    init() {
        let d = UserDefaults.standard
        let saved = d.double(forKey: "bpm")
        bpm = saved > 0 ? saved : 120
        clockWhileStopped = d.object(forKey: "clockWhileStopped") as? Bool ?? true
        sendSPP = d.object(forKey: "sendSPP") as? Bool ?? true
        linkEnabled = d.bool(forKey: "link.enabled")
        linkStartStop = d.object(forKey: "link.startStop") as? Bool ?? true
        keepOnTop = d.bool(forKey: "keepOnTop")
        appearance = AppearanceMode(rawValue: d.string(forKey: "appearance") ?? "") ?? .auto
        audioEnabled = d.bool(forKey: "audio.enabled")
        audioDeviceUID = d.string(forKey: "audio.device") ?? ""
        let ppq = d.integer(forKey: "audio.ppq")
        audioPPQ = AppModel.audioPPQChoices.contains(ppq) ? ppq : 4
        let w = d.double(forKey: "audio.width")
        audioWidthMs = w > 0 ? min(30, max(1, w)) : 10
        let lv = d.double(forKey: "audio.level")
        audioLevel = lv > 0 ? min(1, max(0.05, lv)) : 1
        audioInvert = d.bool(forKey: "audio.invert")
        audioOffsetMs = min(200, max(-250, d.double(forKey: "audio.offset")))
        audioOnlyWhilePlaying = d.object(forKey: "audio.onlyPlaying") as? Bool ?? true
        monitor = ClockMonitor(engine: engine)
        // Nested ObservableObjects don't propagate on their own.
        monitor.objectWillChange.sink { [weak self] _ in self?.objectWillChange.send() }.store(in: &cancellables)

        audioSync.objectWillChange.sink { [weak self] _ in self?.objectWillChange.send() }.store(in: &cancellables)
        let sync = audioSync
        engine.audioSink = { t in sync.enqueue(t) }
        audioSync.onDevicesChanged = { [weak self] in self?.applyAudio() }
        engine.setBPM(bpm)
        pushOptions()
        engine.onSetupChanged = { [weak self] in self?.refreshPorts() }
        refreshPorts()
        engine.startThread()
        applyAudio()
        applyLink()
        linkTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in self?.pollLink() }
        NSApplication.shared.appearance = appearance.nsAppearance
        installSpaceBar()
        // Ctrl+Opt+Space starts/stops from any app (e.g. while Ableton is in front).
        hotKey = GlobalHotKey(keyCode: kVK_Space, modifiers: controlKey | optionKey) { [weak self] in
            self?.toggle()
        }
    }

    func applyKeepOnTop() {
        for w in NSApp.windows where w.title == "MMM Clock" {
            w.level = keepOnTop ? .floating : .normal
            w.hidesOnDeactivate = false
            // Also float over full-screen apps (e.g. a DAW) and follow you across desktops.
            if keepOnTop { w.collectionBehavior.formUnion([.canJoinAllSpaces, .fullScreenAuxiliary]) }
            else { w.collectionBehavior.subtract([.canJoinAllSpaces, .fullScreenAuxiliary]) }
        }
    }

    /// Space = start/stop, unless a text field is being edited (then it types a space as usual).
    private func installSpaceBar() {
        keyMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] e in
            let plain = e.modifierFlags.intersection([.command, .control, .option, .shift]).isEmpty
            guard e.keyCode == 49, plain, !(NSApp.keyWindow?.firstResponder is NSTextView) else { return e }
            if !e.isARepeat { self?.toggle() }
            return nil
        }
    }

    private func pushOptions() {
        UserDefaults.standard.set(clockWhileStopped, forKey: "clockWhileStopped")
        UserDefaults.standard.set(sendSPP, forKey: "sendSPP")
        engine.setOptions(clockWhileStopped: clockWhileStopped, sendSPP: sendSPP)
    }

    /// Joins/leaves the Link session and stores the two switches.
    func applyLink() {
        let d = UserDefaults.standard
        d.set(linkEnabled, forKey: "link.enabled")
        d.set(linkStartStop, forKey: "link.startStop")
        engine.setLink(enabled: linkEnabled, startStopSync: linkStartStop, initialBPM: bpm)
        if !linkEnabled { linkPeers = 0 }
    }

    /// 10 Hz: shows what the Link session is doing (peers, tempo set by someone else, play state).
    private func pollLink() {
        guard linkEnabled else { return }
        let peers = engine.linkPeers
        if peers != linkPeers { linkPeers = peers }
        let t = (engine.linkSessionTempo() * 100).rounded() / 100
        if t.isFinite, t >= 20, t <= 300, abs(t - bpm) > 0.004 {
            tempoFromLink = true; bpm = t; tempoFromLink = false     // no echo back into the session
        }
        if linkStartStop {
            let p = engine.linkSessionPlaying()
            if p != playing { playing = p }
        }
    }

    func pushRoutes() { engine.setRoutes(routes.map { $0.config }) }

    /// Applies and stores all audio-sync settings. Cheap and idempotent: the audio unit is only
    /// (re)started when the device or on/off state changes, never for a slider move.
    func applyAudio() {
        let d = UserDefaults.standard
        d.set(audioEnabled, forKey: "audio.enabled")
        d.set(audioDeviceUID, forKey: "audio.device")
        d.set(audioPPQ, forKey: "audio.ppq")
        d.set(audioWidthMs, forKey: "audio.width")
        d.set(audioLevel, forKey: "audio.level")
        d.set(audioInvert, forKey: "audio.invert")
        d.set(audioOffsetMs, forKey: "audio.offset")
        d.set(audioOnlyWhilePlaying, forKey: "audio.onlyPlaying")
        audioSync.configure(widthMs: audioWidthMs, level: audioLevel, invert: audioInvert)
        if audioEnabled && !audioDeviceUID.isEmpty { audioSync.start(deviceUID: audioDeviceUID) }
        else { audioSync.stop() }
        engine.setAudio(enabled: audioEnabled && audioSync.isRunning,
                        divisor: 24 / max(1, audioPPQ), offsetMs: audioOffsetMs,
                        onlyWhilePlaying: audioOnlyWhilePlaying)
    }

    func refreshPorts() {
        var list: [OutputRoute] = []
        func obtain(id: Int32, name: String, virtual: Bool, ep: MIDIEndpointRef) -> OutputRoute {
            if let r = routes.first(where: { $0.id == id }) { r.endpoint = ep; return r }
            let r = OutputRoute(id: id, name: name, isVirtual: virtual, endpoint: ep)
            r.changed = { [weak self] in self?.pushRoutes() }
            r.objectWillChange.sink { [weak self] _ in self?.objectWillChange.send() }.store(in: &cancellables)
            return r
        }
        list.append(obtain(id: ClockEngine.virtualUID, name: "MMM Clock (virtual port)", virtual: true,
                           ep: engine.virtualEndpoint))
        for i in 0..<MIDIGetNumberOfDestinations() {
            let ep = MIDIGetDestination(i)
            let uid = MIDIProps.int(ep, kMIDIPropertyUniqueID)
            list.append(obtain(id: uid, name: MIDIProps.string(ep, kMIDIPropertyDisplayName), virtual: false, ep: ep))
        }
        routes = list
        pushRoutes()
        monitor.refreshSources()
    }

    // MARK: transport

    private var linkOwnsTransport: Bool { linkEnabled && linkStartStop }
    func start() { engine.start(); if !linkOwnsTransport { playing = true } }
    func stop() { engine.stop(); if !linkOwnsTransport { playing = false } }
    func cont() { engine.cont(); if !linkOwnsTransport { playing = true } }
    func toggle() { playing ? stop() : start() }

    func tap() {
        let now = Date()
        if let last = taps.last, now.timeIntervalSince(last) > 2 { taps.removeAll() }
        taps.append(now)
        if taps.count > 6 { taps.removeFirst() }
        guard taps.count >= 2 else { return }
        let span = taps.last!.timeIntervalSince(taps.first!) / Double(taps.count - 1)
        bpm = (60 / span * 100).rounded() / 100
    }
}
