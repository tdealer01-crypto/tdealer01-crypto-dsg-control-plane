package com.dsg.agent.automation

import android.os.Handler
import android.os.Looper
import com.dsg.agent.DsgConfig
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

/** Snapshot of the backend Hermes runtime health (GET /api/dsg/brain/execute). */
data class HermesHealth(
    val reachable: Boolean,
    val configured: Boolean,
    val provider: String,
    val model: String,
    val hosting: String?,
    val status: String,
    val description: String,
    val error: String? = null,
)

/**
 * Thin client for the DSG Brain / Hermes runtime that lives on the connected control-plane
 * backend. The APK does not run a model on-device (no extra Gradle/native dependency); it
 * acts as a lightweight client — a virtual Termux-style shell — over the backend Hermes +
 * Nous pipeline. Provider selection (Anthropic vs NousResearch Hermes via Together/OpenRouter)
 * is driven by server-side env, so this client only reads health and exercises a reply.
 */
class HermesRuntimeClient {
    private val ui = Handler(Looper.getMainLooper())

    private val healthUrl = "${DsgConfig.BASE_URL}/api/dsg/brain/execute"
    private val chatUrl = "${DsgConfig.BASE_URL}/api/agent/chat"

    /** GET the backend Hermes health/config. Result delivered on the UI thread. */
    fun health(onResult: (HermesHealth) -> Unit) {
        Thread {
            val result = runCatching {
                val conn = (URL(healthUrl).openConnection() as HttpURLConnection).apply {
                    requestMethod = "GET"
                    connectTimeout = 10_000
                    readTimeout = 10_000
                }
                val code = conn.responseCode
                val body = (if (code < 400) conn.inputStream else conn.errorStream)
                    ?.bufferedReader()?.readText() ?: ""
                conn.disconnect()
                val json = runCatching { JSONObject(body) }.getOrNull() ?: JSONObject()
                HermesHealth(
                    reachable = code in 200..499,
                    configured = json.optBoolean("configured", false),
                    provider = json.optString("provider", "unknown"),
                    model = json.optString("model", "unknown"),
                    hosting = json.optString("hosting", "").ifBlank { null },
                    status = json.optString("status", "unknown"),
                    description = json.optString("description", ""),
                )
            }.getOrElse { e ->
                HermesHealth(
                    reachable = false,
                    configured = false,
                    provider = "unknown",
                    model = "unknown",
                    hosting = null,
                    status = "unreachable",
                    description = "",
                    error = e.message ?: "connection error",
                )
            }
            ui.post { onResult(result) }
        }.start()
    }

    /**
     * Send a minimal prompt through the backend chat pipeline (SSE) and collect the reply.
     * Used by the "Test reply" step. Result: (ok, replyTextOrError) on the UI thread.
     */
    fun testReply(prompt: String, onResult: (Boolean, String) -> Unit) {
        Thread {
            var conn: HttpURLConnection? = null
            try {
                conn = (URL(chatUrl).openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    connectTimeout = 15_000
                    readTimeout = 60_000
                    doOutput = true
                    setRequestProperty("Content-Type", "application/json")
                    setRequestProperty("Accept", "text/event-stream")
                }
                val arr = JSONArray().put(JSONObject().put("role", "user").put("content", prompt))
                OutputStreamWriter(conn.outputStream).use {
                    it.write(JSONObject().put("messages", arr).toString())
                }

                if (conn.responseCode >= 400) {
                    val err = conn.errorStream?.bufferedReader()?.readText() ?: "HTTP ${conn.responseCode}"
                    ui.post { onResult(false, err) }
                    return@Thread
                }

                val sb = StringBuilder()
                conn.inputStream.bufferedReader().use { reader ->
                    var line: String?
                    while (reader.readLine().also { line = it } != null) {
                        val l = line?.trim() ?: continue
                        if (!l.startsWith("data: ")) continue
                        val data = l.removePrefix("data: ").trim()
                        if (data.isEmpty()) continue
                        val json = runCatching { JSONObject(data) }.getOrNull() ?: continue
                        when (json.optString("type")) {
                            "text" -> sb.append(json.optString("delta"))
                            "error" -> {
                                val msg = json.optString("message", "Unknown error")
                                ui.post { onResult(false, msg) }
                                return@Thread
                            }
                            "done" -> {
                                val reply = sb.toString().trim()
                                ui.post { onResult(reply.isNotEmpty(), reply.ifBlank { "(empty reply)" }) }
                                return@Thread
                            }
                        }
                    }
                }
                val reply = sb.toString().trim()
                ui.post { onResult(reply.isNotEmpty(), reply.ifBlank { "(empty reply)" }) }
            } catch (e: Exception) {
                ui.post { onResult(false, e.message ?: "Connection error") }
            } finally {
                conn?.disconnect()
            }
        }.start()
    }
}
