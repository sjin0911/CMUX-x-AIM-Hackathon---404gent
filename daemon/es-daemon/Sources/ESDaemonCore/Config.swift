import Foundation

public struct DaemonConfig: Equatable {
    public let policyEndpoint: URL
    public let watchedPIDs: Set<pid_t>
    public let sensitivePaths: [String]

    public init(
        policyEndpoint: URL = URL(string: "http://127.0.0.1:7404")!,
        watchedPIDs: Set<pid_t> = [],
        sensitivePaths: [String] = [".env", ".npmrc", ".pypirc", ".netrc", ".kube/config"]
    ) {
        self.policyEndpoint = policyEndpoint
        self.watchedPIDs = watchedPIDs
        self.sensitivePaths = sensitivePaths
    }

    public static func fromEnvironment(_ environment: [String: String] = ProcessInfo.processInfo.environment) -> DaemonConfig {
        let endpoint = environment["FOURGENT_POLICY_ENDPOINT"]
            .flatMap(URL.init(string:))
            ?? URL(string: "http://127.0.0.1:7404")!

        let pids = Set((environment["FOURGENT_WATCH_PIDS"] ?? "")
            .split(separator: ",")
            .compactMap { pid_t($0.trimmingCharacters(in: .whitespacesAndNewlines)) })

        return DaemonConfig(policyEndpoint: endpoint, watchedPIDs: pids)
    }
}
