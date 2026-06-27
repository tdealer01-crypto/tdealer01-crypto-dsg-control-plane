package com.dsg.agent.service

import android.content.Context
import com.dsg.agent.automation.AgentCommandType
import com.dsg.agent.automation.AuditLogStore
import com.dsg.agent.automation.DadBotCallback
import com.dsg.agent.automation.DadBotClient
import com.dsg.agent.automation.DadBotMessage
import com.dsg.agent.automation.MemoryStore
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class TelegramGateway(private val context: Context) {
    private var pollingThread: Thread? = null

    @Volatile
    var isRunning: Boolean = false
        private set

    fun start(token: String, allowedChatId: String) {
        if (isRunning) return
        isRunning = true
        pollingThread = Thread { pollLoop(token, allowedChatId) }.also {
            it.isDaemon = true
            it.start()
        }
        AuditLogStore(context).append("TELEGRAM_STARTED", "gateway", "Polling started chatId=$allowedChatId")
    }

    fun stop() {
        isRunning = false
        pollingThread?.interrupt()
        pollingThread = null
        AuditLogStore(context).append("TELEGRAM_STOPPED", "gateway", "Polling stopped")
    }

    private fun pollLoop(token: String, allowedChatId: String) {
        var offset = 0
        val base = "https://api.telegram.org/bot$token"
        while (isRunning) {
            try {
                val url = URL("$base/getUpdates?timeout=25&offset=$offset")
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    connectTimeout = 5_000; readTimeout = 30_000; requestMethod = "GET"
                }
                if (conn.responseCode == 200) {
                    val body = conn.inputStream.bufferedReader().readText()
                    conn.disconnect()
                    val updates = JSONObject(body).getJSONArray("result")
                    for (i in 0 until updates.length()) {
                        val update = updates.getJSONObject(i)
                        offset = update.getInt("update_id") + 1
                        val message = update.optJSONObject("message") ?: continue
                        val chatId = message.getJSONObject("chat").getLong("id").toString()
                        if (allowedChatId.isNotBlank() && chatId != allowedChatId) continue
                        val text = message.optString("text").trim()
                        if (text.isBlank()) continue
                        handleMessage(base, chatId, text)
                    }
                } else {
                    conn.disconnect()
                    Thread.sleep(5_000)
                }
            } catch (e: InterruptedException) {
                break
            } catch (e: Exception) {
                if (isRunning) runCatching { Thread.sleep(5_000) }
            }
        }
    }

    private fun handleMessage(base: String, chatId: String, text: String) {
        val memCtx = MemoryStore(context).toContextBlock()
        val messages = listOf(DadBotMessage("user", text))
        val replyBuf = StringBuilder()

        DadBotClient().chat(messages, object : DadBotCallback {
            override fun onToken(t: String) { replyBuf.append(t) }
            override fun onCommand(type: AgentCommandType, target: String, reason: String) {
                AuditLogStore(context).append("TELEGRAM_COMMAND", "gateway", "${type.name}: $target")
            }
            override fun onDone() {
                val reply = replyBuf.toString().ifBlank { "✅ Done" }
                sendMessage(base, chatId, reply)
            }
            override fun onError(message: String) = sendMessage(base, chatId, "⚠️ $message")
        }, memCtx)
    }

    private fun sendMessage(base: String, chatId: String, text: String) {
        runCatching {
            val conn = (URL("$base/sendMessage").openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"; doOutput = true
                setRequestProperty("Content-Type", "application/json")
                connectTimeout = 5_000; readTimeout = 10_000
            }
            val body = JSONObject().put("chat_id", chatId).put("text", text).toString()
            OutputStreamWriter(conn.outputStream).use { it.write(body) }
            conn.responseCode
            conn.disconnect()
        }
    }
}
