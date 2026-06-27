package com.dsg.agent.automation

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

data class MemoryEntry(val id: String, val content: String, val ts: Long)

class MemoryStore(ctx: Context) {
    private val prefs = ctx.getSharedPreferences("dsg_memory", Context.MODE_PRIVATE)

    fun add(content: String): MemoryEntry {
        val entry = MemoryEntry(UUID.randomUUID().toString(), content.trim(), System.currentTimeMillis())
        val array = readArray()
        array.put(JSONObject().put("id", entry.id).put("content", entry.content).put("ts", entry.ts))
        prefs.edit().putString(KEY, array.toString()).apply()
        return entry
    }

    fun list(): List<MemoryEntry> = (0 until readArray().length()).mapNotNull { i ->
        runCatching {
            val obj = readArray().getJSONObject(i)
            MemoryEntry(obj.getString("id"), obj.getString("content"), obj.getLong("ts"))
        }.getOrNull()
    }

    fun delete(id: String) {
        val remaining = list().filter { it.id != id }
        val array = JSONArray()
        remaining.forEach { e -> array.put(JSONObject().put("id", e.id).put("content", e.content).put("ts", e.ts)) }
        prefs.edit().putString(KEY, array.toString()).apply()
    }

    fun clear() = prefs.edit().putString(KEY, "[]").apply()

    fun toContextBlock(): String {
        val entries = list()
        if (entries.isEmpty()) return ""
        val lines = entries.joinToString("\n") { "- ${it.content}" }
        return "[ความจำ]\n$lines\n[/ความจำ]"
    }

    private fun readArray(): JSONArray {
        val raw = prefs.getString(KEY, "[]") ?: "[]"
        return runCatching { JSONArray(raw) }.getOrDefault(JSONArray())
    }

    companion object {
        private const val KEY = "memories"
    }
}
