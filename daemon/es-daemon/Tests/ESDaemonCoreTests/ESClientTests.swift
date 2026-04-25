import XCTest
@testable import ESDaemonCore

final class ESClientTests: XCTestCase {
    func testAddWatchedPID() {
        let client = ESClient()

        client.addWatchedPID(1234)

        XCTAssertTrue(client.isWatching(1234))
    }

    func testWatchAllIsExplicit() {
        XCTAssertFalse(ESClient().isWatching(1234))
        XCTAssertTrue(ESClient(watchAll: true).isWatching(1234))
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
            "FOURGENT_CONTROL_HOST": "127.0.0.1",
            "FOURGENT_CONTROL_PORT": "8899",
            "FOURGENT_WATCH_PIDS": "1234, 5678",
            "FOURGENT_WATCH_ALL": "true"
        ])

        XCTAssertEqual(config.policyEndpoint, URL(string: "http://127.0.0.1:9999")!)
        XCTAssertEqual(config.controlHost, "127.0.0.1")
        XCTAssertEqual(config.controlPort, 8899)
        XCTAssertEqual(config.watchedPIDs, [1234, 5678])
        XCTAssertEqual(config.watchAll, true)
    }

    func testDaemonControlRegistersPID() {
        let registry = MockPIDRegistry()
        let server = DaemonControlServer(registry: registry)
        let response = server.handleRawRequest("""
        POST /register-pid HTTP/1.1\r
        Content-Type: application/json\r
        Content-Length: 28\r
        \r
        {"pid":4321,"agent":"codex"}
        """)

        XCTAssertTrue(response.contains("200 OK"))
        XCTAssertEqual(registry.pids, [4321])
    }

    func testDaemonControlStatus() {
        let registry = MockPIDRegistry(pids: [1234, 5678], watchAll: false)
        let server = DaemonControlServer(registry: registry)
        let response = server.handleRawRequest("""
        GET /status HTTP/1.1\r
        \r
        """)

        XCTAssertTrue(response.contains("200 OK"))
        XCTAssertTrue(response.contains("\"watchedPIDs\":[1234,5678]"))
        XCTAssertTrue(response.contains("\"watchAll\":false"))
    }

    func testLocalPolicyDeniesSensitiveBasenames() {
        let policy = LocalPolicy()

        XCTAssertEqual(policy.evaluateOpen(path: "/Users/me/project/.env"), .deny(reason: "sensitive file: .env", cache: false))
        XCTAssertEqual(policy.evaluateOpen(path: "../project/.env.local"), .deny(reason: "sensitive file: .env.local", cache: false))
        XCTAssertEqual(policy.evaluateOpen(path: "/tmp/credentials.json"), .deny(reason: "sensitive file: credentials.json", cache: false))
    }

    func testLocalPolicyDeniesSensitivePathFragments() {
        let policy = LocalPolicy()

        XCTAssertEqual(policy.evaluateOpen(path: "/Users/me/.ssh/id_rsa"), .deny(reason: "sensitive path: /.ssh/", cache: false))
        XCTAssertEqual(policy.evaluateOpen(path: "/Users/me/.aws/credentials"), .deny(reason: "sensitive path: /.aws/", cache: false))
        XCTAssertEqual(policy.evaluateOpen(path: "/Users/me/.gnupg/private-keys-v1.d/key"), .deny(reason: "sensitive path: /.gnupg/", cache: false))
    }

    func testLocalPolicyAllowsOrdinaryFilesWithCache() {
        let decision = LocalPolicy().evaluateOpen(path: "/tmp/readme.txt")

        XCTAssertEqual(decision, .allow(cache: true, reason: nil))
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

final class MockPIDRegistry: PIDRegistry, @unchecked Sendable {
    private(set) var pids: Set<pid_t>
    let watchesAll: Bool

    init(pids: Set<pid_t> = [], watchAll: Bool = false) {
        self.pids = pids
        self.watchesAll = watchAll
    }

    func addWatchedPID(_ pid: pid_t) {
        pids.insert(pid)
    }

    func watchedPIDsSnapshot() -> Set<pid_t> {
        pids
    }
}
