package com.dsg.agent.automation

import android.accessibilityservice.AccessibilityService
import android.content.ComponentName
import android.content.Context
import android.provider.Settings
import android.text.TextUtils
import com.dsg.agent.service.DsgAccessibilityService

object AgentErrorCodes {
    const val APPROVAL_SIGNATURE_INVALID = "APPROVAL_SIGNATURE_INVALID"
    const val COMMAND_EXPIRED = "COMMAND_EXPIRED"
    const val PERMISSION_REQUIRED = "PERMISSION_REQUIRED"
    const val PERMISSION_REVOKED_MID_FLIGHT = "PERMISSION_REVOKED_MID_FLIGHT"
    const val ACCESSIBILITY_SERVICE_NOT_CONNECTED = "ACCESSIBILITY_SERVICE_NOT_CONNECTED"
    const val EXECUTOR_UNSUPPORTED = "EXECUTOR_UNSUPPORTED"
}

data class GateResult(val allowed: Boolean, val message: String, val errorCode: String? = null)

class PermissionGate(private val context: Context) {
    fun evaluate(command: AgentCommand): GateResult {
        if (command.isExpired()) {
            return GateResult(false, "Command expired before owner approval", AgentErrorCodes.COMMAND_EXPIRED)
        }
        val required = requiredPermissionFor(command.type)
        return when (required) {
            PERMISSION_NONE -> GateResult(true, "No runtime permission required")
            PERMISSION_ACCESSIBILITY -> if (isAccessibilityEnabled()) {
                GateResult(true, "Accessibility permission is enabled")
            } else {
                GateResult(false, "Accessibility permission is required for ${command.type.name}", AgentErrorCodes.PERMISSION_REQUIRED)
            }
            PERMISSION_NOTIFICATION_LISTENER -> if (isNotificationListenerEnabled()) {
                GateResult(true, "Notification listener permission is enabled")
            } else {
                GateResult(false, "Notification listener permission is required", AgentErrorCodes.PERMISSION_REQUIRED)
            }
            else -> GateResult(false, "Unsupported permission gate: $required", AgentErrorCodes.EXECUTOR_UNSUPPORTED)
        }
    }

    fun isAccessibilityEnabled(): Boolean {
        val expected = ComponentName(context, DsgAccessibilityService::class.java).flattenToString()
        val enabledServices = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES,
        ) ?: return false
        return enabledServices.split(':').any { it.equals(expected, ignoreCase = true) }
    }

    fun isNotificationListenerEnabled(): Boolean {
        val flat = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners") ?: return false
        val packageName = context.packageName
        return flat.split(':').any { component ->
            ComponentName.unflattenFromString(component)?.packageName == packageName
        }
    }

    companion object {
        const val PERMISSION_NONE = "none"
        const val PERMISSION_ACCESSIBILITY = "accessibility"
        const val PERMISSION_NOTIFICATION_LISTENER = "notification_listener"

        fun requiredPermissionFor(type: AgentCommandType): String = when (type) {
            AgentCommandType.STATUS,
            AgentCommandType.OPEN_URL,
            AgentCommandType.OPEN_SETTINGS,
            AgentCommandType.OPEN_APP -> PERMISSION_NONE
            AgentCommandType.BACK,
            AgentCommandType.HOME,
            AgentCommandType.SCROLL_DOWN -> PERMISSION_ACCESSIBILITY
            AgentCommandType.NOTIFICATION_SUMMARY -> PERMISSION_NOTIFICATION_LISTENER
        }
    }
}

object AccessibilityActionBridge {
    private var service: DsgAccessibilityService? = null

    fun attach(service: DsgAccessibilityService) {
        this.service = service
    }

    fun detach(service: DsgAccessibilityService) {
        if (this.service === service) this.service = null
    }

    fun performBack(): CommandExecutionResult = performGlobalAction(
        AccessibilityService.GLOBAL_ACTION_BACK,
        "Back action executed through owner-approved Accessibility service",
    )

    fun performHome(): CommandExecutionResult = performGlobalAction(
        AccessibilityService.GLOBAL_ACTION_HOME,
        "Home action executed through owner-approved Accessibility service",
    )

    fun performScrollDown(): CommandExecutionResult {
        val root = service?.rootInActiveWindow
            ?: return CommandExecutionResult(false, "Accessibility service lost active window before scroll", AgentErrorCodes.PERMISSION_REVOKED_MID_FLIGHT)
        val ok = root.performAction(android.view.accessibility.AccessibilityNodeInfo.ACTION_SCROLL_FORWARD)
        return if (ok) {
            CommandExecutionResult(true, "Scroll down action executed through owner-approved Accessibility service")
        } else {
            CommandExecutionResult(false, "Scroll down was not available on the active node", "SCROLL_NOT_AVAILABLE")
        }
    }

    private fun performGlobalAction(action: Int, successMessage: String): CommandExecutionResult {
        val active = service
            ?: return CommandExecutionResult(false, "Accessibility service disconnected before execution", AgentErrorCodes.PERMISSION_REVOKED_MID_FLIGHT)
        val ok = active.performGlobalAction(action)
        return if (ok) {
            CommandExecutionResult(true, successMessage)
        } else {
            CommandExecutionResult(false, "Accessibility global action returned false", AgentErrorCodes.ACCESSIBILITY_SERVICE_NOT_CONNECTED)
        }
    }
}
