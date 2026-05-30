package com.dsg.agent.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import com.dsg.agent.DsgConfig
import com.dsg.agent.automation.AgentBackendClient
import com.dsg.agent.automation.AgentCommandStore
import com.dsg.agent.automation.AuditLogStore

class AgentForegroundService : Service() {
    private val handler = Handler(Looper.getMainLooper())
    private val backendClient = AgentBackendClient()
    private lateinit var commandStore: AgentCommandStore
    private lateinit var auditLogStore: AuditLogStore
    private var isPolling = false

    private val pollRunnable = object : Runnable {
        override fun run() {
            pollOnce()
            if (isPolling) handler.postDelayed(this, POLL_INTERVAL_MS)
        }
    }

    override fun onCreate() {
        super.onCreate()
        commandStore = AgentCommandStore(this)
        auditLogStore = AuditLogStore(this)
        ensureChannel()
        startForeground(DsgConfig.NOTIFICATION_ID, buildNotification("DSG Agent running — backend queue sync enabled"))
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(DsgConfig.NOTIFICATION_ID, buildNotification("DSG Agent active. Polling backend queue; open app to approve."))
        if (!isPolling) {
            isPolling = true
            handler.post(pollRunnable)
        }
        return START_STICKY
    }

    override fun onDestroy() {
        isPolling = false
        handler.removeCallbacks(pollRunnable)
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun pollOnce() {
        Thread {
            runCatching {
                val remoteCommands = backendClient.poll(DsgConfig.DEFAULT_DEVICE_ID)
                var added = 0
                remoteCommands.forEach { command ->
                    commandStore.add(command)
                    added += 1
                    auditLogStore.append("BACKEND_COMMAND_SYNCED", command.commandId, "Synced ${command.type.name} from backend queue")
                }
                if (added > 0) {
                    val manager = getSystemService(NotificationManager::class.java)
                    manager?.notify(DsgConfig.NOTIFICATION_ID, buildNotification("$added backend command(s) waiting for owner approval."))
                }
            }.getOrElse { error ->
                auditLogStore.append("BACKEND_SYNC_FAILED", "backend", error.message ?: "Backend queue sync failed", "BACKEND_SYNC_FAILED")
            }
        }.start()
    }

    private fun ensureChannel() {
        val manager = getSystemService(NotificationManager::class.java)
        val channel = NotificationChannel(
            DsgConfig.NOTIFICATION_CHANNEL_ID,
            "DSG Agent Status",
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = "Visible status for the DSG owner-device automation agent."
        }
        manager?.createNotificationChannel(channel)
    }

    private fun buildNotification(text: String): Notification {
        return Notification.Builder(this, DsgConfig.NOTIFICATION_CHANNEL_ID)
            .setContentTitle("DSG Agent")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setOngoing(true)
            .build()
    }

    companion object {
        private const val POLL_INTERVAL_MS = 5000L
    }
}
