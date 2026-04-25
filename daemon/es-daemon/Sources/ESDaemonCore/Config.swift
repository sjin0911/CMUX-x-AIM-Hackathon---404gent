import Foundation

public struct DaemonConfig: Equatable {
    public let policyEndpoint: URL
    public let controlHost: String
    public let controlPort: UInt16
    public let watchedPIDs: Set<pid_t>
    public let watchAll: Bool
    public let sensitivePaths: [String]

    public init(
        policyEndpoint: URL = URL(string: "http://127.0.0.1:7404")!,
        controlHost: String = "127.0.0.1",
        controlPort: UInt16 = 7405,
        watchedPIDs: Set<pid_t> = [],
        watchAll: Bool = false,
        sensitivePaths: [String] = [".env", ".npmrc", ".pypirc", ".netrc", ".kube/config"]
    ) {
        self.policyEndpoint = policyEndpoint
        self.controlHost = controlHost
        self.controlPort = controlPort
        self.watchedPIDs = watchedPIDs
        self.watchAll = watchAll
        self.sensitivePaths = sensitivePaths
    }

    public static func fromEnvironment(_ environment: [String: String] = ProcessInfo.processInfo.environment) -> DaemonConfig {
        let endpoint = environment["FOURGENT_POLICY_ENDPOINT"]
            .flatMap(URL.init(string:))
            ?? URL(string: "http://127.0.0.1:7404")!

        let pids = Set((environment["FOURGENT_WATCH_PIDS"] ?? "")
            .split(separator: ",")
            .compactMap { pid_t($0.trimmingCharacters(in: .whitespacesAndNewlines)) })

        let watchAll = ["1", "true", "yes"].contains(
            (environment["FOURGENT_WATCH_ALL"] ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        )

        let controlHost = environment["FOURGENT_CONTROL_HOST"] ?? "127.0.0.1"
        let controlPort = environment["FOURGENT_CONTROL_PORT"]
            .flatMap(UInt16.init)
            ?? 7405

        return DaemonConfig(
            policyEndpoint: endpoint,
            controlHost: controlHost,
            controlPort: controlPort,
            watchedPIDs: pids,
            watchAll: watchAll
        )
    }
}
