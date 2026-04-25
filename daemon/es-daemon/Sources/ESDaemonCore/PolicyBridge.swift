import Foundation

public struct PolicyDecision: Equatable, Codable, Sendable {
    public let decision: String
    public let reason: String?

    public init(decision: String, reason: String?) {
        self.decision = decision
        self.reason = reason
    }
}

public protocol PolicyTransport: Sendable {
    func post(event: OSEvent, to endpoint: URL) async throws -> PolicyDecision
}

public final class PolicyBridge: @unchecked Sendable {
    private let config: DaemonConfig
    private let transport: PolicyTransport

    public init(config: DaemonConfig, transport: PolicyTransport = URLSessionPolicyTransport()) {
        self.config = config
        self.transport = transport
    }

    public func evaluate(_ event: OSEvent) async -> PolicyDecision {
        do {
            return try await transport.post(event: event, to: config.policyEndpoint)
        } catch {
            return PolicyDecision(decision: "error", reason: error.localizedDescription)
        }
    }
}

public struct URLSessionPolicyTransport: PolicyTransport {
    public init() {}

    public func post(event: OSEvent, to endpoint: URL) async throws -> PolicyDecision {
        let url = endpoint.appendingPathComponent("os-event")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(event)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              (200..<300).contains(httpResponse.statusCode) else {
            throw PolicyBridgeError.badResponse
        }

        return try JSONDecoder().decode(PolicyDecision.self, from: data)
    }
}

public enum PolicyBridgeError: LocalizedError {
    case badResponse

    public var errorDescription: String? {
        switch self {
        case .badResponse:
            return "policy server returned a non-2xx response"
        }
    }
}
