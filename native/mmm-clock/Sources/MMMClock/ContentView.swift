import SwiftUI

/// Scales its content (layout, text, controls, all together) and reports the scaled size to the window,
/// so the proportions stay exactly as designed.

struct ScaledContent<Content: View>: View {
    let scale: CGFloat
    var onSizeChange: ((CGSize) -> Void)? = nil     // the scaled size, so the window can follow
    @ViewBuilder var content: () -> Content
    @State private var size = CGSize(width: 500, height: 640)

    private func report(_ new: CGSize) {
        guard new.width > 0, new.height > 0 else { return }
        DispatchQueue.main.async {
            size = new
            onSizeChange?(CGSize(width: new.width * scale, height: new.height * scale))
        }
    }

    var body: some View {
        content()
            .fixedSize()
            .background(GeometryReader { g in
                Color.clear
                    .onAppear { report(g.size) }
                    .onChange(of: g.size) { report($0) }
            })
            .scaleEffect(scale, anchor: .topLeading)
            .frame(width: size.width * scale, height: size.height * scale, alignment: .topLeading)
    }
}

/// A heading with a chevron that folds its content away; the open/closed state is remembered.
struct CollapsibleSection<Content: View>: View {
    let title: String
    let icon: String
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
                        Image(systemName: icon).frame(width: 18)
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

/// START / CONT / STOP with icons and tooltips; shared by the window and the menu-bar panel.
struct TransportButtons: View {
    @EnvironmentObject var m: AppModel
    var spacing: CGFloat = 10

    var body: some View {
        HStack(spacing: spacing) {
            Button { m.start() } label: { Label("START", systemImage: "play.fill").frame(maxWidth: .infinity) }
                .tint(Theme.startFill)
                .help("Start from the beginning (sends Song Position 0 first if that option is on)")
            Button { m.cont() } label: { Label("CONT", systemImage: "forward.end.fill").frame(maxWidth: .infinity) }
                .tint(Theme.neutralFill)
                .help("Continue from where it stopped")
            Button { m.stop() } label: { Label("STOP", systemImage: "stop.fill").frame(maxWidth: .infinity) }
                .tint(Theme.stopFill)
                .help("Stop (Space toggles start/stop)")
        }
        .labelStyle(.titleAndIcon)
        .buttonStyle(.borderedProminent)
        .controlSize(.large)
    }
}

struct ContentView: View {
    @EnvironmentObject var m: AppModel
    @AppStorage("section.outputs") private var outputsOpen = true
    @AppStorage("section.sync") private var syncOpen = true
    @AppStorage("section.input") private var inputOpen = true
    private let ticker = Timer.publish(every: 0.1, on: .main, in: .common).autoconnect()
    static let uiScale: CGFloat = 0.8                         // whole window at 80 %, proportions unchanged

    var body: some View {
        ScaledContent(scale: ContentView.uiScale, onSizeChange: { resizeWindow($0) }) { mainContent }
            .toolbar {
                // Top bar: day/night is one small button (the icon shows the current mode), the pin sits alone at the far right.
                ToolbarItem(placement: .navigation) {
                    Menu {
                        Picker("Appearance", selection: $m.appearance) {
                            ForEach(AppearanceMode.allCases) { Label($0.label, systemImage: $0.icon).tag($0) }
                        }
                        .pickerStyle(.inline)
                    } label: {
                        Image(systemName: m.appearance.icon)
                    }
                    .menuIndicator(.hidden)
                    .help("Day / night: \(m.appearance.label)")
                }
                ToolbarItem(placement: .primaryAction) {
                    Toggle(isOn: $m.keepOnTop) { Image(systemName: m.keepOnTop ? "pin.fill" : "pin") }
                        .toggleStyle(.button)
                        .help("Keep this window above all others, also over full-screen apps")
                }
            }
    }

    /// The window always follows the content: fold all three sections and it shrinks to transport + tempo.
    /// (Set explicitly, because SwiftUI alone does not reliably shrink an existing window; the top edge stays put.)
    private func resizeWindow(_ size: CGSize, retry: Bool = true) {
        DispatchQueue.main.async {
            guard let w = NSApp.windows.first(where: { $0.title == "MMM Clock" }) else {
                if retry { DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { resizeWindow(size, retry: false) } }
                return
            }
            w.styleMask.remove(.resizable)                       // the content decides the size
            w.contentMinSize = NSSize(width: 100, height: 40)    // release any old limits before resizing
            w.contentMaxSize = NSSize(width: 4000, height: 4000)
            let old = w.frame
            w.setContentSize(size)
            var f = w.frame
            f.origin.y = old.maxY - f.height
            w.setFrame(f, display: true, animate: false)
        }
    }

