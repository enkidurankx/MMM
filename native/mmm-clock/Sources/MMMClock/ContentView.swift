import SwiftUI

/// Scales its content (layout, text, controls, all together) and reports the scaled size to the window,
/// so the proportions stay exactly as designed.
private struct SizeKey: PreferenceKey {
    static var defaultValue: CGSize = .zero
    static func reduce(value: inout CGSize, nextValue: () -> CGSize) { value = nextValue() }
}

struct ScaledContent<Content: View>: View {
    let scale: CGFloat
    @ViewBuilder var content: () -> Content
    @State private var size = CGSize(width: 500, height: 640)

    var body: some View {
        content()
            .fixedSize()
            .background(GeometryReader { g in Color.clear.preference(key: SizeKey.self, value: g.size) })
            .onPreferenceChange(SizeKey.self) { if $0.width > 0, $0.height > 0 { size = $0 } }
            .scaleEffect(scale, anchor: .topLeading)
            .frame(width: size.width * scale, height: size.height * scale, alignment: .topLeading)
    }
}

/// A heading with a chevron that folds its content away; the open/closed state is remembered.
struct CollapsibleSection<Content: View>: View {
    let title: String
    @Binding var isOpen: Bool
    var accessory: AnyView? = nil          // stays visible when folded (e.g. an on/off switch)
    @ViewBuilder var content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Button { isOpen.toggle() } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "chevron.right")
                            .rotationEffect(.degrees(isOpen ? 90 : 0))
                            .frame(width: 12)
                        Text(title).font(.headline)
                        Spacer(minLength: 0)
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                if let accessory { accessory }
            }
            if isOpen { content() }
        }
    }
}

struct ContentView: View {
    @EnvironmentObject var m: AppModel
    @AppStorage("compactMode") private var compact = false   // hides everything below the transport and tempo
    @AppStorage("section.outputs") private var outputsOpen = true
    @AppStorage("section.sync") private var syncOpen = true
    @AppStorage("section.input") private var inputOpen = true
    private let ticker = Timer.publish(every: 0.1, on: .main, in: .common).autoconnect()
    static let uiScale: CGFloat = 0.8                         // whole window at 80 %, proportions unchanged

    var body: some View {
        ScaledContent(scale: ContentView.uiScale) { mainContent }
    }

    private var mainContent: some View {
        VStack(alignment: .leading, spacing: 18) {
            transport
            tempo
            if !compact {
                Divider()
                outputs
                Divider()
                audioSyncSection
                Divider()
                monitor
            }
        }
        .padding(20)
        .frame(width: 500)
        .contentShape(Rectangle())
        .onTapGesture { NSApp.keyWindow?.makeFirstResponder(nil) }   // click elsewhere leaves the BPM field
        .onAppear { DispatchQueue.main.async { NSApp.keyWindow?.makeFirstResponder(nil); m.applyKeepOnTop() } }
        .onReceive(ticker) { _ in m.monitor.refresh(ourBPM: m.bpm); m.audioSync.refreshStats() }
    }

    private var transport: some View {
        HStack(spacing: 10) {
            Button { m.start() } label: { Text("START").frame(maxWidth: .infinity) }
                .tint(.green)
            Button { m.cont() } label: { Text("CONT").frame(maxWidth: .infinity) }
            Button { m.stop() } label: { Text("STOP").frame(maxWidth: .infinity) }
                .tint(.red)
        }
        .buttonStyle(.borderedProminent)
        .controlSize(.large)
    }

