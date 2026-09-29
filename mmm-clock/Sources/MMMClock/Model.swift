import Foundation
import CoreMIDI
import Combine

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
            engine.setBPM(bpm)
            UserDefaults.standard.set(bpm, forKey: "bpm")
        }
    }
    @Published var clockWhileStopped: Bool { didSet { pushOptions() } }
    @Published var sendSPP: Bool { didSet { pushOptions() } }

    private var taps: [Date] = []

    init() {
        let d = UserDefaults.standard
        let saved = d.double(forKey: "bpm")
        bpm = saved > 0 ? saved : 120
        clockWhileStopped = d.object(forKey: "clockWhileStopped") as? Bool ?? true
        sendSPP = d.object(forKey: "sendSPP") as? Bool ?? true
        monitor = ClockMonitor(engine: engine)
        // Nested ObservableObjects don't propagate on their own.
        monitor.objectWillChange.sink { [weak self] _ in self?.objectWillChange.send() }.store(in: &cancellables)

        engine.setBPM(bpm)
        pushOptions()
        engine.onSetupChanged = { [weak self] in self?.refreshPorts() }
        refreshPorts()
        engine.startThread()
    }

    private func pushOptions() {
        UserDefaults.standard.set(clockWhileStopped, forKey: "clockWhileStopped")
        UserDefaults.standard.set(sendSPP, forKey: "sendSPP")
        engine.setOptions(clockWhileStopped: clockWhileStopped, sendSPP: sendSPP)
    }

    func pushRoutes() { engine.setRoutes(routes.map { $0.config }) }

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

    func start() { engine.start(); playing = true }
    func stop() { engine.stop(); playing = false }
    func cont() { engine.cont(); playing = true }
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
