package com.dsg.agent.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.IBinder
import com.dsg.agent.DsgConfig

class AgentForegroundService : Service() {
    override fun onCreate() {
        super.onCreate()
        ensureChannel()
        startForeground(DsgConfig.NOTIFICATION_ID, buildNotification("DSG Agent running — owner-device mode"))
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(DsgConfig.NOTIFICATION_ID, buildNotification("DSG Agent active. Open app to review or stop."))
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun ensureChannel() {
        val manager = getSystemService(NotificationManager::class.java)
        val channel = NotificationChannel(
            DsgConfig.NOTIFICATION_CHANNEL_ID,
            "DSG Agent Status",
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = "Visible status for the DSG owner-device automation agent."
        }
        manager.createNotificationChannel(channel)
    }

    private fun buildNotification(text: String): Notification {
        return Notification.Builder(this, DsgConfig.NOTIFICATION_CHANNEL_ID)
            .setContentTitle("DSG Agent")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setOngoing(true)
            .build()
    }
}