    private var tempo: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline) {
                TextField("BPM", value: $m.bpm, format: .number.precision(.fractionLength(0...2)))
                    .font(.system(size: 44, weight: .semibold, design: .monospaced))
                    .textFieldStyle(.plain)
                    .frame(width: 170)
                    .onSubmit { NSApp.keyWindow?.makeFirstResponder(nil) }
                Text("BPM").foregroundStyle(.secondary)
                Spacer()
                Circle().fill(m.playing ? Color.green : Color.gray.opacity(0.4)).frame(width: 12, height: 12)
                Text(m.playing ? "running" : "stopped").foregroundStyle(.secondary)
                Toggle(isOn: $m.keepOnTop) { Label("Always on top", systemImage: m.keepOnTop ? "pin.fill" : "pin") }
                    .toggleStyle(.button)
                    .help("Keep this window above all other windows, also over full-screen apps")
                Toggle(isOn: $compact) { Label("Compact", systemImage: compact ? "chevron.down" : "chevron.up") }
                    .toggleStyle(.button)
                    .help("Hide the outputs and input monitor and keep only transport and tempo")
            }
            HStack {
                ForEach([-1.0, -0.1, 0.1, 1.0], id: \.self) { step in
                    Button(step > 0 ? "+\(fmt(step))" : fmt(step)) { m.bpm = ((m.bpm + step) * 100).rounded() / 100 }
                }
                Spacer()
                Button("TAP") { m.tap() }.keyboardShortcut("t", modifiers: [])
            }
        }
    }

    private func fmt(_ v: Double) -> String { String(format: "%g", v) }

    private var outputs: some View {
        CollapsibleSection(title: "Outputs · latency offset", isOpen: $outputsOpen) {
            ForEach(m.routes) { r in OutputRow(route: r) }
            Toggle("Send clock while stopped (devices can lock tempo)", isOn: $m.clockWhileStopped)
            Toggle("Send Song Position 0 before Start", isOn: $m.sendSPP)
            Text("Start/Stop from any app: ⌃⌥Space · or use the menu bar icon.")
                .font(.caption).foregroundStyle(.secondary)
            Text("Offset > 0 sends later, < 0 earlier. Use it to line up devices with different latency.")
                .font(.caption).foregroundStyle(.secondary)
        }
    }

    private var audioSyncSection: some View {
        let known = m.audioSync.devices.contains { $0.uid == m.audioDeviceUID }
        return CollapsibleSection(
            title: "Audio sync · pulse out for non-MIDI gear", isOpen: $syncOpen,
            accessory: AnyView(Toggle("Audio sync", isOn: $m.audioEnabled).toggleStyle(.switch).labelsHidden())
        ) {
            Picker("Output device", selection: $m.audioDeviceUID) {
                Text("— choose a device —").tag("")
                if !known && !m.audioDeviceUID.isEmpty { Text("(not connected)").tag(m.audioDeviceUID) }
                ForEach(m.audioSync.devices) { Text("\($0.name) · \($0.channels) ch").tag($0.uid) }
            }
            if !m.audioDeviceUID.isEmpty && m.audioDeviceUID == m.audioSync.defaultUID {
                Text("This is the system default output: your DAW may play through it as well.")
                    .font(.caption).foregroundStyle(.orange)
            }
            Picker("Pulses per quarter", selection: $m.audioPPQ) {
                ForEach(AppModel.audioPPQChoices, id: \.self) { Text("\($0)").tag($0) }
            }
            HStack {
                Text("Pulse width")
                Slider(value: $m.audioWidthMs, in: 1...30, step: 0.5)
                Text(String(format: "%.1f ms", m.audioWidthMs))
                    .font(.system(.body, design: .monospaced)).frame(width: 70, alignment: .trailing)
            }
            HStack {
                Text("Level")
                Slider(value: $m.audioLevel, in: 0.05...1, step: 0.01)
                Text(String(format: "%.0f %%", m.audioLevel * 100))
                    .font(.system(.body, design: .monospaced)).frame(width: 70, alignment: .trailing)
            }
            HStack {
                Text("Latency offset")
                Slider(value: $m.audioOffsetMs, in: -50...200, step: 0.5)
                Text(String(format: "%+.1f ms", m.audioOffsetMs))
                    .font(.system(.body, design: .monospaced)).frame(width: 70, alignment: .trailing)
                    .onTapGesture(count: 2) { m.audioOffsetMs = 0 }
            }
            Toggle("Invert polarity", isOn: $m.audioInvert)
            Toggle("Pulses only while running", isOn: $m.audioOnlyWhilePlaying)
            HStack {
                Text("Status").foregroundStyle(.secondary)
                Text(m.audioSync.status)
                if m.audioEnabled && m.audioSync.isRunning {
                    Text("· late pulses: \(m.audioSync.latePulses)").foregroundStyle(m.audioSync.latePulses > 0 ? .orange : .secondary)
                }
            }
            .font(.system(.body, design: .monospaced))
            Text("Both channels carry the same pulse (first two outputs of the chosen device). The signal goes only to that device; "
                 + "the right pulse width, polarity and rate depend on your gear. Many audio outputs are AC-coupled and round off long pulses.")
                .font(.caption).foregroundStyle(.secondary)
        }
    }

    private var monitor: some View {
        let s = m.monitor.stats
        return CollapsibleSection(title: "Input monitor", isOpen: $inputOpen) {
            Picker("Source", selection: Binding(get: { m.monitor.selected }, set: { m.monitor.selected = $0 })) {
                Text("— none —").tag(Int32(0))
                ForEach(m.monitor.sources) { Text($0.name).tag($0.id) }
            }
            Grid(alignment: .leading, horizontalSpacing: 16, verticalSpacing: 4) {
                row("Status", s.receiving ? "receiving · \(s.transport)" : "no clock")
                row("Tempo", s.bpm.map { String(format: "%.3f BPM", $0) } ?? "—")
                row("Drift vs. ours", s.driftPPM.map { String(format: "%+.0f ppm", $0) } ?? "—")
                row("Jitter (σ / max)", s.jitterMs.map { String(format: "%.2f / %.2f ms", $0, s.maxDevMs ?? 0) } ?? "—")
                row("Phase vs. ours", s.phaseMs.map { String(format: "%+.2f ms", $0) } ?? "—")
            }
            .font(.system(.body, design: .monospaced))
            Text("Phase is only meaningful if the source echoes our clock back (loopback / MIDI thru).")
                .font(.caption).foregroundStyle(.secondary)
        }
    }

    private func row(_ k: String, _ v: String) -> some View {
        GridRow { Text(k).foregroundStyle(.secondary); Text(v) }
    }
}

struct OutputRow: View {
    @ObservedObject var route: OutputRoute

    var body: some View {
        HStack {
            Toggle(route.name, isOn: $route.enabled).lineLimit(1)
            Spacer()
            Slider(value: $route.offsetMs, in: -50...200, step: 0.5).frame(width: 140)
                .disabled(!route.enabled)
            Text(String(format: "%+.1f ms", route.offsetMs))
                .font(.system(.body, design: .monospaced))
                .frame(width: 80, alignment: .trailing)
                .onTapGesture(count: 2) { route.offsetMs = 0 }
        }
    }
}
