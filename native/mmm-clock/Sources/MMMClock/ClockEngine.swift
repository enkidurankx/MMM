import Foundation
import CoreMIDI
import Darwin
import CLink

/// Mach host time helpers. CoreMIDI timestamps are mach_absolute_time() ticks.
enum HostClock {
    static let timebase: mach_timebase_info_data_t = {
        var i = mach_timebase_info_data_t()
        mach_timebase_info(&i)
        return i
    }()
    static let ticksPerMs: Double = 1_000_000.0 * Double(timebase.denom) / Double(timebase.numer)
    static func now() -> Double { Double(mach_absolute_time()) }
    static func ms(_ ticks: Double) -> Double { ticks / ticksPerMs }
    static func ticks(ms: Double) -> Double { ms * ticksPerMs }
}

struct RouteConfig {
    var uid: Int32
    var endpoint: MIDIEndpointRef
    var isVirtual: Bool
    var enabled: Bool
    var offsetMs: Double
}

/// MIDI clock master.
///
/// Ideal tick times are computed drift-free from one running accumulator (host time, Double).
/// A real-time thread generates events ~25 ms ahead, and every destination gets each event with
/// its own timestamp = ideal time + that destination's latency offset. Hardware ports are handed
/// to CoreMIDI early with a future timestamp (the driver schedules it, so the thread's own wake-up
/// jitter does not reach the wire). The virtual port is fed just-in-time.
///
/// Two tempo sources: the internal accumulator (own BPM) or, with Link on, the Ableton Link beat
/// timeline: tick k sits at beat k/24 of the session, so the clock follows Live and other Link peers
/// and keeps their phase. Everything downstream (routes, offsets, audio sync) is the same for both.
final class ClockEngine {
    private(set) var client = MIDIClientRef()
    private var outPort = MIDIPortRef()
    private var virtualSource = MIDIEndpointRef()
    var onSetupChanged: (() -> Void)?

    private enum Command { case start, cont, stop }
    private struct Event { var time: Double; var status: UInt8; var d1: UInt8; var d2: UInt8; var count: Int }
    private final class Route { var cfg: RouteConfig; var cursor = 0; init(_ c: RouteConfig) { cfg = c } }

    private let lock = NSLock()
    private var bpm = 120.0
    private var clockWhileStopped = true
    private var sendSPP = true
    private var playing = false
    private var commands: [Command] = []
    private var nextTick = 0.0
    private var events: [Event] = []
    private var baseSeq = 0
    private var routes: [Int32: Route] = [:]
    private var tickHistory: [Double] = []

    // Ableton Link. `link` is only read by the engine thread through mmm_link_capture() (audio session
    // state); the app-thread calls (tempo, play/stop requests) use Link's app session state.
    private let link: OpaquePointer = mmm_link_create(120.0)
    private var linkOn = false
    private var linkSync = true            // follow Link's start/stop
    private var tickIndex: Int64 = 0       // next MIDI tick as a number of 1/24 beats on the Link timeline
    private var lastTickTime = 0.0
    private var linkTempo = 120.0
    private let linkQuantum = 4.0
    private var stopFlag = false
    private let packetBuf = UnsafeMutableRawPointer.allocate(byteCount: 1024, alignment: 8)

    private let hardwareLookaheadMs = 20.0
    private let virtualLookaheadMs = 1.0

    // Audio sync pulses: fed from the same event queue as the MIDI routes (see AudioSync).
    // The look-ahead is larger because the pulse must be queued before CoreAudio renders the buffer
    // that contains it (buffer length + output latency).
    var audioSink: ((Double) -> Void)?
    private let audioLookaheadMs = 60.0
    private var audioOn = false
    private var audioDivisor = 6          // clock ticks per pulse (24 PPQN / pulses per quarter)
    private var audioOffsetMs = 0.0
    private var audioOnlyWhilePlaying = true
    private var audioCursor = 0
    private var audioTickCount = 0
    private var audioRunning = false

    static let virtualUID: Int32 = 0x4D4D4331

