package com.dsg.agent.service

import android.content.Context
import com.dsg.agent.automation.AgentCommandType
import com.dsg.agent.automation.AuditLogStore
import com.dsg.agent.automation.DadBotCallback
import com.dsg.agent.automation.DadBotClient
import com.dsg.agent.automation.DadBotMessage
import com.dsg.agent.automation.MemoryStore
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStream
import java.net.ServerSocket
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

class LocalApiServer(private val context: Context) {

    @Volatile var isRunning = false
        private set

    private var serverSocket: ServerSocket? = null
    private var serverThread: Thread? = null

    companion object {
        const val DEFAULT_PORT = 8642
    }

    fun start(port: Int = DEFAULT_PORT) {
        if (isRunning) return
        isRunning = true
        serverThread = Thread { acceptLoop(port) }.also {
            it.isDaemon = true
            it.name = "dsg-local-api"
            it.start()
        }
        AuditLogStore(context).append("LOCAL_API_STARTED", "server", "Listening on :$port")
    }

    fun stop() {
        isRunning = false
        runCatching { serverSocket?.close() }
        serverThread?.interrupt()
        serverThread = null
        AuditLogStore(context).append("LOCAL_API_STOPPED", "server", "Server stopped")
    }

    fun getLocalIp(): String = runCatching {
        java.net.NetworkInterface.getNetworkInterfaces()?.toList()
            ?.flatMap { it.inetAddresses.toList() }
            ?.filterIsInstance<java.net.Inet4Address>()
            ?.firstOrNull { !it.isLoopbackAddress }
            ?.hostAddress ?: "localhost"
    }.getOrDefault("localhost")

    // ── accept loop ────────────────────────────────────────────

    private fun acceptLoop(port: Int) {
        runCatching {
            ServerSocket(port).use { ss ->
                serverSocket = ss
                while (isRunning) {
                    val client = runCatching { ss.accept() }.getOrNull() ?: break
                    Thread { handleClient(client) }.also { it.isDaemon = true; it.start() }
                }
            }
        }
        isRunning = false
    }

    private fun handleClient(socket: java.net.Socket) {
        try {
            socket.use { s ->
                val reader = s.inputStream.bufferedReader(Charsets.UTF_8)
                val requestLine = reader.readLine()?.trim()
                if (requestLine == null) return@use
                val headers = mutableMapOf<String, String>()
                var h = reader.readLine()
                while (h != null && h.isNotBlank()) {
                    val c = h.indexOf(':')
                    if (c > 0) headers[h.substring(0, c).trim().lowercase()] = h.substring(c + 1).trim()
                    h = reader.readLine()
                }
                val len = headers["content-length"]?.toIntOrNull() ?: 0
                val body = if (len > 0) {
                    val buf = CharArray(len)
                    var read = 0
                    while (read < len) {
                        val n = reader.read(buf, read, len - read)
                        if (n < 0) break
                        read += n
                    }
                    String(buf, 0, read)
                } else ""
                val parts = requestLine.split(" ")
                if (parts.size < 2) return@use
                route(parts[0], parts[1].substringBefore("?"), body, s.outputStream)
            }
        } catch (e: Exception) {
            // swallow socket errors
        }
    }

    // ── routing ────────────────────────────────────────────────

    private fun route(method: String, path: String, body: String, out: OutputStream) {
        val wantsStream = runCatching { JSONObject(body).optBoolean("stream", false) }.getOrDefault(false)
        when {
            method == "OPTIONS"                                          -> sendCors(out)
            method == "GET" && path == "/v1/models"                     -> handleModels(out)
            method == "GET" && (path == "/api/agent/status" || path == "/health") -> handleStatus(out)
            method == "POST" && path == "/v1/chat/completions"          -> handleChatCompletions(body, out, wantsStream)
            method == "POST" && path == "/v1/messages"                  -> handleMessages(body, out)
            else -> sendJson(out, 404, """{"error":{"message":"Not found","type":"not_found_error"}}""")
        }
    }

    // ── GET /v1/models ──────────────────────────────────────────────────

