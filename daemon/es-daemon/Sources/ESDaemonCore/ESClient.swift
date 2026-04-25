import Foundation

public final class ESClient {
    private var watchedPIDs: Set<pid_t>
    public private(set) var isRunning = false

    public init(watchedPIDs: Set<pid_t> = []) {
        self.watchedPIDs = watchedPIDs
        print("[ESClient] Initialized in skeleton mode")
    }

    public func addWatchedPID(_ pid: pid_t) {
        watchedPIDs.insert(pid)
        print("[ESClient] Now watching PID: \(pid)")
    }

    public func isWatching(_ pid: pid_t) -> Bool {
        watchedPIDs.contains(pid)
    }

    public func start() {
        isRunning = true
        print("[ESClient] Would start EndpointSecurity subscription here")
    }

    public func stop() {
        isRunning = false
        print("[ESClient] Stopped")
    }
}