    private var mainContent: some View {
        VStack(alignment: .leading, spacing: 18) {
            transport
            tempo
            Divider()
            if allFolded {
                foldedBar
            } else {
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

    /// "Compact" is no feature of its own: all three sections folded = small window.
    private var allFolded: Bool { !outputsOpen && !syncOpen && !inputOpen }

    /// Shown when everything is folded: the three headings sit in one row, so nothing is lost and
    /// one click opens a section again.
    private var foldedBar: some View {
        HStack(spacing: 16) {
            foldedChip("Outputs", "cable.connector", $outputsOpen)
            foldedChip("Audio sync", "waveform", $syncOpen)
            Toggle("Audio sync", isOn: $m.audioEnabled).toggleStyle(.switch).labelsHidden()
            foldedChip("Input", "speedometer", $inputOpen)
            Spacer(minLength: 0)
        }
    }

    private func foldedChip(_ title: String, _ icon: String, _ isOpen: Binding<Bool>) -> some View {
        Button { isOpen.wrappedValue = true } label: {
            HStack(spacing: 4) {
                Image(systemName: "chevron.right").frame(width: 10)
                Image(systemName: icon)
                Text(title).font(.subheadline.weight(.semibold))
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private var transport: some View { TransportButtons() }

    private var tempo: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 12) {
                LCDDisplay(value: $m.bpm, playing: m.playing)
                Button { m.tap() } label: {
                    VStack(spacing: 4) {
                        Image(systemName: "hand.tap").font(.system(size: 26))
                        Text("TAP").font(.headline)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
                .buttonStyle(.bordered)
                .keyboardShortcut("t", modifiers: [])
                .help("Tap the tempo (key: T)")
                .frame(width: 110, height: 72)
            }
            HStack(spacing: 10) {
                ForEach([-1.0, -0.1, 0.1, 1.0], id: \.self) { step in
                    Button { m.bpm = ((m.bpm + step) * 100).rounded() / 100 } label: {
                        Text(step > 0 ? "+\(fmt(step))" : fmt(step)).frame(maxWidth: .infinity)
                    }
                    .controlSize(.large)
                }
            }
        }
    }

    private func fmt(_ v: Double) -> String { String(format: "%g", v) }

    private var outputs: some View {
        CollapsibleSection(title: "Outputs · latency offset", icon: "cable.connector", isOpen: $outputsOpen) {
            ForEach(m.routes) { r in OutputRow(route: r) }
            Toggle("Send clock while stopped (devices can lock tempo)", isOn: $m.clockWhileStopped)
            Toggle("Send Song Position 0 before Start", isOn: $m.sendSPP)
            Text("Start/Stop from any app: ⌃⌥Space · or use the menu bar icon.")
                .captionStyle()
            Text("Offset > 0 sends later, < 0 earlier. Use it to line up devices with different latency.")
                .captionStyle()
        }
    }

    private var audioSyncSection: some View {
        let known = m.audioSync.devices.contains { $0.uid == m.audioDeviceUID }
        return CollapsibleSection(
            title: "Audio sync · pulse out for non-MIDI gear", icon: "waveform", isOpen: $syncOpen,
            accessory: AnyView(Toggle("Audio sync", isOn: $m.audioEnabled).toggleStyle(.switch).labelsHidden())
        ) {
            Picker("Output device", selection: $m.audioDeviceUID) {
                Text("— choose a device —").tag("")
                if !known && !m.audioDeviceUID.isEmpty { Text("(not connected)").tag(m.audioDeviceUID) }
                ForEach(m.audioSync.devices) { Text("\($0.name) · \($0.channels) ch").tag($0.uid) }
            }
            if !m.audioDeviceUID.isEmpty && m.audioDeviceUID == m.audioSync.defaultUID {
                Text("This is the system default output: your DAW may play through it as well.")
                    .font(.system(size: 12)).foregroundStyle(Theme.warn)
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
                Text("Status").foregroundStyle(Theme.muted)
                Text(m.audioSync.status)
                if m.audioEnabled && m.audioSync.isRunning {
                    Text("· late pulses: \(m.audioSync.latePulses)").foregroundStyle(m.audioSync.latePulses > 0 ? Theme.warn : Theme.muted)
                }
            }
            .font(.system(.body, design: .monospaced))
            Text("Both channels carry the same pulse (first two outputs of the chosen device). The signal goes only to that device; "
                 + "the right pulse width, polarity and rate depend on your gear. Many audio outputs are AC-coupled and round off long pulses.")
                .captionStyle()
        }
    }

    private var monitor: some View {
        let s = m.monitor.stats
        return CollapsibleSection(title: "Input monitor", icon: "speedometer", isOpen: $inputOpen) {
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
                .captionStyle()
        }
    }

    private func row(_ k: String, _ v: String) -> some View {
        GridRow { Text(k).foregroundStyle(Theme.muted); Text(v) }
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
