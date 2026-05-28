package pics.dsg.openclaw

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class ApiClient {

    private val http = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    private val json = "application/json; charset=utf-8".toMediaType()

    data class ChatResult(
        val reply: String,
        val decision: String,
        val stamp: String,
    )

    suspend fun chat(
        serverUrl: String,
        sessionId: String,
        message: String,
        history: List<ChatMessage>,
        provider: String = "claude",
    ): ChatResult = withContext(Dispatchers.IO) {
        val historyJson = JSONArray().apply {
            history.takeLast(20).forEach { m ->
                put(JSONObject().put("role", m.role).put("content", m.content))
            }
        }

        val body = JSONObject()
            .put("session_id", sessionId)
            .put("message", message)
            .put("provider", provider)
            .put("history", historyJson)
            .toString()
            .toRequestBody(json)

        val req = Request.Builder()
            .url("$serverUrl/api/chat")
            .post(body)
            .build()

        val res = http.newCall(req).execute()
        val resBody = res.body?.string() ?: "{}"
        val obj = JSONObject(resBody)

        ChatResult(
            reply = obj.optString("reply", "⚠️ No response"),
            decision = obj.optString("decision", ""),
            stamp = obj.optString("stamp", ""),
        )
    }
}
