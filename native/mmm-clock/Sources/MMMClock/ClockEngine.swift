import Foundation
import CoreMIDI
import Darwin

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
    private var stopFlag = false
    private let packetBuf = UnsafeMutableRawPointer.allocate(byteCount: 1024, alignment: 8)

    private let hardwareLookaheadMs = 20.0
    private let virtualLookaheadMs = 1.0

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

    func setBPM(_ v: Double) { lock.lock(); bpm = v; lock.unlock() }
    func setOptions(clockWhileStopped: Bool, sendSPP: Bool) {
        lock.lock(); self.clockWhileStopped = clockWhileStopped; self.sendSPP = sendSPP; lock.unlock()
    }
    func start() { push(.start) }
    func stop() { push(.stop) }
    func cont() { push(.cont) }
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
        } else if best > HostClock.ticks(ms: 60_000 / (bpm * 24)) {
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
        let horizon = now + HostClock.ticks(ms: hardwareLookaheadMs + (-minOffset) + 5)
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
        let drop = minCursor - baseSeq
        if drop > 64 { events.removeFirst(drop); baseSeq += drop }
        return wake
    }

    private func emitTick() {
        let t = nextTick
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
        if playing || clockWhileStopped { add(t, 0xF8, 0, 0, 1) }
        tickHistory.append(t)
        if tickHistory.count > 512 { tickHistory.removeFirst(128) }
        nextTick += HostClock.ticks(ms: 60_000.0 / (bpm * 24.0))
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
