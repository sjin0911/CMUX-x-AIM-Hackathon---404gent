import ESDaemonCore
import Foundation

@main
struct ESDaemon {
    static func main() {
        let config = DaemonConfig.fromEnvironment()
        let client = ESClient()
        let bridge = PolicyBridge(config: config)
        let handler = EventHandler(policyBridge: bridge)

        print("404gent ES Daemon starting...")
        print("Mode: skeleton (no real ES hooks)")
        print("Policy bridge: \(config.policyEndpoint)")

        client.start()
        handler.handle(.exec(pid: Int32(ProcessInfo.processInfo.processIdentifier), argv: ["es-daemon", "--skeleton"]))

        signal(SIGINT) { _ in
            print("\nShutting down...")
            exit(0)
        }

        print("Ready. Press Ctrl+C to stop.")
        RunLoop.main.run()
    }
}
