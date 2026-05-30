package com.dsg.agent.automation

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

data class ScheduledTask(
    val id: String,
    val prompt: String,
    val intervalMinutes: Int,
    val enabled: Boolean,
    val nextRunAt: Long,
    val lastRunAt: Long,
)

class ScheduledTaskStore(private val ctx: Context) {
    private val prefs = ctx.getSharedPreferences("dsg_scheduler", Context.MODE_PRIVATE)

    fun add(task: ScheduledTask) {
        val all = list().toMutableList()
        all.add(task)
        save(all)
    }

    fun list(): List<ScheduledTask> {
        val raw = prefs.getString(KEY, "[]") ?: "[]"
        val array = runCatching { JSONArray(raw) }.getOrDefault(JSONArray())
        return (0 until array.length()).mapNotNull { i ->
            runCatching {
                val obj = array.getJSONObject(i)
                ScheduledTask(
                    id = obj.getString("id"),
                    prompt = obj.getString("prompt"),
                    intervalMinutes = obj.getInt("intervalMinutes"),
                    enabled = obj.getBoolean("enabled"),
                    nextRunAt = obj.getLong("nextRunAt"),
                    lastRunAt = obj.getLong("lastRunAt"),
                )
            }.getOrNull()
        }
    }

    fun update(id: String, transform: (ScheduledTask) -> ScheduledTask) {
        save(list().map { if (it.id == id) transform(it) else it })
    }

    fun delete(id: String) {
        cancelAlarm(id)
        save(list().filter { it.id != id })
    }

    fun scheduleAll() = list().filter { it.enabled }.forEach { scheduleTask(it) }

    fun scheduleTask(task: ScheduledTask) {
        val alarmManager = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val pending = pendingFor(task.id, task.prompt)
        val intervalMs = task.intervalMinutes * 60_000L
        if (intervalMs > 0) {
            alarmManager.setRepeating(AlarmManager.RTC_WAKEUP, task.nextRunAt, intervalMs, pending)
        } else {
            alarmManager.set(AlarmManager.RTC_WAKEUP, task.nextRunAt, pending)
        }
    }

    private fun cancelAlarm(id: String) {
        val alarmManager = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(ctx, SchedulerReceiver::class.java)
        val pending = PendingIntent.getBroadcast(ctx, id.hashCode(), intent,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE)
        if (pending != null) alarmManager.cancel(pending)
    }

    private fun pendingFor(id: String, prompt: String): PendingIntent {
        val intent = Intent(ctx, SchedulerReceiver::class.java).apply {
            putExtra("taskId", id)
            putExtra("prompt", prompt)
        }
        return PendingIntent.getBroadcast(ctx, id.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    private fun save(tasks: List<ScheduledTask>) {
        val array = JSONArray()
        tasks.forEach { t ->
            array.put(JSONObject()
                .put("id", t.id).put("prompt", t.prompt)
                .put("intervalMinutes", t.intervalMinutes).put("enabled", t.enabled)
                .put("nextRunAt", t.nextRunAt).put("lastRunAt", t.lastRunAt))
        }
        prefs.edit().putString(KEY, array.toString()).apply()
    }

    companion object {
        private const val KEY = "tasks"
        fun newId(): String = UUID.randomUUID().toString()
    }
}