    private fun handleModels(out: OutputStream) {
        val data = JSONArray().apply {
            put(modelObj("dsg-agent")); put(modelObj("dsg-agent-haiku"))
        }
        sendJson(out, 200, JSONObject().put("object", "list").put("data", data).toString())
    }

    private fun modelObj(id: String) = JSONObject().apply {
        put("id", id); put("object", "model"); put("created", 1_700_000_000L); put("owned_by", "dsg")
    }

    // ── GET /api/agent/status ───────────────────────────────────────────

    private fun handleStatus(out: OutputStream) {
        sendJson(out, 200, JSONObject().put("status", "ok").put("model", "dsg-agent").put("port", DEFAULT_PORT).toString())
    }

    // ── POST /v1/chat/completions ─────────────────────────────────────────

    private fun handleChatCompletions(body: String, out: OutputStream, stream: Boolean) {
        val json = runCatching { JSONObject(body) }.getOrNull()
        if (json == null) {
            sendJson(out, 400, """{"error":{"message":"Invalid JSON","type":"invalid_request_error"}}""")
            return
        }
        val messages = parseOpenAiMessages(json.optJSONArray("messages"))
        if (messages.isEmpty()) {
            sendJson(out, 400, """{"error":{"message":"messages required","type":"invalid_request_error"}}""")
            return
        }
        val memCtx = MemoryStore(context).toContextBlock()
        val id = "chatcmpl-${UUID.randomUUID().toString().replace("-", "").take(16)}"

        if (stream) {
            val latch = CountDownLatch(1)
            val hdr = "HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nCache-Control: no-cache\r\nAccess-Control-Allow-Origin: *\r\nConnection: keep-alive\r\n\r\n"
            runCatching { out.write(hdr.toByteArray(Charsets.UTF_8)); out.flush() }
            DadBotClient().chat(messages, object : DadBotCallback {
                override fun onToken(token: String) {
                    runCatching { out.write(sseChunk(id, token).toByteArray(Charsets.UTF_8)); out.flush() }
                }
                override fun onCommand(type: AgentCommandType, target: String, reason: String) {}
                override fun onDone() {
                    runCatching {
                        out.write(sseChunk(id, "", "stop").toByteArray(Charsets.UTF_8))
                        out.write("data: [DONE]\n\n".toByteArray(Charsets.UTF_8))
                        out.flush()
                    }
                    latch.countDown()
                }
                override fun onError(message: String) {
                    runCatching { out.write("data: {\"error\":{\"message\":\"$message\"}}\n\n".toByteArray(Charsets.UTF_8)); out.flush() }
                    latch.countDown()
                }
            }, memCtx)
            latch.await(90, TimeUnit.SECONDS)
        } else {
            val buf = StringBuilder()
            val latch = CountDownLatch(1)
            val errorRef = AtomicReference<String?>(null)
            DadBotClient().chat(messages, object : DadBotCallback {
                override fun onToken(t: String) { buf.append(t) }
                override fun onCommand(type: AgentCommandType, target: String, reason: String) {}
                override fun onDone() { latch.countDown() }
                override fun onError(m: String) { errorRef.set(m); latch.countDown() }
            }, memCtx)
            val completed = latch.await(90, TimeUnit.SECONDS)
            if (!completed) {
                sendJson(out, 500, """{"error":{"message":"Timeout","type":"api_error"}}""")
                return
            }
            val err = errorRef.get()
            if (err != null) {
                sendJson(out, 500, """{"error":{"message":"$err","type":"api_error"}}""")
                return
            }
            val content = buf.toString()
            sendJson(out, 200, JSONObject().apply {
                put("id", id); put("object", "chat.completion"); put("model", "dsg-agent")
                put("choices", JSONArray().put(JSONObject().apply {
                    put("index", 0)
                    put("message", JSONObject().put("role", "assistant").put("content", content))
                    put("finish_reason", "stop")
                }))
                put("usage", JSONObject().put("prompt_tokens", 0).put("completion_tokens", content.length / 4).put("total_tokens", content.length / 4))
            }.toString())
        }
    }

    // ── POST /v1/messages (Anthropic) ─────────────────────────────────