    init() {
        MIDIClientCreateWithBlock("MMM Clock" as CFString, &client) { [weak self] note in
            if note.pointee.messageID == .msgSetupChanged {
                DispatchQueue.main.async { self?.onSetupChanged?() }
            }
        }
        MIDIOutputPortCreate(client, "MMM Clock Out" as CFString, &outPort)
        MIDISourceCreate(client, "MMM Clock" as CFString, &virtualSource)
        // Stable ID so DAWs keep recognising the port between launches.
        MIDIObjectSetIntegerProperty(virtualSource, kMIDIPropertyUniqueID, ClockEngine.virtualUID)
    }

    deinit { packetBuf.deallocate() }

    func startThread() {
        let t = Thread { [weak self] in self?.runLoop() }
        t.name = "MMMClock.engine"
        t.qualityOfService = .userInteractive
        t.start()
    }

    var virtualEndpoint: MIDIEndpointRef { virtualSource }

    // MARK: control (any thread)

    func setBPM(_ v: Double) {
        lock.lock(); bpm = v; let viaLink = linkOn; lock.unlock()
        if viaLink { mmm_link_app_set_tempo(link, v) }      // outside the lock: Link has its own
    }

    // MARK: Ableton Link (any thread)

    /// Joins or leaves the Link session. `initialBPM` is only used when joining a session of our own;
    /// an already running session keeps its tempo (we set the tempo before enabling, as Link expects).
    func setLink(enabled: Bool, startStopSync: Bool, initialBPM: Double) {
        mmm_link_enable_start_stop(link, startStopSync ? 1 : 0)
        lock.lock()
        linkSync = startStopSync
        let joining = enabled && !linkOn
        lock.unlock()
        if joining { mmm_link_app_set_tempo(link, initialBPM) }
        mmm_link_enable(link, enabled ? 1 : 0)
        lock.lock(); defer { lock.unlock() }
        if joining {
            // Continue after the ticks already generated (lastTickTime): no duplicate, no backlog.
            mmm_link_capture(link)
            lastTickTime = nextTick - HostClock.ticks(ms: 60_000.0 / (bpm * 24.0))
            linkTempo = mmm_link_tempo(link)
            if startStopSync { playing = mmm_link_is_playing(link) != 0 }
            commands.removeAll()
        } else if !enabled && linkOn {
            bpm = linkTempo                              // carry on at the session tempo
            nextTick = max(lastTickTime + HostClock.ticks(ms: 60_000.0 / (bpm * 24.0)), HostClock.now())
        }
        linkOn = enabled
    }
    var linkPeers: Int { Int(mmm_link_num_peers(link)) }
    func linkSessionTempo() -> Double { mmm_link_app_tempo(link) }
    func linkSessionPlaying() -> Bool { mmm_link_app_is_playing(link) != 0 }
    private var linkControlsTransport: Bool { lock.lock(); defer { lock.unlock() }; return linkOn && linkSync }
    func setOptions(clockWhileStopped: Bool, sendSPP: Bool) {
        lock.lock(); self.clockWhileStopped = clockWhileStopped; self.sendSPP = sendSPP; lock.unlock()
    }
    func setAudio(enabled: Bool, divisor: Int, offsetMs: Double, onlyWhilePlaying: Bool) {
        lock.lock(); defer { lock.unlock() }
        if enabled && !audioOn {                       // switched on: start from "now", no backlog
            audioCursor = baseSeq + events.count
            audioRunning = playing
            audioTickCount = 0
        }
        audioOn = enabled
        audioDivisor = max(1, divisor)
        audioOffsetMs = offsetMs
        audioOnlyWhilePlaying = onlyWhilePlaying
    }
    // With Link start/stop sync on, the buttons start/stop the whole Link session (Live follows, and so
    // does our own MIDI Start/Stop, which is generated from the session state). CONT = START there.
    func start() { if linkControlsTransport { mmm_link_app_set_playing(link, 1, linkQuantum) } else { push(.start) } }
    func stop() { if linkControlsTransport { mmm_link_app_set_playing(link, 0, linkQuantum) } else { push(.stop) } }
    func cont() { if linkControlsTransport { mmm_link_app_set_playing(link, 1, linkQuantum) } else { push(.cont) } }
    private func push(_ c: Command) { lock.lock(); commands.append(c); lock.unlock() }

