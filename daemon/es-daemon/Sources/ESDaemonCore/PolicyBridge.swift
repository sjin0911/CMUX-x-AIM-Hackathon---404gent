import Foundation

public struct PolicyDecision: Equatable {
    public let decision: String
    public let reason: String

    public init(decision: String, reason: String) {
        self.decision = decision
        self.reason = reason
    }
}

public final class PolicyBridge {
    private let config: DaemonConfig

    public init(config: DaemonConfig) {
        self.config = config
    }

    public func evaluate(_ event: OSEvent) -> PolicyDecision {
        // Skeleton mode keeps the package buildable without a running Node policy server.
        switch event {
        case let .open(_, path):
            if config.sensitivePaths.contains(where: { path.contains($0) }) {
                return PolicyDecision(decision: "would-block", reason: "sensitive path")
            }
        case let .exec(_, argv):
            if argv.contains(where: { ["curl", "wget", "nc", "ncat"].contains($0) }) {
                return PolicyDecision(decision: "would-warn", reason: "network executable")
            }
        }

        return PolicyDecision(decision: "allow", reason: "skeleton mode")
    }
}
