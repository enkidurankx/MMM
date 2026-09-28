import Foundation
import CoreMIDI

struct MonitorStats {
    var receiving = false
    var bpm: Double?
    var driftPPM: Double?
    var jitterMs: Double?
    var maxDevMs: Double?
    var phaseMs: Double?
    var transport = "—"
}

struct SourceInfo: Identifiable, Hashable {
    let id: Int32
    let name: String
}

/// Listens to the MIDI clock of one input and reports tempo, jitter, long-term drift and phase
/// relative to our own clock (useful when a device/DAW echoes our clock back).
final class ClockMonitor: ObservableObject {
    @Published var sources: [SourceInfo] = []
    @Published var selected: Int32 {
        didSet { UserDefaults.standard.set(Int(selected), forKey: "monitor.uid"); connect() }
    }
    @Published var stats = MonitorStats()

    private let engine: ClockEngine
    private var inPort = MIDIPortRef()
    private var connected: MIDIEndpointRef = 0
    private let lock = NSLock()
    private var arrivals: [Double] = []
    private var phases: [Double] = []
    private var lastArrival = 0.0
    private var transport = "—"

    init(engine: ClockEngine) {
        self.engine = engine
        selected = Int32(truncatingIfNeeded: UserDefaults.standard.integer(forKey: "monitor.uid"))
        MIDIInputPortCreateWithBlock(engine.client, "MMM Clock In" as CFString, &inPort) { [weak self] list, _ in
            self?.receive(list)
        }
    }

    func refreshSources() {
        var out: [SourceInfo] = []
        for i in 0..<MIDIGetNumberOfSources() {
            let ep = MIDIGetSource(i)
            let uid = MIDIProps.int(ep, kMIDIPropertyUniqueID)
            if uid == ClockEngine.virtualUID { continue }
            out.append(SourceInfo(id: uid, name: MIDIProps.string(ep, kMIDIPropertyDisplayName)))
        }
        sources = out
        connect()
    }

    private func connect() {
        if connected != 0 { MIDIPortDisconnectSource(inPort, connected); connected = 0 }
        lock.lock(); arrivals.removeAll(); phases.removeAll(); transport = "—"; lock.unlock()
        guard selected != 0 else { return }
        var obj: MIDIObjectRef = 0
        var type = MIDIObjectType.other
        if MIDIObjectFindByUniqueID(selected, &obj, &type) == noErr, type == .source {
            connected = obj
            MIDIPortConnectSource(inPort, obj, nil)
        }
    }

    private func receive(_ list: UnsafePointer<MIDIPacketList>) {
        for pkt in list.unsafeSequence() {
            let ts = pkt.pointee.timeStamp
            let len = min(Int(pkt.pointee.length), 256)
            withUnsafeBytes(of: pkt.pointee.data) { raw in
                for i in 0..<len where raw[i] >= 0xF8 { handle(ts, raw[i]) }
            }
        }
    }

    private func handle(_ ts: UInt64, _ byte: UInt8) {
        let a = Double(ts == 0 ? mach_absolute_time() : ts)
        switch byte {
        case 0xF8:
            let delta = engine.tickDeltaMs(arrival: UInt64(a))
            lock.lock()
            if let last = arrivals.last, a - last > HostClock.ticks(ms: 500) { arrivals.removeAll(); phases.removeAll() }
            arrivals.append(a)
            if arrivals.count > 480 { arrivals.removeFirst(arrivals.count - 480) }
            if let d = delta { phases.append(d); if phases.count > 48 { phases.removeFirst() } }
            lastArrival = a
            lock.unlock()
        case 0xFA: setTransport("START")
        case 0xFB: setTransport("CONTINUE")
        case 0xFC: setTransport("STOP")
        default: break
        }
    }

    private func setTransport(_ s: String) { lock.lock(); transport = s; lock.unlock() }

    /// Call from the UI at ~10 Hz.
    func refresh(ourBPM: Double) {
        lock.lock()
        let arr = arrivals, ph = phases, last = lastArrival, tr = transport
        lock.unlock()
        var s = MonitorStats()
        s.transport = tr
        s.receiving = last > 0 && HostClock.ms(HostClock.now() - last) < 500
        if s.receiving, arr.count >= 24 {
            // Jitter: spread of the tick-to-tick interval over the last 96 ticks.
            let recent = Array(arr.suffix(97))
            let iv = zip(recent.dropFirst(), recent).map { HostClock.ms($0 - $1) }
            let mean = iv.reduce(0, +) / Double(iv.count)
            s.jitterMs = (iv.map { ($0 - mean) * ($0 - mean) }.reduce(0, +) / Double(iv.count)).squareRoot()
            s.maxDevMs = iv.map { abs($0 - mean) }.max()
            // Long-window tempo: least-squares slope of arrival time vs tick number.
            if arr.count >= 96 {
                let n = Double(arr.count)
                let t0 = arr[0]
                var sx = 0.0, sy = 0.0, sxy = 0.0, sxx = 0.0
                for (i, v) in arr.enumerated() {
                    let x = Double(i), y = HostClock.ms(v - t0)
                    sx += x; sy += y; sxy += x * y; sxx += x * x
                }
                let slope = (n * sxy - sx * sy) / (n * sxx - sx * sx)   // ms per tick
                let bpm = 60_000.0 / (slope * 24.0)
                s.bpm = bpm
                s.driftPPM = (bpm / ourBPM - 1) * 1_000_000
            } else {
                s.bpm = 60_000.0 / (mean * 24.0)
            }
        }
        if ph.count >= 12 { s.phaseMs = ph.sorted()[ph.count / 2] }
        stats = s
    }
}
