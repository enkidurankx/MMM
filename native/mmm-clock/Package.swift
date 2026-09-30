// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "MMMClock",
    platforms: [.macOS(.v13)],
    targets: [
        .executableTarget(name: "MMMClock", path: "Sources/MMMClock")
    ]
)
