import XCTest
@testable import ESDaemonCore

final class ESClientTests: XCTestCase {
    func testAddWatchedPID() {
        let client = ESClient()

        client.addWatchedPID(1234)

        XCTAssertTrue(client.isWatching(1234))
    }

    func testPolicyBridgePostsEventsToConfiguredEndpoint() async {
        let transport = MockPolicyTransport(
            decision: PolicyDecision(decision: "block", reason: "sensitive path")
        )
        let bridge = PolicyBridge(config: DaemonConfig(), transport: transport)

        let decision = await bridge.evaluate(.open(pid: 1234, path: ".env"))

        XCTAssertEqual(decision.decision, "block")
        XCTAssertEqual(decision.reason, "sensitive path")
        XCTAssertEqual(transport.events, [.open(pid: 1234, path: ".env")])
        XCTAssertEqual(transport.endpoints, [URL(string: "http://127.0.0.1:7404")!])
    }

    func testDaemonConfigReadsFourgentEnvironment() {
        let config = DaemonConfig.fromEnvironment([
            "FOURGENT_POLICY_ENDPOINT": "http://127.0.0.1:9999",
            "FOURGENT_WATCH_PIDS": "1234, 5678"
        ])

        XCTAssertEqual(config.policyEndpoint, URL(string: "http://127.0.0.1:9999")!)
        XCTAssertEqual(config.watchedPIDs, [1234, 5678])
    }
}

final class MockPolicyTransport: PolicyTransport, @unchecked Sendable {
    private let decision: PolicyDecision
    private(set) var events: [OSEvent] = []
    private(set) var endpoints: [URL] = []

    init(decision: PolicyDecision) {
        self.decision = decision
    }

    func post(event: OSEvent, to endpoint: URL) async throws -> PolicyDecision {
        events.append(event)
        endpoints.append(endpoint)
        return decision
    }
}
