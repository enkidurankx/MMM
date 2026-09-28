import SwiftUI

final class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
}

@main
struct MMMClockApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var delegate
    @StateObject private var model = AppModel()
    // Keeps macOS from throttling timers (App Nap) while the app is in the background.
    private let activity = ProcessInfo.processInfo.beginActivity(
        options: [.userInitiated, .latencyCritical], reason: "MIDI clock generation")

    var body: some Scene {
        WindowGroup("MMM Clock") {
            ContentView().environmentObject(model)
        }
        .windowResizability(.contentSize)
    }
}
