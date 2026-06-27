package com.dsg.agent.service

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

class DsgNotificationListenerService : NotificationListenerService() {
    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        val packageName = sbn?.packageName ?: return
        Log.i("DSGAgent", "Notification observed from allowed runtime permission channel: $packageName")
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        val packageName = sbn?.packageName ?: return
        Log.i("DSGAgent", "Notification removed from: $packageName")
    }
}
