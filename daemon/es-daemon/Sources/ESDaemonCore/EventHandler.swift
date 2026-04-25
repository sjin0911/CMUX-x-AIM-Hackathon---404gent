import Foundation

public enum OSEvent: Equatable, Codable, Sendable {
    case open(pid: pid_t, path: String, auth: AuthEventMetadata? = nil)
    case exec(pid: pid_t, argv: [String])

    private enum CodingKeys: String, CodingKey {
        case type
        case path
        case pid
        case argv
        case authDecision
        case reason
        case cache
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)
        let pid = try container.decode(pid_t.self, forKey: .pid)

        switch type {
        case "open":
            self = .open(
                pid: pid,
                path: try container.decode(String.self, forKey: .path),
                auth: AuthEventMetadata(
                    decision: try container.decodeIfPresent(String.self, forKey: .authDecision),
                    reason: try container.decodeIfPresent(String.self, forKey: .reason),
                    cache: try container.decodeIfPresent(Bool.self, forKey: .cache)
                )
            )
        case "exec":
            self = .exec(
                pid: pid,
                argv: try container.decode([String].self, forKey: .argv)
            )
        default:
            throw DecodingError.dataCorruptedError(
                forKey: .type,
                in: container,
                debugDescription: "Unsupported OS event type: \(type)"
            )
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)

        switch self {
        case let .open(pid, path, auth):
            try container.encode("open", forKey: .type)
            try container.encode(path, forKey: .path)
            try container.encode(pid, forKey: .pid)
            try container.encodeIfPresent(auth?.decision, forKey: .authDecision)
            try container.encodeIfPresent(auth?.reason, forKey: .reason)
            try container.encodeIfPresent(auth?.cache, forKey: .cache)
        case let .exec(pid, argv):
            try container.encode("exec", forKey: .type)
            try container.encode(argv, forKey: .argv)
            try container.encode(pid, forKey: .pid)
        }
    }
}

public struct AuthEventMetadata: Equatable, Sendable {
    public let decision: String?
    public let reason: String?
    public let cache: Bool?

    public init(decision: String?, reason: String?, cache: Bool?) {
        self.decision = decision
        self.reason = reason
        self.cache = cache
    }
}

public final class EventHandler: @unchecked Sendable {
    private let policyBridge: PolicyBridge

    public init(policyBridge: PolicyBridge) {
        self.policyBridge = policyBridge
    }

    @discardableResult
    public func send(_ event: OSEvent) async -> PolicyDecision {
        let decision = await policyBridge.evaluate(event)
        print("[EventHandler] \(event.summary) -> \(decision.decision)")
        return decision
    }
}

public extension OSEvent {
    var summary: String {
        switch self {
        case let .open(pid, path, _):
            return "open pid=\(pid) path=\(path)"
        case let .exec(pid, argv):
            return "exec pid=\(pid) argv=\(argv.joined(separator: " "))"
        }
    }
}