    private fun handleMessages(body: String, out: OutputStream) {
        val json = runCatching { JSONObject(body) }.getOrNull()
        if (json == null) {
            sendJson(out, 400, """{"error":{"type":"invalid_request_error","message":"Invalid JSON"}}""")
            return
        }
        val messages = parseAnthropicMessages(json.optJSONArray("messages"))
        if (messages.isEmpty()) {
            sendJson(out, 400, """{"error":{"type":"invalid_request_error","message":"messages required"}}""")
            return
        }
        val memCtx = MemoryStore(context).toContextBlock()
        val id = "msg_${UUID.randomUUID().toString().replace("-", "").take(24)}"
        val buf = StringBuilder()
        val latch = CountDownLatch(1)
        val errorRef = AtomicReference<String?>(null)
        DadBotClient().chat(messages, object : DadBotCallback {
            override fun onToken(t: String) { buf.append(t) }
            override fun onCommand(type: AgentCommandType, target: String, reason: String) {}
            override fun onDone() { latch.countDown() }
            override fun onError(m: String) { errorRef.set(m); latch.countDown() }
        }, memCtx)
        val completed = latch.await(90, TimeUnit.SECONDS)
        if (!completed) {
            sendJson(out, 500, """{"error":{"type":"api_error","message":"Timeout"}}""")
            return
        }
        val err = errorRef.get()
        if (err != null) {
            sendJson(out, 500, """{"error":{"type":"api_error","message":"$err"}}""")
            return
        }
        val content = buf.toString()
        sendJson(out, 200, JSONObject().apply {
            put("id", id); put("type", "message"); put("role", "assistant"); put("model", "dsg-agent")
            put("content", JSONArray().put(JSONObject().put("type", "text").put("text", content)))
            put("stop_reason", "end_turn")
            put("usage", JSONObject().put("input_tokens", 0).put("output_tokens", content.length / 4))
        }.toString())
    }

    // ── helpers ─────────────────────────────────────────────────────

    private fun sseChunk(id: String, delta: String, finishReason: String? = null): String {
        val choice = JSONObject().apply {
            put("index", 0)
            put("delta", if (delta.isNotEmpty()) JSONObject().put("content", delta) else JSONObject())
            put("finish_reason", finishReason ?: JSONObject.NULL)
        }
        return "data: ${JSONObject().put("id", id).put("object", "chat.completion.chunk").put("model", "dsg-agent").put("choices", JSONArray().put(choice))}\n\n"
    }

    private fun parseOpenAiMessages(arr: JSONArray?): List<DadBotMessage> {
        arr ?: return emptyList()
        return (0 until arr.length()).map { i ->
            val o = arr.getJSONObject(i)
            DadBotMessage(o.optString("role", "user"), o.optString("content", ""))
        }
    }

    private fun parseAnthropicMessages(arr: JSONArray?): List<DadBotMessage> {
        arr ?: return emptyList()
        return (0 until arr.length()).map { i ->
            val o = arr.getJSONObject(i)
            val raw = o.opt("content")
            val text = when (raw) {
                is String -> raw
                is JSONArray -> (0 until raw.length()).joinToString("") { j ->
                    val b = raw.getJSONObject(j)
                    if (b.optString("type") == "text") b.optString("text", "") else ""
                }
                else -> ""
            }
            DadBotMessage(o.optString("role", "user"), text)
        }
    }

    private fun sendJson(out: OutputStream, status: Int, body: String) {
        val phrase = when (status) { 200 -> "OK"; 400 -> "Bad Request"; 404 -> "Not Found"; else -> "Internal Server Error" }
        val bytes = body.toByteArray(Charsets.UTF_8)
        val header = "HTTP/1.1 $status $phrase\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: ${bytes.size}\r\nConnection: close\r\n\r\n"
        runCatching { out.write(header.toByteArray(Charsets.UTF_8)); out.write(bytes); out.flush() }
    }

    private fun sendCors(out: OutputStream) {
        val r = "HTTP/1.1 204 No Content\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type, Authorization, x-api-key, anthropic-version\r\nConnection: close\r\n\r\n"
        runCatching { out.write(r.toByteArray(Charsets.UTF_8)); out.flush() }
    }
}
