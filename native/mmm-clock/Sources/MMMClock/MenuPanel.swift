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
                Text("BPM").foregroundStyle(Theme.muted)
                Spacer()
                Image(systemName: m.playing ? "play.circle.fill" : "stop.circle")
                    .foregroundStyle(m.playing ? Theme.ok : Theme.muted)
            }

            HStack {
                ForEach([-1.0, -0.1, 0.1, 1.0], id: \.self) { step in
                    Button { m.bpm = ((m.bpm + step) * 100).rounded() / 100 } label: {
                        Text(step > 0 ? "+\(String(format: "%g", step))" : String(format: "%g", step)).frame(maxWidth: .infinity)
                    }
                    .buttonStyle(FlatButtonStyle(minHeight: 30))
                }
                Spacer()
                Button { m.tap() } label: { Label("TAP", systemImage: "hand.tap") }
                    .buttonStyle(FlatButtonStyle(minHeight: 30))
            }

            Divider()
            Picker("Appearance", selection: $m.appearance) {
                ForEach(AppearanceMode.allCases) { Label($0.label, systemImage: $0.icon).tag($0) }
            }
            .pickerStyle(.segmented)
            Toggle(isOn: $m.keepOnTop) { Label("Window always on top", systemImage: "pin") }
            Toggle(isOn: $m.linkEnabled) { Label("Ableton Link", systemImage: "link") }
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
                .captionStyle()
        }
        .padding(14)
        .frame(width: 300)
    }
}
