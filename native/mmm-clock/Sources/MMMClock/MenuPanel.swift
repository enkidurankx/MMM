import SwiftUI

/// Compact transport that lives in the menu bar.
struct MenuPanel: View {
    @EnvironmentObject var m: AppModel
    @Environment(\.openWindow) private var openWindow

    var body: some View {
        VStack(spacing: 12) {
            TransportButtons(spacing: 8)

            HStack(alignment: .firstTextBaseline) {
                Text(String(format: "%.2f", m.bpm))
                    .font(.system(size: 36, weight: .semibold, design: .monospaced))
                Text("BPM").foregroundStyle(.secondary)
                Spacer()
                Image(systemName: m.playing ? "play.circle.fill" : "stop.circle")
                    .foregroundStyle(m.playing ? Color.green : Color.gray)
            }

            HStack {
                ForEach([-1.0, -0.1, 0.1, 1.0], id: \.self) { step in
                    Button(step > 0 ? "+\(String(format: "%g", step))" : String(format: "%g", step)) {
                        m.bpm = ((m.bpm + step) * 100).rounded() / 100
                    }
                }
                Spacer()
                Button { m.tap() } label: { Label("TAP", systemImage: "hand.tap") }
            }

            Divider()
            Toggle(isOn: $m.keepOnTop) { Label("Window always on top", systemImage: "pin") }
            Toggle(isOn: $m.audioEnabled) { Label("Audio sync (pulse out)", systemImage: "waveform") }
            HStack {
                Button {
                    openWindow(id: "main")
                    NSApp.activate(ignoringOtherApps: true)
                } label: { Label("Open window", systemImage: "macwindow") }
                Spacer()
                Button { NSApp.terminate(nil) } label: { Label("Quit", systemImage: "power") }
            }
            Text("Start/Stop from anywhere: ⌃⌥Space")
                .font(.caption).foregroundStyle(.secondary)
        }
        .padding(14)
        .frame(width: 300)
    }
}
