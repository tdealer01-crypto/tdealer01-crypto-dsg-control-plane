package com.dsg.agent.automation

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class SchedulerReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val taskId = intent.getStringExtra("taskId") ?: return
        val prompt = intent.getStringExtra("prompt") ?: return

        val memoryStore = MemoryStore(context)
        val auditLogStore = AuditLogStore(context)
        val scheduledTaskStore = ScheduledTaskStore(context)

        scheduledTaskStore.update(taskId) { it.copy(lastRunAt = System.currentTimeMillis()) }
        auditLogStore.append("SCHEDULER_TASK_FIRED", taskId, "Scheduled: $prompt")

        val memCtx = memoryStore.toContextBlock()
        val messages = listOf(DadBotMessage("user", prompt))

        DadBotClient().chat(messages, object : DadBotCallback {
            override fun onToken(text: String) {}
            override fun onCommand(type: AgentCommandType, target: String, reason: String) {
                auditLogStore.append("SCHEDULER_COMMAND", taskId, "${type.name}: $target — $reason")
            }
            override fun onDone() {
                auditLogStore.append("SCHEDULER_TASK_DONE", taskId, "Completed: $prompt")
            }
            override fun onError(message: String) {
                auditLogStore.append("SCHEDULER_TASK_ERROR", taskId, "Error: $message")
            }
        }, memCtx)
    }
}
