import Foundation

public enum AuthDecision: Equatable, Sendable {
    case allow(cache: Bool, reason: String?)
    case deny(reason: String, cache: Bool)

    public var decision: String {
        switch self {
        case .allow:
            return "allow"
        case .deny:
            return "deny"
        }
    }

    public var reason: String? {
        switch self {
        case let .allow(_, reason):
            return reason
        case let .deny(reason, _):
            return reason
        }
    }

    public var cache: Bool {
        switch self {
        case let .allow(cache, _):
            return cache
        case let .deny(_, cache):
            return cache
        }
    }
}

public struct LocalPolicy: Sendable {
    private static let denyBasenames: Set<String> = [
        ".env",
        ".env.local",
        ".env.production",
        ".env.development",
        "credentials.json",
        "secrets.json"
    ]

    private static let denyPathFragments = [
        "/.ssh/",
        "/.aws/",
        "/.gnupg/"
    ]

    public init() {}

    public func evaluateOpen(path: String) -> AuthDecision {
        let normalized = path.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !normalized.isEmpty else {
            return .allow(cache: false, reason: "empty path")
        }

        let basename = URL(fileURLWithPath: normalized).lastPathComponent
        if Self.denyBasenames.contains(basename) {
            return .deny(reason: "sensitive file: \(basename)", cache: false)
        }

        if let fragment = Self.denyPathFragments.first(where: { normalized.contains($0) }) {
            return .deny(reason: "sensitive path: \(fragment)", cache: false)
        }

        return .allow(cache: true, reason: nil)
    }
}
