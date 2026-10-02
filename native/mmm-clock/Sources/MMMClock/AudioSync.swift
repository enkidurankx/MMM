import Foundation
import CoreAudio
import AudioToolbox
import Darwin

struct AudioOutputDevice: Identifiable, Hashable {
    let id: AudioDeviceID
    let uid: String
    let name: String
    let channels: Int
}

/// CoreAudio device queries (output devices only).
enum AudioDevices {
    private static func address(_ selector: AudioObjectPropertySelector,
                                scope: AudioObjectPropertyScope = kAudioObjectPropertyScopeGlobal) -> AudioObjectPropertyAddress {
        AudioObjectPropertyAddress(mSelector: selector, mScope: scope, mElement: kAudioObjectPropertyElementMain)
    }

    static func string(_ id: AudioObjectID, _ selector: AudioObjectPropertySelector) -> String? {
        var addr = address(selector)
        var cf: Unmanaged<CFString>?
        var size = UInt32(MemoryLayout<Unmanaged<CFString>?>.size)
        let st = withUnsafeMutablePointer(to: &cf) { AudioObjectGetPropertyData(id, &addr, 0, nil, &size, $0) }
        guard st == noErr, let c = cf else { return nil }
        return c.takeRetainedValue() as String
    }

    static func outputChannels(_ id: AudioDeviceID) -> Int {
        var addr = address(kAudioDevicePropertyStreamConfiguration, scope: kAudioObjectPropertyScopeOutput)
        var size: UInt32 = 0
        guard AudioObjectGetPropertyDataSize(id, &addr, 0, nil, &size) == noErr, size > 0 else { return 0 }
        let raw = UnsafeMutableRawPointer.allocate(byteCount: Int(size), alignment: 16)
        defer { raw.deallocate() }
        guard AudioObjectGetPropertyData(id, &addr, 0, nil, &size, raw) == noErr else { return 0 }
        let list = UnsafeMutableAudioBufferListPointer(raw.assumingMemoryBound(to: AudioBufferList.self))
        return list.reduce(0) { $0 + Int($1.mNumberChannels) }
    }

    static func nominalRate(_ id: AudioDeviceID) -> Double {
        var addr = address(kAudioDevicePropertyNominalSampleRate)
        var v: Float64 = 0
        var size = UInt32(MemoryLayout<Float64>.size)
        return AudioObjectGetPropertyData(id, &addr, 0, nil, &size, &v) == noErr ? v : 0
    }

    static func outputs() -> [AudioOutputDevice] {
        var addr = address(kAudioHardwarePropertyDevices)
        var size: UInt32 = 0
        let system = AudioObjectID(kAudioObjectSystemObject)
        guard AudioObjectGetPropertyDataSize(system, &addr, 0, nil, &size) == noErr else { return [] }
        var ids = [AudioDeviceID](repeating: 0, count: Int(size) / MemoryLayout<AudioDeviceID>.size)
        guard AudioObjectGetPropertyData(system, &addr, 0, nil, &size, &ids) == noErr else { return [] }
        return ids.compactMap { id in
            let ch = outputChannels(id)
            guard ch > 0 else { return nil }
            return AudioOutputDevice(id: id,
                                     uid: string(id, kAudioDevicePropertyDeviceUID) ?? "\(id)",
                                     name: string(id, kAudioObjectPropertyName) ?? "Device \(id)",
                                     channels: ch)
        }
    }

    static func defaultOutputUID() -> String {
        var addr = address(kAudioHardwarePropertyDefaultOutputDevice)
        var id = AudioDeviceID(0)
        var size = UInt32(MemoryLayout<AudioDeviceID>.size)
        guard AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &addr, 0, nil, &size, &id) == noErr,
              id != 0 else { return "" }
        return string(id, kAudioDevicePropertyDeviceUID) ?? ""
    }
}

private let audioSyncRender: AURenderCallback = { refCon, _, timeStamp, _, frames, ioData in
    Unmanaged<AudioSync>.fromOpaque(refCon).takeUnretainedValue()
        .render(timeStamp, frames: Int(frames), ioData: ioData)
}

