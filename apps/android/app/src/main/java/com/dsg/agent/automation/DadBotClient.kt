package com.dsg.agent.automation

import android.os.Handler
import android.os.Looper
import com.dsg.agent.DsgConfig
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

data class DadBotMessage(val role: String, val content: String)

interface DadBotCallback {
    fun onToken(text: String)
    fun onCommand(type: AgentCommandType, target: String, reason: String)
    fun onDone()
    fun onError(message: String)
}

class DadBotClient {
    private val ui = Handler(Looper.getMainLooper())

    fun chat(messages: List<DadBotMessage>, callback: DadBotCallback) {
        Thread {
            var conn: HttpURLConnection? = null
            try {
                val url = URL("${DsgConfig.BASE_URL}/api/agent/chat")
                conn = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    connectTimeout = 15_000
                    readTimeout = 60_000
                    doOutput = true
                    setRequestProperty("Content-Type", "application/json")
                    setRequestProperty("Accept", "text/event-stream")
                }

                val arr = JSONArray().also { a ->
                    messages.forEach { m -> a.put(JSONObject().put("role", m.role).put("content", m.content)) }
                }
                OutputStreamWriter(conn.outputStream).use { it.write(JSONObject().put("messages", arr).toString()) }

                if (conn.responseCode >= 400) {
                    val err = conn.errorStream?.bufferedReader()?.readText() ?: "HTTP ${conn.responseCode}"
                    ui.post { callback.onError(err) }
                    return@Thread
                }

                conn.inputStream.bufferedReader().use { reader ->
                    var line: String?
                    while (reader.readLine().also { line = it } != null) {
                        val l = line?.trim() ?: continue
                        if (!l.startsWith("data: ")) continue
                        val data = l.removePrefix("data: ").trim()
                        if (data.isEmpty()) continue
                        val json = runCatching { JSONObject(data) }.getOrNull() ?: continue

                        when (json.optString("type")) {
                            "text" -> {
                                val token = json.optString("delta")
                                if (token.isNotEmpty()) ui.post { callback.onToken(token) }
                            }
                            "command" -> {
                                val cmdType = runCatching {
                                    AgentCommandType.valueOf(json.optString("commandType", "STATUS"))
                                }.getOrDefault(AgentCommandType.STATUS)
                                val target = json.optString("target", "")
                                val reason = json.optString("reason", "DadBot")
                                ui.post { callback.onCommand(cmdType, target, reason) }
                            }
                            "error" -> {
                                val msg = json.optString("message", "Unknown error")
                                ui.post { callback.onError(msg) }
                            }
                            "done" -> {
                                ui.post { callback.onDone() }
                                return@use
                            }
                        }
                    }
                    ui.post { callback.onDone() }
                }
            } catch (e: Exception) {
                ui.post { callback.onError(e.message ?: "Connection error") }
            } finally {
                conn?.disconnect()
            }
        }.start()
    }
}
