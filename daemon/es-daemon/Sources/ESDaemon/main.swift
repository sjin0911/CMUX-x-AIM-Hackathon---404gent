import ESDaemonCore
import Dispatch
import Foundation

@main
struct ESDaemon {
    static func main() async {
        let config = DaemonConfig.fromEnvironment()
        let bridge = PolicyBridge(config: config)
        let handler = EventHandler(policyBridge: bridge)
        let client = ESClient(watchedPIDs: config.watchedPIDs, eventHandler: handler)

        print("404gent ES Daemon starting...")
        print("Mode: EndpointSecurity NOTIFY")
        print("Policy bridge: \(config.policyEndpoint)")
        if config.watchedPIDs.isEmpty {
            print("Watching all PIDs")
        } else {
            print("Watching PIDs: \(config.watchedPIDs.sorted().map(String.init).joined(separator: ","))")
        }

        do {
            try client.start()
        } catch {
            print("Failed to start ES client: \(error.localizedDescription)")
            exit(1)
        }

        signal(SIGINT) { _ in
            print("\nShutting down...")
            exit(0)
        }

        print("Ready. Press Ctrl+C to stop.")
        dispatchMain()
    }
}
