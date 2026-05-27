package com.dsg.agent.service

import android.accessibilityservice.AccessibilityService
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import com.dsg.agent.automation.AccessibilityActionBridge

class DsgAccessibilityService : AccessibilityService() {
    override fun onServiceConnected() {
        super.onServiceConnected()
        AccessibilityActionBridge.attach(this)
        Log.i("DSGAgent", "Accessibility service connected in owner-device mode")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        val packageName = event?.packageName?.toString() ?: return
        Log.i("DSGAgent", "Accessibility event from current visible app: $packageName")
    }

    override fun onInterrupt() {
        Log.i("DSGAgent", "Accessibility service interrupted")
    }

    override fun onDestroy() {
        AccessibilityActionBridge.detach(this)
        super.onDestroy()
    }
}
