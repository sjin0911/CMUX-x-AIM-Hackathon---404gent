import Foundation
#if canImport(EndpointSecurity)
import Darwin
import EndpointSecurity
#endif

public final class ESClient {
    private var watchedPIDs: Set<pid_t>
    public private(set) var isRunning = false
    private let eventHandler: EventHandler?

    #if canImport(EndpointSecurity)
    private var client: OpaquePointer?
    #endif

    public init(watchedPIDs: Set<pid_t> = [], eventHandler: EventHandler? = nil) {
        self.watchedPIDs = watchedPIDs
        self.eventHandler = eventHandler
        print("[ESClient] Initialized")
    }

    public func addWatchedPID(_ pid: pid_t) {
        watchedPIDs.insert(pid)
        print("[ESClient] Now watching PID: \(pid)")
    }

    public func isWatching(_ pid: pid_t) -> Bool {
        watchedPIDs.contains(pid)
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
            ES_EVENT_TYPE_NOTIFY_OPEN,
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
        print("[ESClient] Subscribed to NOTIFY_OPEN, NOTIFY_EXEC")
    }

    private func handle(_ message: UnsafePointer<es_message_t>) {
        let pid = audit_token_to_pid(message.pointee.process.pointee.audit_token)
        guard watchedPIDs.isEmpty || watchedPIDs.contains(pid) else {
            return
        }

        guard let event = osEvent(from: message, pid: pid) else {
            return
        }

        if let eventHandler {
            Task {
                _ = await eventHandler.handle(event)
            }
        } else {
            print("[ESClient] \(event.summary)")
        }
    }

    private func osEvent(from message: UnsafePointer<es_message_t>, pid: pid_t) -> OSEvent? {
        switch message.pointee.event_type {
        case ES_EVENT_TYPE_NOTIFY_OPEN:
            let file = message.pointee.event.open.file.pointee
            return .open(pid: pid, path: string(from: file.path))
        case ES_EVENT_TYPE_NOTIFY_EXEC:
            let executable = message.pointee.event.exec.target.pointee.executable.pointee
            let path = string(from: executable.path)
            return .exec(pid: pid, argv: [URL(fileURLWithPath: path).lastPathComponent, path])
        default:
            return nil
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
