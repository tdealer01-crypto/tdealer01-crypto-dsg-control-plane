package com.dsg.agent.automation

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

class AgentCommandStore(context: Context) {
    private val prefs = context.getSharedPreferences("dsg_agent_commands", Context.MODE_PRIVATE)

    fun add(command: AgentCommand) {
        val existing = listAll().filterNot { it.idempotencyKey == command.idempotencyKey && !it.isExpired() }
        saveAll(existing + command)
    }

    fun listAll(): List<AgentCommand> {
        val raw = prefs.getString(KEY_COMMANDS, "[]") ?: "[]"
        val array = JSONArray(raw)
        return (0 until array.length()).mapNotNull { index ->
            runCatching { AgentCommand.fromJson(array.getJSONObject(index)) }.getOrNull()
        }
    }

    fun listPending(): List<AgentCommand> = listAll().filter { it.state == CommandState.PENDING && !it.isExpired() }

    fun markApproved(commandId: String, signature: ApprovalSignature) = update(commandId) { it.withApproval(signature) }
    fun markRejected(commandId: String) = update(commandId) { it.withState(CommandState.REJECTED) }
    fun markBlocked(commandId: String, message: String) = update(commandId) { it.withState(CommandState.BLOCKED, "POLICY_OR_PERMISSION_BLOCKED", message) }
    fun markWaitingPermission(commandId: String, message: String) = update(commandId) { it.withState(CommandState.WAITING_PERMISSION, "PERMISSION_REQUIRED", message) }
    fun markExecuted(commandId: String) = update(commandId) { it.withState(CommandState.EXECUTED) }
    fun markFailed(commandId: String, code: String, message: String) = update(commandId) { it.withState(CommandState.FAILED, code, message) }

    fun clearPending(): Int {
        val all = listAll()
        val pending = all.filter { it.state == CommandState.PENDING }
        saveAll(all.filterNot { it.state == CommandState.PENDING })
        return pending.size
    }

    fun pruneExpired(now: Long = System.currentTimeMillis()): Int {
        val all = listAll()
        val active = all.filterNot { it.isExpired(now) && it.state == CommandState.PENDING }
        saveAll(active)
        return all.size - active.size
    }

    private fun update(commandId: String, transform: (AgentCommand) -> AgentCommand) {
        saveAll(listAll().map { if (it.commandId == commandId) transform(it) else it })
    }

    private fun saveAll(commands: List<AgentCommand>) {
        val array = JSONArray()
        commands.forEach { array.put(it.toJson()) }
        prefs.edit().putString(KEY_COMMANDS, array.toString()).apply()
    }

    companion object {
        private const val KEY_COMMANDS = "commands"
    }
}

class AuditLogStore(context: Context) {
    private val prefs = context.getSharedPreferences("dsg_agent_audit", Context.MODE_PRIVATE)

    fun append(eventType: String, commandId: String, message: String, errorCode: String? = null) {
        val prevHash = latestHash()
        val event = JSONObject()
            .put("eventId", "evt_${System.currentTimeMillis()}")
            .put("eventType", eventType)
            .put("commandId", commandId)
            .put("message", message)
            .put("errorCode", errorCode)
            .put("prevHash", prevHash)
            .put("timestamp", System.currentTimeMillis())
        val eventHash = AgentCommand.sha256(event.toString())
        event.put("eventHash", eventHash)
        val array = readArray()
        array.put(event)
        prefs.edit().putString(KEY_AUDIT, array.toString()).putString(KEY_LATEST_HASH, eventHash).apply()
    }

    fun tail(limit: Int): String {
        val array = readArray()
        val start = maxOf(0, array.length() - limit)
        return (start until array.length()).joinToString("\n\n") { index ->
            val item = array.getJSONObject(index)
            "${item.optString("eventType")} [${item.optString("commandId")}]\n${item.optString("message")}\nhash=${item.optString("eventHash")}"
        }
    }

    private fun latestHash(): String = prefs.getString(KEY_LATEST_HASH, "GENESIS") ?: "GENESIS"

    private fun readArray(): JSONArray {
        val raw = prefs.getString(KEY_AUDIT, "[]") ?: "[]"
        return JSONArray(raw)
    }

    companion object {
        private const val KEY_AUDIT = "audit"
        private const val KEY_LATEST_HASH = "latestHash"
    }
}
