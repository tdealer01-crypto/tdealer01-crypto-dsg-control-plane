package com.dsg.agent.service

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent
import android.util.Log

class DsgAccessibilityService : AccessibilityService() {
    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.i("DSGAgent", "Accessibility service connected in owner-device mode")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        val packageName = event?.packageName?.toString() ?: return
        Log.i("DSGAgent", "Accessibility event from current visible app: $packageName")
    }

    override fun onInterrupt() {
        Log.i("DSGAgent", "Accessibility service interrupted")
    }
}