    func setRoutes(_ configs: [RouteConfig]) {
        lock.lock(); defer { lock.unlock() }
        let end = baseSeq + events.count
        var next: [Int32: Route] = [:]
        for c in configs {
            if let r = routes[c.uid] { r.cfg = c; next[c.uid] = r }
            else { let r = Route(c); r.cursor = end; next[c.uid] = r }
        }
        routes = next
    }

    /// Offset in ms between an incoming tick's arrival and the nearest ideal tick we generated.
    func tickDeltaMs(arrival: UInt64) -> Double? {
        lock.lock(); defer { lock.unlock() }
        let a = Double(arrival)
        guard tickHistory.count > 2, let idx = tickHistory.lastIndex(where: { $0 <= a }) else { return nil }
        var best = a - tickHistory[idx]
        if idx + 1 < tickHistory.count {
            let d2 = a - tickHistory[idx + 1]
            if abs(d2) < abs(best) { best = d2 }
        } else if best > HostClock.ticks(ms: 60_000 / ((linkOn ? linkTempo : bpm) * 24)) {
            return nil
        }
        return HostClock.ms(best)
    }

    // MARK: engine thread

    private func runLoop() {
        ClockEngine.makeRealtime()
        lock.lock(); nextTick = HostClock.now() + HostClock.ticks(ms: 50); lock.unlock()
        while true {
            lock.lock()
            if stopFlag { lock.unlock(); break }
            let now = HostClock.now()
            let wake = pump(now: now)
            lock.unlock()
            let target = min(max(wake, now + HostClock.ticks(ms: 0.2)), now + HostClock.ticks(ms: 5))
            mach_wait_until(UInt64(target))
        }
    }

    /// Called with the lock held. Returns the host time at which it should be called again.
    private func pump(now: Double) -> Double {
        var minOffset = 0.0
        for r in routes.values where r.cfg.enabled { minOffset = min(minOffset, r.cfg.offsetMs) }
        if audioOn { minOffset = min(minOffset, audioOffsetMs) }
        let lookaheadMs = audioOn ? max(hardwareLookaheadMs, audioLookaheadMs) : hardwareLookaheadMs
        let horizon = now + HostClock.ticks(ms: lookaheadMs + (-minOffset) + 5)
        while nextTick <= horizon { emitTick() }

        let end = baseSeq + events.count
        var wake = now + HostClock.ticks(ms: 5)
        var minCursor = end
        for r in routes.values {
            if !r.cfg.enabled { r.cursor = end; continue }
            let lookahead = HostClock.ticks(ms: r.cfg.isVirtual ? virtualLookaheadMs : hardwareLookaheadMs)
            let offset = HostClock.ticks(ms: r.cfg.offsetMs)
            while r.cursor < end {
                let e = events[r.cursor - baseSeq]
                let ts = e.time + offset
                let due = ts - lookahead
                if due > now { wake = min(wake, due); break }
                send(e, timestamp: ts, to: r.cfg)
                r.cursor += 1
            }
            minCursor = min(minCursor, r.cursor)
        }
        if audioOn {
            let offset = HostClock.ticks(ms: audioOffsetMs)
            let lookahead = HostClock.ticks(ms: audioLookaheadMs)
            while audioCursor < end {
                let e = events[audioCursor - baseSeq]
                let ts = e.time + offset
                if ts - lookahead > now { wake = min(wake, ts - lookahead); break }
                switch e.status {
                case 0xFA: audioTickCount = 0; audioRunning = true        // Start: first pulse on the downbeat
                case 0xFB: audioRunning = true
                case 0xFC: audioRunning = false
                case 0xF8:
                    if (audioRunning || !audioOnlyWhilePlaying) && audioTickCount % audioDivisor == 0 { audioSink?(ts) }
                    audioTickCount += 1
                default: break
                }
                audioCursor += 1
            }
            minCursor = min(minCursor, audioCursor)
        } else {
            audioCursor = end
        }
        let drop = minCursor - baseSeq
        if drop > 64 { events.removeFirst(drop); baseSeq += drop }
        return wake
    }

    private func emitTick() {
        if linkOn { emitLinkTick(); return }
        let t = nextTick
        applyCommands(at: t)
        if playing || clockWhileStopped { add(t, 0xF8, 0, 0, 1) }
        tickHistory.append(t)
        if tickHistory.count > 512 { tickHistory.removeFirst(128) }
        lastTickTime = t
        nextTick += HostClock.ticks(ms: 60_000.0 / (bpm * 24.0))
    }

