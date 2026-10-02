import SwiftUI

final class AppDelegate: NSObject, NSApplicationDelegate {
    // Keep running in the menu bar after the main window is closed.
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { false }
}

@main
struct MMMClockApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var delegate
    @StateObject private var model = AppModel()
    // Keeps macOS from throttling timers (App Nap) while the app is in the background.
    private let activity = ProcessInfo.processInfo.beginActivity(
        options: [.userInitiated, .latencyCritical], reason: "MIDI clock generation")

    var body: some Scene {
        Window("MMM Clock", id: "main") {
            ContentView().environmentObject(model)
        }
        // The window size is set by ContentView.resizeWindow (it follows the content).

        MenuBarExtra {
            MenuPanel().environmentObject(model)
        } label: {
            HStack(spacing: 4) {
                Image(systemName: model.playing ? "play.fill" : "metronome")
                Text(String(format: "%.1f", model.bpm))
            }
        }
        .menuBarExtraStyle(.window)
    }
}