/// Audio sync output: one rectangular pulse per clock division, written to a freely chosen audio
/// device (so it never has to pass through the DAW). It is driven by the same event queue as the MIDI
/// routes: the engine hands over the ideal host time of every pulse ~60 ms ahead, and the render
/// callback places it sample-accurately using the host time CoreAudio gives each output buffer
/// (which already includes the device's output latency).
///
/// Real-time rules: the render callback never blocks (it only *tries* the lock, and the pulses are
/// queued early enough that one missed cycle loses nothing) and never allocates.
final class AudioSync: ObservableObject {
    @Published private(set) var devices: [AudioOutputDevice] = []
    @Published private(set) var status = "off"
    @Published private(set) var latePulses = 0
    @Published private(set) var defaultUID = ""
    private(set) var isRunning = false
    private(set) var runningUID = ""
    var onDevicesChanged: (() -> Void)?

    private static let capacity = 128
    private var unit: AudioUnit?
    private let lockPtr = UnsafeMutablePointer<os_unfair_lock>.allocate(capacity: 1)
    private let inbox = UnsafeMutablePointer<Double>.allocate(capacity: AudioSync.capacity)
    private let inboxCount = UnsafeMutablePointer<Int>.allocate(capacity: 1)
    private let active = UnsafeMutablePointer<Double>.allocate(capacity: AudioSync.capacity)
    private let activeCount = UnsafeMutablePointer<Int>.allocate(capacity: 1)
    private let lateCount = UnsafeMutablePointer<Int>.allocate(capacity: 1)
    /// 0: pulse width in host ticks, 1: signed amplitude, 2: host ticks per sample frame
    private let prm = UnsafeMutablePointer<Double>.allocate(capacity: 4)

    init() {
        lockPtr.initialize(to: os_unfair_lock())
        inboxCount.initialize(to: 0)
        activeCount.initialize(to: 0)
        lateCount.initialize(to: 0)
        prm.initialize(repeating: 0, count: 4)
        prm[0] = HostClock.ticks(ms: 10)
        prm[1] = 1
        refreshDevices()
        var addr = AudioObjectPropertyAddress(mSelector: kAudioHardwarePropertyDevices,
                                              mScope: kAudioObjectPropertyScopeGlobal,
                                              mElement: kAudioObjectPropertyElementMain)
        AudioObjectAddPropertyListenerBlock(AudioObjectID(kAudioObjectSystemObject), &addr, DispatchQueue.main) { [weak self] _, _ in
            self?.refreshDevices()
            self?.onDevicesChanged?()
        }
    }

    deinit {
        stop()
        lockPtr.deallocate(); inbox.deallocate(); inboxCount.deallocate()
        active.deallocate(); activeCount.deallocate(); lateCount.deallocate(); prm.deallocate()
    }

    func refreshDevices() {
        devices = AudioDevices.outputs()
        defaultUID = AudioDevices.defaultOutputUID()
        if isRunning, !devices.contains(where: { $0.uid == runningUID }) {
            stop()
            status = "device disconnected"
        }
    }

    func configure(widthMs: Double, level: Double, invert: Bool) {
        prm[0] = HostClock.ticks(ms: widthMs)
        prm[1] = level * (invert ? -1 : 1)
    }

    /// Called from the clock engine thread: `hostTime` is when the pulse should reach the output.
    func enqueue(_ hostTime: Double) {
        os_unfair_lock_lock(lockPtr)
        if inboxCount.pointee < AudioSync.capacity {
            inbox[inboxCount.pointee] = hostTime
            inboxCount.pointee += 1
        }
        os_unfair_lock_unlock(lockPtr)
    }

    func refreshStats() {
        let n = lateCount.pointee
        if n != latePulses { latePulses = n }
    }

