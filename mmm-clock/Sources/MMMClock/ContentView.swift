import SwiftUI

struct ContentView: View {
    @EnvironmentObject var m: AppModel
    private let ticker = Timer.publish(every: 0.1, on: .main, in: .common).autoconnect()

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            transport
            tempo
            Divider()
            outputs
            Divider()
            monitor
        }
        .padding(20)
        .frame(width: 500)
        .contentShape(Rectangle())
        .onTapGesture { NSApp.keyWindow?.makeFirstResponder(nil) }   // click elsewhere leaves the BPM field
        .onAppear { DispatchQueue.main.async { NSApp.keyWindow?.makeFirstResponder(nil) } }
        .onReceive(ticker) { _ in m.monitor.refresh(ourBPM: m.bpm) }
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
        VStack(alignment: .leading, spacing: 8) {
            Text("Outputs · latency offset").font(.headline)
            ForEach(m.routes) { r in OutputRow(route: r) }
            Toggle("Send clock while stopped (devices can lock tempo)", isOn: $m.clockWhileStopped)
            Toggle("Send Song Position 0 before Start", isOn: $m.sendSPP)
            Text("Offset > 0 sends later, < 0 earlier. Use it to line up devices with different latency.")
                .font(.caption).foregroundStyle(.secondary)
        }
    }

    private var monitor: some View {
        let s = m.monitor.stats
        return VStack(alignment: .leading, spacing: 8) {
            Text("Input monitor").font(.headline)
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
