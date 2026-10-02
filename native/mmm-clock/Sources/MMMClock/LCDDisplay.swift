import SwiftUI

/// One seven-segment digit, drawn as vector polygons (slightly slanted like an old LCD).
/// Unlit segments stay faintly visible, as on the real thing.
struct SevenSegDigit: View {
    let char: Character?          // "0"-"9", "-" or nil for a blank
    let dot: Bool
    let ink: Color
    var shadowAlpha: Double = 0.18
    let width: CGFloat
    let height: CGFloat
    private let dotSpace: CGFloat = 7
    private let slant: CGFloat = 0.12

    private static let table: [Character: String] = [
        "0": "abcdef", "1": "bc", "2": "abdeg", "3": "abcdg", "4": "bcfg",
        "5": "acdfg", "6": "acdefg", "7": "abc", "8": "abcdefg", "9": "abcdfg", "-": "g",
    ]

    var body: some View {
        Canvas { ctx, size in
            let w = width, h = height
            let t = w * 0.19, g = t * 0.10
            let lit = char.flatMap { SevenSegDigit.table[$0] } ?? ""
            var c = ctx
            c.transform = CGAffineTransform(a: 1, b: 0, c: -slant, d: 1, tx: slant * h, ty: 0)

            func hseg(_ y: CGFloat) -> Path {
                let x0 = g, x1 = w - g
                var p = Path()
                p.move(to: CGPoint(x: x0, y: y))
                p.addLine(to: CGPoint(x: x0 + t / 2, y: y - t / 2))
                p.addLine(to: CGPoint(x: x1 - t / 2, y: y - t / 2))
                p.addLine(to: CGPoint(x: x1, y: y))
                p.addLine(to: CGPoint(x: x1 - t / 2, y: y + t / 2))
                p.addLine(to: CGPoint(x: x0 + t / 2, y: y + t / 2))
                p.closeSubpath()
                return p
            }
            func vseg(_ x: CGFloat, _ y0: CGFloat, _ y1: CGFloat) -> Path {
                var p = Path()
                p.move(to: CGPoint(x: x, y: y0))
                p.addLine(to: CGPoint(x: x + t / 2, y: y0 + t / 2))
                p.addLine(to: CGPoint(x: x + t / 2, y: y1 - t / 2))
                p.addLine(to: CGPoint(x: x, y: y1))
                p.addLine(to: CGPoint(x: x - t / 2, y: y1 - t / 2))
                p.addLine(to: CGPoint(x: x - t / 2, y: y0 + t / 2))
                p.closeSubpath()
                return p
            }
            let top0 = t / 2 + g, mid = h / 2
            let segs: [(Character, Path)] = [
                ("a", hseg(t / 2)),
                ("b", vseg(w - t / 2, top0, mid - g)),
                ("c", vseg(w - t / 2, mid + g, h - t / 2 - g)),
                ("d", hseg(h - t / 2)),
                ("e", vseg(t / 2, mid + g, h - t / 2 - g)),
                ("f", vseg(t / 2, top0, mid - g)),
                ("g", hseg(mid)),
            ]
            for (name, path) in segs {
                if lit.contains(name) {
                    c.fill(path.offsetBy(dx: 1.4, dy: 1.4), with: .color(ink.opacity(shadowAlpha)))   // LCD shadow
                    c.fill(path, with: .color(ink))
                } else {
                    c.fill(path, with: .color(ink.opacity(0.07)))
                }
            }
            let dotRect = CGRect(x: w + dotSpace * 0.25, y: h - t * 1.05, width: t * 0.95, height: t * 0.95)
            c.fill(Path(ellipseIn: dotRect.offsetBy(dx: 1.2, dy: 1.2)), with: .color(dot ? ink.opacity(shadowAlpha) : .clear))
            c.fill(Path(ellipseIn: dotRect), with: .color(dot ? ink : ink.opacity(0.07)))
        }
        .frame(width: width + dotSpace + slant * height, height: height)
    }
}

/// The tempo as an old LCD readout. Click it to type a value; Return (or clicking elsewhere) accepts.
struct LCDDisplay: View {
    @Binding var value: Double
    @State private var editing = false
    @FocusState private var focused: Bool

    @Environment(\.colorScheme) private var scheme

    // Day: reflective green-grey glass with dark ink (6.2 to 8.4:1 across the gradient). Night: backlit dark glass with bright lime digits (14.5:1).
    private var night: Bool { scheme == .dark }
    private var ink: Color { night ? Color(red: 0.62, green: 1.0, blue: 0.42) : Color(red: 0.10, green: 0.15, blue: 0.06) }
    private var glassTop: Color { night ? Color(red: 0.05, green: 0.10, blue: 0.05) : Color(red: 0.69, green: 0.77, blue: 0.57) }
    private var glassBottom: Color { night ? Color(red: 0.03, green: 0.07, blue: 0.04) : Color(red: 0.58, green: 0.67, blue: 0.47) }

    /// "120.00", " 92.50": three integer digits, point, two decimals; each digit paired with "a dot follows".
    private var cells: [(Character?, Bool)] {
        var out: [(Character?, Bool)] = []
        for ch in String(format: "%6.2f", min(999.99, max(0, value))) {
            if ch == "." { if !out.isEmpty { out[out.count - 1].1 = true } }
            else { out.append((ch == " " ? nil : ch, false)) }
        }
        return out
    }

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 9)
                .fill(LinearGradient(colors: [glassTop, glassBottom], startPoint: .top, endPoint: .bottom))
            RoundedRectangle(cornerRadius: 9)
                .strokeBorder(Color.black.opacity(0.55), lineWidth: 2.5)
            RoundedRectangle(cornerRadius: 7)
                .strokeBorder(Color.white.opacity(0.18), lineWidth: 1)
                .padding(3)
            HStack(alignment: .bottom, spacing: 8) {
                if editing {
                    TextField("BPM", value: $value, format: .number.precision(.fractionLength(0...2)))
                        .textFieldStyle(.plain)
                        .font(.system(size: 40, weight: .bold, design: .monospaced))
                        .foregroundStyle(ink)
                        .focused($focused)
                        .frame(width: 190)
                        .onSubmit { editing = false; NSApp.keyWindow?.makeFirstResponder(nil) }
                } else {
                    HStack(spacing: 1) {
                        ForEach(Array(cells.enumerated()), id: \.offset) { _, cell in
                            SevenSegDigit(char: cell.0, dot: cell.1, ink: ink, shadowAlpha: night ? 0 : 0.18, width: 25, height: 46)
                        }
                    }
                }
                Text("BPM")
                    .font(.system(size: 11, weight: .heavy, design: .monospaced))
                    .foregroundStyle(ink)
                    .padding(.bottom, 4)
            }
        }
        .frame(width: 272, height: 72)
        .contentShape(Rectangle())
        .onTapGesture {
            guard !editing else { return }
            editing = true
            DispatchQueue.main.async { focused = true }
        }
        .onChange(of: focused) { if !$0 { editing = false } }
        .help("Tempo. Click to type a value, or use the − / + buttons and TAP below.")
    }
}
