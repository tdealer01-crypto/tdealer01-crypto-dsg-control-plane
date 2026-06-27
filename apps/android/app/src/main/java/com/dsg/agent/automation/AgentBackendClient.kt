package com.dsg.agent.automation

import com.dsg.agent.DsgConfig
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class AgentBackendClient {
    fun poll(deviceId: String = "android.owner.default"): List<AgentCommand> {
        val url = URL("${DsgConfig.BASE_URL}/api/agent/commands?deviceId=$deviceId&includeDone=false")
        val connection = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 5000
            readTimeout = 5000
        }
        return try {
            val text = connection.inputStream.bufferedReader().use { it.readText() }
            val json = JSONObject(text)
            val items = json.optJSONArray("commands") ?: JSONArray()
            (0 until items.length()).mapNotNull { index ->
                runCatching { fromEnvelope(items.getJSONObject(index)) }.getOrNull()
            }
        } finally {
            connection.disconnect()
        }
    }

    fun sendEvent(command: AgentCommand, eventType: String, executionState: String, message: String, errorCode: String? = null) {
        val payload = JSONObject()
            .put("action", "device_event")
            .put("commandId", command.commandId)
            .put("eventType", eventType)
            .put("executionState", executionState)
            .put("message", message)
            .put("signatureDigest", command.approvalSignature?.commandDigest ?: command.commandDigest)
            .put("errorCode", errorCode)
        val url = URL("${DsgConfig.BASE_URL}/api/agent/commands")
        val connection = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 5000
            readTimeout = 5000
            doOutput = true
            setRequestProperty("content-type", "application/json")
        }
        try {
            OutputStreamWriter(connection.outputStream).use { writer -> writer.write(payload.toString()) }
            val code = connection.responseCode
            if (code >= 400) {
                connection.errorStream?.bufferedReader()?.use { it.readText() }
            } else {
                connection.inputStream.bufferedReader().use { it.readText() }
            }
        } finally {
            connection.disconnect()
        }
    }

    private fun fromEnvelope(envelope: JSONObject): AgentCommand {
        val tool = envelope.getJSONObject("tool").getString("name")
        val normalizedArgs = envelope.optJSONObject("normalizedArgs") ?: JSONObject()
        val policy = envelope.getJSONObject("policy")
        val targetValue = when {
            tool == "device.open_url" -> normalizedArgs.optString("url")
            tool == "device.open_app" -> normalizedArgs.optString("packageName")
            tool.startsWith("file.") -> normalizedArgs.optString("path", "/sdcard")
            else -> tool
        }
        val type = when (tool) {
            "device.status.get" -> AgentCommandType.STATUS
            "device.open_url" -> AgentCommandType.OPEN_URL
            "device.open_app" -> AgentCommandType.OPEN_APP
            "device.open_settings" -> AgentCommandType.OPEN_SETTINGS
            "ui.back" -> AgentCommandType.BACK
            "ui.home" -> AgentCommandType.HOME
            "ui.scroll" -> AgentCommandType.SCROLL_DOWN
            "device.notifications.summary" -> AgentCommandType.NOTIFICATION_SUMMARY
            "file.list_root" -> AgentCommandType.FILE_LIST_ROOT
            "file.preview" -> AgentCommandType.FILE_PREVIEW
            "file.select" -> AgentCommandType.FILE_SELECT
            "file.send_to_claw" -> AgentCommandType.FILE_SEND_TO_CLAW
            "file.rename" -> AgentCommandType.FILE_RENAME
            "file.move" -> AgentCommandType.FILE_MOVE
            "file.delete" -> AgentCommandType.FILE_DELETE
            else -> AgentCommandType.STATUS
        }
        val local = AgentCommand.create(
            source = "backend-queue",
            type = type,
            target = targetValue,
            reason = "Backend queued ${tool} for owner approval",
            requiresPermission = PermissionGate.requiredPermissionFor(type),
            requiresUserConfirm = true,
        )
        return local.copy(
            commandId = envelope.getString("commandId"),
            policyVersion = policy.optString("policyVersion", local.policyVersion),
            expiresAt = runCatching { java.time.Instant.parse(policy.getString("expiresAt")).toEpochMilli() }.getOrDefault(local.expiresAt),
        )
    }
}
