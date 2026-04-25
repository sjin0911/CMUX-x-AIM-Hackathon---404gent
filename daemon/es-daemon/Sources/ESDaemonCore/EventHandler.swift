import Foundation

public enum OSEvent: Equatable {
    case open(pid: pid_t, path: String)
    case exec(pid: pid_t, argv: [String])
}

public final class EventHandler {
    private let policyBridge: PolicyBridge

    public init(policyBridge: PolicyBridge) {
        self.policyBridge = policyBridge
    }

    @discardableResult
    public func handle(_ event: OSEvent) -> PolicyDecision {
        let decision = policyBridge.evaluate(event)
        print("[EventHandler] \(event.summary) -> \(decision.decision)")
        return decision
    }
}

public extension OSEvent {
    var summary: String {
        switch self {
        case let .open(pid, path):
            return "open pid=\(pid) path=\(path)"
        case let .exec(pid, argv):
            return "exec pid=\(pid) argv=\(argv.joined(separator: " "))"
        }
    }
}
