// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "es-daemon",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .executable(name: "es-daemon", targets: ["ESDaemon"])
    ],
    targets: [
        .executableTarget(
            name: "ESDaemon",
            dependencies: ["ESDaemonCore"],
            path: "Sources/ESDaemon"
        ),
        .target(
            name: "ESDaemonCore",
            dependencies: [],
            path: "Sources/ESDaemonCore"
        ),
        .testTarget(
            name: "ESDaemonCoreTests",
            dependencies: ["ESDaemonCore"],
            path: "Tests/ESDaemonCoreTests"
        )
    ]
)
