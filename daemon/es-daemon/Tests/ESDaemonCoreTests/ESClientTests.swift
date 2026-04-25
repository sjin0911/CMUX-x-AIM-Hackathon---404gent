import XCTest
@testable import ESDaemonCore

final class ESClientTests: XCTestCase {
    func testAddWatchedPID() {
        let client = ESClient()

        client.addWatchedPID(1234)

        XCTAssertTrue(client.isWatching(1234))
    }

    func testPolicyBridgeFlagsSensitiveOpenInSkeletonMode() {
        let bridge = PolicyBridge(config: DaemonConfig())

        let decision = bridge.evaluate(.open(pid: 1234, path: ".env"))

        XCTAssertEqual(decision.decision, "would-block")
        XCTAssertEqual(decision.reason, "sensitive path")
    }
}