    func start(deviceUID: String) {
        if isRunning && runningUID == deviceUID { return }
        stop()
        guard let dev = devices.first(where: { $0.uid == deviceUID }) else { status = "device not found"; return }
        let sr = AudioDevices.nominalRate(dev.id)
        guard sr > 0 else { status = "device has no sample rate"; return }

        var desc = AudioComponentDescription(componentType: kAudioUnitType_Output,
                                             componentSubType: kAudioUnitSubType_HALOutput,
                                             componentManufacturer: kAudioUnitManufacturer_Apple,
                                             componentFlags: 0, componentFlagsMask: 0)
        guard let comp = AudioComponentFindNext(nil, &desc) else { status = "no audio output unit"; return }
        var created: AudioUnit?
        guard AudioComponentInstanceNew(comp, &created) == noErr, let au = created else { status = "cannot open audio unit"; return }

        func fail(_ what: String, _ code: OSStatus) {
            AudioComponentInstanceDispose(au)
            status = "\(what) failed (\(code))"
        }

        var devID = dev.id
        var st = AudioUnitSetProperty(au, kAudioOutputUnitProperty_CurrentDevice, kAudioUnitScope_Global, 0,
                                      &devID, UInt32(MemoryLayout<AudioDeviceID>.size))
        if st != noErr { return fail("selecting the device", st) }

        let channels = max(1, min(2, dev.channels))
        var fmt = AudioStreamBasicDescription(
            mSampleRate: sr, mFormatID: kAudioFormatLinearPCM,
            mFormatFlags: kAudioFormatFlagsNativeFloatPacked | kAudioFormatFlagIsNonInterleaved,
            mBytesPerPacket: 4, mFramesPerPacket: 1, mBytesPerFrame: 4,
            mChannelsPerFrame: UInt32(channels), mBitsPerChannel: 32, mReserved: 0)
        st = AudioUnitSetProperty(au, kAudioUnitProperty_StreamFormat, kAudioUnitScope_Input, 0,
                                  &fmt, UInt32(MemoryLayout<AudioStreamBasicDescription>.size))
        if st != noErr { return fail("setting the format", st) }

        prm[2] = HostClock.ticksPerMs * 1000 / sr
        os_unfair_lock_lock(lockPtr)
        inboxCount.pointee = 0; activeCount.pointee = 0; lateCount.pointee = 0
        os_unfair_lock_unlock(lockPtr)
        latePulses = 0

        var cb = AURenderCallbackStruct(inputProc: audioSyncRender,
                                        inputProcRefCon: Unmanaged.passUnretained(self).toOpaque())
        st = AudioUnitSetProperty(au, kAudioUnitProperty_SetRenderCallback, kAudioUnitScope_Input, 0,
                                  &cb, UInt32(MemoryLayout<AURenderCallbackStruct>.size))
        if st != noErr { return fail("setting the callback", st) }
        st = AudioUnitInitialize(au)
        if st != noErr { return fail("initialising", st) }
        st = AudioOutputUnitStart(au)
        if st != noErr { AudioUnitUninitialize(au); return fail("starting", st) }

        unit = au
        isRunning = true
        runningUID = deviceUID
        status = String(format: "running · %.0f Hz · %d ch", sr, channels)
    }

    func stop() {
        if let au = unit {
            AudioOutputUnitStop(au)
            AudioUnitUninitialize(au)
            AudioComponentInstanceDispose(au)
        }
        unit = nil
        isRunning = false
        runningUID = ""
        if status.hasPrefix("running") { status = "off" }
    }

    // MARK: render (audio thread)

    fileprivate func render(_ ts: UnsafePointer<AudioTimeStamp>, frames: Int,
                            ioData: UnsafeMutablePointer<AudioBufferList>?) -> OSStatus {
        guard let ioData = ioData else { return noErr }
        let abl = UnsafeMutableAudioBufferListPointer(ioData)
        for b in abl { if let d = b.mData { memset(d, 0, Int(b.mDataByteSize)) } }
        guard ts.pointee.mFlags.contains(.hostTimeValid) else { return noErr }
        let tps = prm[2]
        guard tps > 0 else { return noErr }
        let bufHost = Double(ts.pointee.mHostTime)
        let bufEnd = bufHost + Double(frames) * tps
        let width = prm[0]
        let amp = Float(prm[1])

        if os_unfair_lock_trylock(lockPtr) {
            let n = inboxCount.pointee
            var i = 0
            while i < n && activeCount.pointee < AudioSync.capacity {
                let s = inbox[i]
                if s < bufHost - HostClock.ticksPerMs { lateCount.pointee += 1 }   // arrived too late for its slot
                active[activeCount.pointee] = s
                activeCount.pointee += 1
                i += 1
            }
            inboxCount.pointee = 0
            os_unfair_lock_unlock(lockPtr)
        }

        var keep = 0
        for k in 0..<activeCount.pointee {
            let s = active[k]
            let e = s + width
            if e <= bufHost { continue }                              // already over
            if s < bufEnd {
                let i0 = max(0, Int(((s - bufHost) / tps).rounded(.up)))
                let i1 = min(frames, Int(((e - bufHost) / tps).rounded(.up)))
                if i1 > i0 {
                    for b in abl {
                        guard let d = b.mData?.assumingMemoryBound(to: Float.self) else { continue }
                        for j in i0..<i1 { d[j] = amp }
                    }
                }
            }
            if e > bufEnd { active[keep] = s; keep += 1 }             // pending, or continues in the next buffer
        }
        activeCount.pointee = keep
        return noErr
    }
}
