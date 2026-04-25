import ESDaemonCore
import Dispatch
import Foundation

@main
struct ESDaemon {
    static func main() async {
        let config = DaemonConfig.fromEnvironment()
        let bridge = PolicyBridge(config: config)
        let handler = EventHandler(policyBridge: bridge)
        let client = ESClient(
            watchedPIDs: config.watchedPIDs,
            watchAll: config.watchAll,
            eventHandler: handler
        )
        let controlServer = DaemonControlServer(
            host: config.controlHost,
            port: config.controlPort,
            registry: client
        )

        print("404gent ES Daemon starting...")
        print("Mode: EndpointSecurity AUTH_OPEN + NOTIFY_EXEC")
        print("Policy bridge: \(config.policyEndpoint)")
        print("Daemon control: http://\(config.controlHost):\(config.controlPort)")
        if config.watchAll {
            print("Watching all PIDs")
        } else if config.watchedPIDs.isEmpty {
            print("Watching no PIDs; set FOURGENT_WATCH_PIDS or test with FOURGENT_WATCH_ALL=true")
        } else {
            print("Watching PIDs: \(config.watchedPIDs.sorted().map(String.init).joined(separator: ","))")
        }

        do {
            try client.start()
            try controlServer.start()
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
