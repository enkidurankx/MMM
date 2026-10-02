import SwiftUI
import AppKit

/// Day / night. `auto` follows the macOS appearance (which itself can switch automatically).
enum AppearanceMode: String, CaseIterable, Identifiable {
    case auto, day, night
    var id: String { rawValue }
    var icon: String {
        switch self {
        case .auto: return "circle.lefthalf.filled"
        case .day: return "sun.max.fill"
        case .night: return "moon.fill"
        }
    }
    var label: String {
        switch self {
        case .auto: return "Auto (follow macOS)"
        case .day: return "Day"
        case .night: return "Night"
        }
    }
    var nsAppearance: NSAppearance? {
        switch self {
        case .auto: return nil
        case .day: return NSAppearance(named: .aqua)
        case .night: return NSAppearance(named: .darkAqua)
        }
    }
}

/// Colours chosen for contrast (WCAG ratios against the window background in brackets, day / night).
/// The system's own secondary colours are too faint at the window's 80 % scale, so text uses these.
enum Theme {
    private static func dynamic(day: NSColor, night: NSColor) -> Color {
        Color(nsColor: NSColor(name: nil) { a in
            a.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua ? night : day
        })
    }
    private static func rgb(_ r: Int, _ g: Int, _ b: Int) -> NSColor {
        NSColor(srgbRed: CGFloat(r) / 255, green: CGFloat(g) / 255, blue: CGFloat(b) / 255, alpha: 1)
    }

    /// secondary text, captions, labels  (about 8:1 day, 9:1 night)
    static let muted = dynamic(day: rgb(0x45, 0x48, 0x52), night: rgb(0xC4, 0xC7, 0xD0))
    /// "running" indicator  (about 5.5:1 day, 9:1 night)
    static let ok = dynamic(day: rgb(0x1B, 0x7A, 0x38), night: rgb(0x62, 0xE0, 0x8A))
    /// warnings, late pulses  (about 6:1 day, 9:1 night)
    static let warn = dynamic(day: rgb(0xA3, 0x45, 0x00), night: rgb(0xFF, 0xB2, 0x5E))

    /// filled buttons always carry white text: fills dark enough for 5:1 or better
    static let startFill = Color(red: 0x1B / 255, green: 0x7A / 255, blue: 0x38 / 255)   // white 5.9:1
    static let stopFill = Color(red: 0xB3 / 255, green: 0x26 / 255, blue: 0x1E / 255)    // white 6.5:1
    static let neutralFill = Color(red: 0x44 / 255, green: 0x47 / 255, blue: 0x4F / 255) // white 9:1
}

extension View {
    /// Small explanatory text: 12 pt (9.6 pt on screen at 80 %) in the high-contrast muted colour.
    func captionStyle() -> some View {
        font(.system(size: 12)).foregroundStyle(Theme.muted)
    }
}
