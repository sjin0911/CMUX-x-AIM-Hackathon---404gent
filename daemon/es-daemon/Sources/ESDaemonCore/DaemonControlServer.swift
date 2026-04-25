import Darwin
import Foundation

public protocol PIDRegistry: AnyObject {
    func addWatchedPID(_ pid: pid_t)
    func watchedPIDsSnapshot() -> Set<pid_t>
    var watchesAll: Bool { get }
}

extension ESClient: PIDRegistry {}

public final class DaemonControlServer: @unchecked Sendable {
    private let host: String
    private let port: UInt16
    private weak var registry: PIDRegistry?
    private var socketFD: Int32 = -1
    private let queue = DispatchQueue(label: "404gent.es-daemon.control")

    public init(host: String = "127.0.0.1", port: UInt16 = 7405, registry: PIDRegistry) {
        self.host = host
        self.port = port
        self.registry = registry
    }

    public func start() throws {
        socketFD = socket(AF_INET, SOCK_STREAM, 0)
        guard socketFD >= 0 else {
            throw DaemonControlError.socketCreationFailed
        }

        var reuse: Int32 = 1
        setsockopt(socketFD, SOL_SOCKET, SO_REUSEADDR, &reuse, socklen_t(MemoryLayout<Int32>.size))

        var address = sockaddr_in()
        address.sin_family = sa_family_t(AF_INET)
        address.sin_port = port.bigEndian
        address.sin_addr.s_addr = inet_addr(host)

        let bindResult = withUnsafePointer(to: &address) { pointer in
            pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) { sockaddrPointer in
                bind(socketFD, sockaddrPointer, socklen_t(MemoryLayout<sockaddr_in>.size))
            }
        }
        guard bindResult == 0 else {
            close(socketFD)
            socketFD = -1
            throw DaemonControlError.bindFailed(host: host, port: port)
        }

        guard listen(socketFD, 16) == 0 else {
            close(socketFD)
            socketFD = -1
            throw DaemonControlError.listenFailed
        }

        queue.async { [weak self] in
            self?.acceptLoop()
        }

        print("[DaemonControl] Listening on http://\(host):\(port)")
    }

    public func stop() {
        if socketFD >= 0 {
            close(socketFD)
            socketFD = -1
        }
    }

    private func acceptLoop() {
        while socketFD >= 0 {
            let clientFD = accept(socketFD, nil, nil)
            guard clientFD >= 0 else {
                continue
            }

            handle(clientFD: clientFD)
            close(clientFD)
        }
    }

    private func handle(clientFD: Int32) {
        var buffer = [UInt8](repeating: 0, count: 65536)
        let count = recv(clientFD, &buffer, buffer.count, 0)
        guard count > 0 else {
            return
        }

        let request = String(decoding: buffer.prefix(count), as: UTF8.self)
        let response = handleRawRequest(request)
        _ = response.withCString { pointer in
            send(clientFD, pointer, strlen(pointer), 0)
        }
    }

    public func handleRawRequest(_ request: String) -> String {
        let parsed = parseHTTPRequest(request)

        if parsed.method == "POST" && parsed.path == "/register-pid" {
            return registerPID(body: parsed.body)
        }

        if parsed.method == "GET" && parsed.path == "/status" {
            return status()
        }

        return jsonResponse(status: 404, body: ["error": "not found"])
    }

    private func registerPID(body: String) -> String {
        guard let data = body.data(using: .utf8),
              let request = try? JSONDecoder().decode(RegisterPIDRequest.self, from: data),
              request.pid > 0 else {
            return jsonResponse(status: 400, body: ["error": "pid is required"])
        }

        registry?.addWatchedPID(request.pid)
        return jsonResponse(status: 200, body: [
            "ok": true,
            "pid": Int(request.pid),
            "agent": request.agent ?? ""
        ])
    }

    private func status() -> String {
        let pids = registry?.watchedPIDsSnapshot().sorted().map(Int.init) ?? []
        return jsonResponse(status: 200, body: [
            "watchAll": registry?.watchesAll ?? false,
            "watchedPIDs": pids
        ])
    }
}

public struct RegisterPIDRequest: Codable, Sendable {
    public let pid: pid_t
    public let agent: String?

    public init(pid: pid_t, agent: String? = nil) {
        self.pid = pid
        self.agent = agent
    }
}

public enum DaemonControlError: LocalizedError {
    case socketCreationFailed
    case bindFailed(host: String, port: UInt16)
    case listenFailed

    public var errorDescription: String? {
        switch self {
        case .socketCreationFailed:
            return "failed to create daemon control socket"
        case let .bindFailed(host, port):
            return "failed to bind daemon control server to \(host):\(port)"
        case .listenFailed:
            return "failed to listen on daemon control socket"
        }
    }
}

private func parseHTTPRequest(_ request: String) -> (method: String, path: String, body: String) {
    let parts = request.components(separatedBy: "\r\n\r\n")
    let head = parts.first ?? ""
    let body = parts.dropFirst().joined(separator: "\r\n\r\n")
    let requestLine = head.split(separator: "\r\n").first ?? ""
    let fields = requestLine.split(separator: " ")

    return (
        method: fields.indices.contains(0) ? String(fields[0]) : "",
        path: fields.indices.contains(1) ? String(fields[1]) : "",
        body: body
    )
}

private func jsonResponse(status: Int, body: [String: Any]) -> String {
    let data = (try? JSONSerialization.data(withJSONObject: body, options: [.sortedKeys])) ?? Data()
    let text = String(data: data, encoding: .utf8) ?? "{}"
    let statusText = status == 200 ? "OK" : (status == 400 ? "Bad Request" : "Not Found")

    return [
        "HTTP/1.1 \(status) \(statusText)",
        "Content-Type: application/json",
        "Content-Length: \(text.utf8.count)",
        "Connection: close",
        "",
        text
    ].joined(separator: "\r\n")
}
