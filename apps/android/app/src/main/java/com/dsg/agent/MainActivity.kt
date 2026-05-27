package com.dsg.agent

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.core.app.ActivityCompat
import com.dsg.agent.automation.AccessibilityActionBridge
import com.dsg.agent.automation.AgentCommand
import com.dsg.agent.automation.AgentCommandStore
import com.dsg.agent.automation.AgentCommandType
import com.dsg.agent.automation.AgentErrorCodes
import com.dsg.agent.automation.AuditLogStore
import com.dsg.agent.automation.CommandExecutionResult
import com.dsg.agent.automation.PermissionGate
import com.dsg.agent.automation.OwnerApprovalSigner
import com.dsg.agent.service.AgentForegroundService

class MainActivity : Activity() {
    private lateinit var statusView: TextView
    private lateinit var commandListView: LinearLayout
    private lateinit var auditView: TextView

    private lateinit var commandStore: AgentCommandStore
    private lateinit var auditLogStore: AuditLogStore
    private lateinit var permissionGate: PermissionGate
    private lateinit var approvalSigner: OwnerApprovalSigner

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 10)
        commandStore = AgentCommandStore(this)
        auditLogStore = AuditLogStore(this)
        permissionGate = PermissionGate(this)
        approvalSigner = OwnerApprovalSigner()
        render()
    }

    override fun onResume() {
        super.onResume()
        if (::statusView.isInitialized) refreshUi("Permission state refreshed")
    }

    private fun render() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 32, 32, 32)
        }

        root.addView(TextView(this).apply {
            text = "DSG Agent"
            textSize = 28f
        })

        root.addView(TextView(this).apply {
            text = "Owner-device automation app. Commands enter an inbox first. Owner approval is bound to the exact command digest by Android Keystore signing before execution."
            textSize = 16f
        })

        statusView = TextView(this).apply {
            text = buildStatusText()
            textSize = 14f
            setPadding(0, 24, 0, 24)
        }
        root.addView(statusView)

        root.addView(Button(this).apply {
            text = "Start Agent Service"
            setOnClickListener {
                startForegroundService(Intent(this@MainActivity, AgentForegroundService::class.java))
                auditLogStore.append("SERVICE_START_REQUESTED", "local", "Foreground service start requested")
                refreshUi("Foreground service start requested")
            }
        })

        root.addView(Button(this).apply {
            text = "Stop Agent Service"
            setOnClickListener {
                stopService(Intent(this@MainActivity, AgentForegroundService::class.java))
                auditLogStore.append("SERVICE_STOP_REQUESTED", "local", "Foreground service stop requested")
                refreshUi("Foreground service stop requested")
            }
        })

        root.addView(Button(this).apply {
            text = "Open Accessibility Permission"
            setOnClickListener {
                auditLogStore.append("OPEN_PERMISSION_SCREEN", "local", "Accessibility settings opened by owner")
                startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
            }
        })

        root.addView(Button(this).apply {
            text = "Open Notification Listener Permission"
            setOnClickListener {
                auditLogStore.append("OPEN_PERMISSION_SCREEN", "local", "Notification listener settings opened by owner")
                startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
            }
        })

        root.addView(Button(this).apply {
            text = "Open DSG Status API"
            setOnClickListener { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(DsgConfig.STATUS_URL))) }
        })

        root.addView(Button(this).apply {
            text = "Open Bridge Manifest"
            setOnClickListener { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(DsgConfig.OPENCLAW_URL))) }
        })

        root.addView(sectionTitle("Local Command Inbox"))
        root.addView(TextView(this).apply {
            text = "Demo commands model Chat / CLI / MCP requests. No command runs until owner approves it here."
            textSize = 14f
        })

        root.addView(Button(this).apply {
            text = "Queue demo: open_url"
            setOnClickListener {
                queueDemoCommand(
                    AgentCommandType.OPEN_URL,
                    DsgConfig.STATUS_URL,
                    "Open DSG status page for visible owner verification",
                )
            }
        })

        root.addView(Button(this).apply {
            text = "Queue demo: open_app settings"
            setOnClickListener {
                queueDemoCommand(
                    AgentCommandType.OPEN_APP,
                    "com.android.settings",
                    "Open Android Settings package for owner-approved setup",
                )
            }
        })

        root.addView(Button(this).apply {
            text = "Queue demo: back"
            setOnClickListener { queueDemoCommand(AgentCommandType.BACK, "GLOBAL_BACK", "Run Android Back through Accessibility after owner approval") }
        })

        root.addView(Button(this).apply {
            text = "Queue demo: home"
            setOnClickListener { queueDemoCommand(AgentCommandType.HOME, "GLOBAL_HOME", "Run Android Home through Accessibility after owner approval") }
        })

        root.addView(Button(this).apply {
            text = "Queue demo: scroll down"
            setOnClickListener { queueDemoCommand(AgentCommandType.SCROLL_DOWN, "FOCUSED_OR_ROOT_NODE", "Run one scroll down through Accessibility after owner approval") }
        })

        root.addView(Button(this).apply {
            text = "Kill Switch: Clear Pending Commands"
            setOnClickListener {
                val count = commandStore.clearPending()
                auditLogStore.append("KILL_SWITCH_CLEAR_PENDING", "local", "Owner cleared $count pending command(s)")
                refreshUi("Kill switch cleared $count pending command(s)")
            }
        })

        commandListView = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, 16, 0, 16)
        }
        root.addView(commandListView)

        root.addView(sectionTitle("Local Audit Log"))
        auditView = TextView(this).apply { textSize = 12f }
        root.addView(auditView)

        setContentView(ScrollView(this).apply { addView(root) })
        refreshUi()
    }

    private fun sectionTitle(textValue: String): TextView = TextView(this).apply {
        text = textValue
        textSize = 20f
        setPadding(0, 32, 0, 8)
    }

    private fun queueDemoCommand(type: AgentCommandType, target: String, reason: String) {
        commandStore.pruneExpired()
        val command = AgentCommand.create(
            source = "local-demo",
            type = type,
            target = target,
            reason = reason,
            requiresPermission = PermissionGate.requiredPermissionFor(type),
            requiresUserConfirm = true,
        )
        commandStore.add(command)
        auditLogStore.append("COMMAND_QUEUED", command.commandId, "Queued ${command.type.name} digest=${command.commandDigest}")
        refreshUi("Queued ${command.type.name}")
    }

    private fun refreshUi(extra: String? = null) {
        statusView.text = buildStatusText(extra)
        renderCommands()
        renderAuditLog()
    }

    private fun renderCommands() {
        commandListView.removeAllViews()
        val pending = commandStore.listPending()
        if (pending.isEmpty()) {
            commandListView.addView(TextView(this).apply {
                text = "No pending commands."
                textSize = 14f
            })
            return
        }

        pending.forEach { command ->
            val card = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(0, 16, 0, 16)
            }
            card.addView(TextView(this).apply {
                text = command.toHumanText()
                textSize = 14f
            })

            val actionRow = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
            }
            actionRow.addView(Button(this).apply {
                text = "Approve"
                setOnClickListener { approveCommand(command) }
            })
            actionRow.addView(Button(this).apply {
                text = "Reject"
                setOnClickListener {
                    commandStore.markRejected(command.commandId)
                    auditLogStore.append("COMMAND_REJECTED", command.commandId, "Owner rejected ${command.type.name}")
                    refreshUi("Rejected ${command.type.name}")
                }
            })
            card.addView(actionRow)
            commandListView.addView(card)
        }
    }

    private fun approveCommand(command: AgentCommand) {
        val gate = permissionGate.evaluate(command)
        if (!gate.allowed) {
            if (gate.errorCode == AgentErrorCodes.PERMISSION_REQUIRED) {
                commandStore.markWaitingPermission(command.commandId, gate.message)
            } else {
                commandStore.markBlocked(command.commandId, gate.message)
            }
            auditLogStore.append("COMMAND_BLOCKED", command.commandId, gate.message, gate.errorCode)
            refreshUi("Blocked: ${gate.message}")
            return
        }

        val signed = runCatching { command.withApproval(approvalSigner.sign(command)) }.getOrElse { error ->
            val message = error.message ?: "Failed to sign owner approval"
            commandStore.markFailed(command.commandId, AgentErrorCodes.APPROVAL_SIGNATURE_INVALID, message)
            auditLogStore.append("COMMAND_FAILED", command.commandId, message, AgentErrorCodes.APPROVAL_SIGNATURE_INVALID)
            refreshUi(message)
            return
        }

        if (!approvalSigner.verify(signed)) {
            commandStore.markFailed(command.commandId, AgentErrorCodes.APPROVAL_SIGNATURE_INVALID, "Approval signature verification failed")
            auditLogStore.append("COMMAND_FAILED", command.commandId, "Approval signature verification failed", AgentErrorCodes.APPROVAL_SIGNATURE_INVALID)
            refreshUi("Approval signature verification failed")
            return
        }

        auditLogStore.append("COMMAND_APPROVED", signed.commandId, "Owner approved signed digest=${signed.commandDigest}")
        commandStore.markApproved(signed.commandId, signed.approvalSignature!!)

        val result = executeCommand(signed)
        if (result.success) {
            commandStore.markExecuted(signed.commandId)
            auditLogStore.append("COMMAND_EXECUTED", signed.commandId, result.message)
        } else {
            commandStore.markFailed(signed.commandId, result.errorCode ?: "EXECUTION_FAILED", result.message)
            auditLogStore.append("COMMAND_FAILED", signed.commandId, result.message, result.errorCode)
        }
        refreshUi(result.message)
    }

    private fun executeCommand(command: AgentCommand): CommandExecutionResult {
        if (!approvalSigner.verify(command)) {
            return CommandExecutionResult(false, "Executor refused unsigned or mutated command digest", AgentErrorCodes.APPROVAL_SIGNATURE_INVALID)
        }
        return when (command.type) {
            AgentCommandType.STATUS -> CommandExecutionResult(true, "Status command reviewed; app is running")
            AgentCommandType.OPEN_URL -> {
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(command.target)))
                CommandExecutionResult(true, "Opened URL visibly: ${command.target}")
            }
            AgentCommandType.OPEN_SETTINGS -> {
                startActivity(Intent(Settings.ACTION_SETTINGS))
                CommandExecutionResult(true, "Opened Android Settings visibly")
            }
            AgentCommandType.OPEN_APP -> {
                val launchIntent = packageManager.getLaunchIntentForPackage(command.target)
                if (launchIntent == null) CommandExecutionResult(false, "Package not launchable: ${command.target}", "PACKAGE_NOT_LAUNCHABLE")
                else {
                    startActivity(launchIntent)
                    CommandExecutionResult(true, "Opened app package visibly: ${command.target}")
                }
            }
            AgentCommandType.BACK -> AccessibilityActionBridge.performBack()
            AgentCommandType.HOME -> AccessibilityActionBridge.performHome()
            AgentCommandType.SCROLL_DOWN -> AccessibilityActionBridge.performScrollDown()
            AgentCommandType.NOTIFICATION_SUMMARY -> CommandExecutionResult(false, "Notification summary executor is not enabled in this MVP", AgentErrorCodes.EXECUTOR_UNSUPPORTED)
        }
    }

    private fun renderAuditLog() {
        auditView.text = auditLogStore.tail(20).ifEmpty { "No audit events yet." }
    }

    private fun buildStatusText(extra: String? = null): String {
        return listOfNotNull(
            "Backend: ${DsgConfig.BASE_URL}",
            "Mode: owner-device, permission-first, approval-signature-required, audit-required",
            "Accessibility enabled: ${permissionGate.isAccessibilityEnabled()}",
            "Notification listener enabled: ${permissionGate.isNotificationListenerEnabled()}",
            "Enabled actions v1: status, open_url, open_settings, open_app, back, home, scroll_down",
            "Pending commands: ${commandStore.listPending().size}",
            extra,
        ).joinToString("\n")
    }
}
