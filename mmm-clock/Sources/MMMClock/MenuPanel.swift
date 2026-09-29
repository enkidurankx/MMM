import SwiftUI

/// Compact transport that lives in the menu bar.
struct MenuPanel: View {
    @EnvironmentObject var m: AppModel
    @Environment(\.openWindow) private var openWindow

    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 8) {
                Button { m.start() } label: { Text("START").frame(maxWidth: .infinity) }.tint(.green)
                Button { m.cont() } label: { Text("CONT").frame(maxWidth: .infinity) }
                Button { m.stop() } label: { Text("STOP").frame(maxWidth: .infinity) }.tint(.red)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)

            HStack(alignment: .firstTextBaseline) {
                Text(String(format: "%.2f", m.bpm))
                    .font(.system(size: 36, weight: .semibold, design: .monospaced))
                Text("BPM").foregroundStyle(.secondary)
                Spacer()
                Circle().fill(m.playing ? Color.green : Color.gray.opacity(0.4)).frame(width: 10, height: 10)
            }

            HStack {
                ForEach([-1.0, -0.1, 0.1, 1.0], id: \.self) { step in
                    Button(step > 0 ? "+\(String(format: "%g", step))" : String(format: "%g", step)) {
                        m.bpm = ((m.bpm + step) * 100).rounded() / 100
                    }
                }
                Spacer()
                Button("TAP") { m.tap() }
            }

            Divider()
            HStack {
                Button("Open window") {
                    openWindow(id: "main")
                    NSApp.activate(ignoringOtherApps: true)
                }
                Spacer()
                Button("Quit") { NSApp.terminate(nil) }
            }
            Text("Start/Stop from anywhere: ⌃⌥Space")
                .font(.caption).foregroundStyle(.secondary)
        }
        .padding(14)
        .frame(width: 300)
    }
}