    /// Link mode: tick k is at beat k/24 of the session timeline. The tempo can change between ticks
    /// (tick times are re-read from the timeline each time), so a tick is never placed earlier than a
    /// quarter period after the previous one.
    private func emitLinkTick() {
        mmm_link_capture(link)
        linkTempo = max(1.0, mmm_link_tempo(link))
        let period = HostClock.ticks(ms: 60_000.0 / (linkTempo * 24.0))
        // The next tick is the first grid point after the previous one, re-derived from the timeline every
        // time: when someone starts the transport Link re-maps beats to time, and a plain counter would jump.
        let probe = UInt64(max(0, lastTickTime + period * 0.5))
        tickIndex = Int64((mmm_link_beat_at_ticks(link, probe, linkQuantum) * 24).rounded(.up))
        var t = Double(mmm_link_ticks_at_beat(link, Double(tickIndex) / 24.0, linkQuantum))
        if t < lastTickTime + period * 0.25 { t = lastTickTime + period * 0.25 }
        if linkSync {
            // MIDI Start/Stop follow the session's play state at the tick closest to when it changed.
            let lp = mmm_link_is_playing(link) != 0
            if lp != playing && t >= Double(mmm_link_playing_time_ticks(link)) - period / 2 {
                if lp {
                    if sendSPP { add(t, 0xF2, 0, 0, 3) }
                    add(t, 0xFA, 0, 0, 1)
                } else {
                    add(t, 0xFC, 0, 0, 1)
                }
                playing = lp
            }
        } else {
            applyCommands(at: t)
        }
        if playing || clockWhileStopped { add(t, 0xF8, 0, 0, 1) }
        tickHistory.append(t)
        if tickHistory.count > 512 { tickHistory.removeFirst(128) }
        lastTickTime = t
        // pump() generates ticks `while nextTick <= horizon`: in Link mode this must advance too (estimate
        // of the next tick; the exact time is re-read from the timeline), otherwise that loop never ends.
        nextTick = t + period
    }

    private func applyCommands(at t: Double) {
        for c in commands {
            switch c {
            case .start:
                if sendSPP { add(t, 0xF2, 0, 0, 3) }
                add(t, 0xFA, 0, 0, 1); playing = true
            case .cont:
                add(t, 0xFB, 0, 0, 1); playing = true
            case .stop:
                add(t, 0xFC, 0, 0, 1); playing = false
            }
        }
        commands.removeAll()
    }

    private func add(_ t: Double, _ s: UInt8, _ d1: UInt8, _ d2: UInt8, _ n: Int) {
        events.append(Event(time: t, status: s, d1: d1, d2: d2, count: n))
    }

    private func send(_ e: Event, timestamp: Double, to cfg: RouteConfig) {
        let list = packetBuf.assumingMemoryBound(to: MIDIPacketList.self)
        let pkt = MIDIPacketListInit(list)
        var bytes: (UInt8, UInt8, UInt8) = (e.status, e.d1, e.d2)
        withUnsafeBytes(of: &bytes) { raw in
            let p = raw.bindMemory(to: UInt8.self)
            _ = MIDIPacketListAdd(list, 1024, pkt, UInt64(max(0, timestamp)), e.count, p.baseAddress!)
        }
        if cfg.isVirtual { MIDIReceived(virtualSource, list) }
        else { MIDISend(outPort, cfg.endpoint, list) }
    }

    private static func makeRealtime() {
        let period = UInt32(HostClock.ticksPerMs)   // 1 ms
        var policy = thread_time_constraint_policy_data_t(
            period: period, computation: period / 4, constraint: period / 2, preemptible: 1)
        let count = mach_msg_type_number_t(
            MemoryLayout<thread_time_constraint_policy_data_t>.size / MemoryLayout<integer_t>.size)
        _ = withUnsafeMutablePointer(to: &policy) { p in
            p.withMemoryRebound(to: integer_t.self, capacity: Int(count)) { q in
                // 2 == THREAD_TIME_CONSTRAINT_POLICY
                thread_policy_set(mach_thread_self(), thread_policy_flavor_t(2), q, count)
            }
        }
    }
}
