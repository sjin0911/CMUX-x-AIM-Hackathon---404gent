import Foundation
#if canImport(EndpointSecurity)
import Darwin
import EndpointSecurity
#endif

public final class ESClient {
    private var watchedPIDs: Set<pid_t>
    private let watchedPIDsLock = NSLock()
    private let watchAll: Bool
    private let localPolicy: LocalPolicy
    public private(set) var isRunning = false
    private let eventHandler: EventHandler?

    #if canImport(EndpointSecurity)
    private var client: OpaquePointer?
    #endif

    public init(
        watchedPIDs: Set<pid_t> = [],
        watchAll: Bool = false,
        eventHandler: EventHandler? = nil,
        localPolicy: LocalPolicy = LocalPolicy()
    ) {
        self.watchedPIDs = watchedPIDs
        self.watchAll = watchAll
        self.eventHandler = eventHandler
        self.localPolicy = localPolicy
        print("[ESClient] Initialized")
    }

    public func addWatchedPID(_ pid: pid_t) {
        watchedPIDsLock.lock()
        defer { watchedPIDsLock.unlock() }

        watchedPIDs.insert(pid)
        print("[ESClient] Now watching PID: \(pid)")
    }

    public func isWatching(_ pid: pid_t) -> Bool {
        if watchAll {
            return true
        }

        watchedPIDsLock.lock()
        defer { watchedPIDsLock.unlock() }
        return watchedPIDs.contains(pid)
    }

    public var watchesAll: Bool {
        watchAll
    }

    public func watchedPIDsSnapshot() -> Set<pid_t> {
        watchedPIDsLock.lock()
        defer { watchedPIDsLock.unlock() }
        return watchedPIDs
    }

    public func start() throws {
        isRunning = true

        #if canImport(EndpointSecurity)
        try startEndpointSecurity()
        #else
        print("[ESClient] EndpointSecurity framework is unavailable in this build")
        #endif
    }

    public func stop() {
        #if canImport(EndpointSecurity)
        if let client {
            es_unsubscribe_all(client)
            es_delete_client(client)
            self.client = nil
        }
        #endif

        isRunning = false
        print("[ESClient] Stopped")
    }

    #if canImport(EndpointSecurity)
    private func startEndpointSecurity() throws {
        var newClient: OpaquePointer?
        let result = es_new_client(&newClient) { [weak self] _, message in
            self?.handle(message)
        }

        guard result == ES_NEW_CLIENT_RESULT_SUCCESS, let newClient else {
            throw ESClientError.clientCreationFailed(result.rawValue)
        }

        let events: [es_event_type_t] = [
            ES_EVENT_TYPE_AUTH_OPEN,
            ES_EVENT_TYPE_NOTIFY_EXEC
        ]
        let subscribeResult = events.withUnsafeBufferPointer { buffer in
            es_subscribe(newClient, buffer.baseAddress!, UInt32(buffer.count))
        }

        guard subscribeResult == ES_RETURN_SUCCESS else {
            es_delete_client(newClient)
            throw ESClientError.subscriptionFailed
        }

        client = newClient
        print("[ESClient] Subscribed to AUTH_OPEN, NOTIFY_EXEC")
    }

    private func handle(_ message: UnsafePointer<es_message_t>) {
        let pid = audit_token_to_pid(message.pointee.process.pointee.audit_token)

        switch message.pointee.event_type {
        case ES_EVENT_TYPE_AUTH_OPEN:
            handleAuthOpen(message, pid: pid)
        case ES_EVENT_TYPE_NOTIFY_EXEC:
            handleNotifyExec(message, pid: pid)
        default:
            return
        }
    }

    private func handleAuthOpen(_ message: UnsafePointer<es_message_t>, pid: pid_t) {
        guard let client else {
            return
        }

        guard isWatching(pid) else {
            es_respond_auth_result(client, message, ES_AUTH_RESULT_ALLOW, true)
            return
        }

        let file = message.pointee.event.open.file.pointee
        let path = string(from: file.path)
        let authDecision = localPolicy.evaluateOpen(path: path)
        let result: es_auth_result_t = authDecision.decision == "deny"
            ? ES_AUTH_RESULT_DENY
            : ES_AUTH_RESULT_ALLOW

        es_respond_auth_result(client, message, result, authDecision.cache)

        let event = OSEvent.open(
            pid: pid,
            path: path,
            auth: AuthEventMetadata(
                decision: authDecision.decision,
                reason: authDecision.reason,
                cache: authDecision.cache
            )
        )
        sendAsync(event)
    }

    private func handleNotifyExec(_ message: UnsafePointer<es_message_t>, pid: pid_t) {
        guard isWatching(pid) else {
            return
        }

        let executable = message.pointee.event.exec.target.pointee.executable.pointee
        let path = string(from: executable.path)
        let event = OSEvent.exec(pid: pid, argv: [URL(fileURLWithPath: path).lastPathComponent, path])
        sendAsync(event)
    }

    private func sendAsync(_ event: OSEvent) {
        if let eventHandler {
            Task {
                _ = await eventHandler.send(event)
            }
        } else {
            print("[ESClient] \(event.summary)")
        }
    }

    private func string(from token: es_string_token_t) -> String {
        guard let data = token.data else {
            return ""
        }

        let buffer = UnsafeRawBufferPointer(start: data, count: Int(token.length))
        return String(decoding: buffer, as: UTF8.self)
    }
    #endif
}

public enum ESClientError: LocalizedError {
    case clientCreationFailed(UInt32)
    case subscriptionFailed

    public var errorDescription: String? {
        switch self {
        case let .clientCreationFailed(code):
            return "failed to create EndpointSecurity client: \(code)"
        case .subscriptionFailed:
            return "failed to subscribe to EndpointSecurity notify events"
        }
    }
}
