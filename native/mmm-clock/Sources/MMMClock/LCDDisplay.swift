import SwiftUI

/// One seven-segment digit, drawn as vector polygons. Upright, in the text colour; unlit segments are not drawn.
struct SevenSegDigit: View {
    let char: Character?          // "0"-"9", "-" or nil for a blank
    let dot: Bool
    let ink: Color
    let width: CGFloat
    let height: CGFloat
    private let dotSpace: CGFloat = 7

    private static let table: [Character: String] = [
        "0": "abcdef", "1": "bc", "2": "abdeg", "3": "abcdg", "4": "bcfg",
        "5": "acdfg", "6": "acdefg", "7": "abc", "8": "abcdefg", "9": "abcdfg", "-": "g",
    ]

    var body: some View {
        Canvas { ctx, _ in
            let w = width, h = height
            let t = w * 0.19, g = t * 0.10
            let lit = char.flatMap { SevenSegDigit.table[$0] } ?? ""

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
            for (name, path) in segs where lit.contains(name) { ctx.fill(path, with: .color(ink)) }
            if dot {
                ctx.fill(Path(ellipseIn: CGRect(x: w + dotSpace * 0.25, y: h - t * 1.05, width: t * 0.95, height: t * 0.95)),
                         with: .color(ink))
            }
        }
        .frame(width: width + dotSpace, height: height)
    }
}

/// The tempo as a seven-segment readout in a plain frame, with the run/stop symbol inside the frame.
/// Click it to type a value; Return (or clicking elsewhere) accepts.
struct LCDDisplay: View {
    @Binding var value: Double
    let playing: Bool
    @State private var editing = false
    @FocusState private var focused: Bool

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
        HStack(spacing: 10) {
            Group {
                if editing {
                    TextField("BPM", value: $value, format: .number.precision(.fractionLength(0...2)))
                        .textFieldStyle(.plain)
                        .font(.system(size: 36, weight: .semibold, design: .monospaced))
                        .focused($focused)
                        .onSubmit { editing = false; NSApp.keyWindow?.makeFirstResponder(nil) }
                } else {
                    HStack(spacing: 2) {
                        ForEach(Array(cells.enumerated()), id: \.offset) { _, cell in
                            SevenSegDigit(char: cell.0, dot: cell.1, ink: .primary, width: 24, height: 44)
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            VStack(alignment: .trailing, spacing: 0) {
                Image(systemName: playing ? "play.fill" : "stop.fill")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(playing ? Theme.ok : Theme.muted)
                Spacer(minLength: 0)
                Text("BPM").font(.system(size: 12, weight: .bold, design: .monospaced)).foregroundStyle(Theme.muted)
            }
            .padding(.vertical, 8)
        }
        .padding(.horizontal, 12)
        .frame(maxWidth: .infinity)
        .frame(height: 72)
        .background(RoundedRectangle(cornerRadius: 10).fill(Color.primary.opacity(0.05)))
        .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(Theme.muted, lineWidth: 2))
        .contentShape(Rectangle())
        .onTapGesture {
            guard !editing else { return }
            editing = true
            DispatchQueue.main.async { focused = true }
        }
        .onChange(of: focused) { if !$0 { editing = false } }
        .help("Tempo. Click to type a value, or use the − / + buttons and TAP.")
    }
}
