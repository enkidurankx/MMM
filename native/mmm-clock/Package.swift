// swift-tools-version:5.9
import PackageDescription

// Ableton Link is fetched by fetch-link.sh into Vendor/link (not stored in the repo).
let link = "../../Vendor/link"

let package = Package(
    name: "MMMClock",
    platforms: [.macOS(.v13)],
    targets: [
        .target(
            name: "CLink",
            path: "Sources/CLink",
            cxxSettings: [
                .headerSearchPath("\(link)/include"),
                .headerSearchPath("\(link)/modules/asio-standalone/asio/include"),
                .define("LINK_PLATFORM_MACOSX", to: "1"),
                .define("LINK_PLATFORM_UNIX", to: "1"),
                .define("ASIO_NO_TYPEID", to: "1"),
                .define("ASIO_STANDALONE", to: "1"),
                .define("ASIO_VERSION_NAMESPACE", to: "link_asio_1_38_2"),
            ]
        ),
        .executableTarget(name: "MMMClock", dependencies: ["CLink"], path: "Sources/MMMClock"),
    ],
    cxxLanguageStandard: .cxx17
)
