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
import com.dsg.agent.automation.FullFileManager
import com.dsg.agent.automation.PermissionGate
import com.dsg.agent.automation.OwnerApprovalSigner
import com.dsg.agent.service.AgentForegroundService

class MainActivity : Activity() {
    private lateinit var statusView: TextView
    private lateinit var commandListView: LinearLayout
    private lateinit var auditView: TextView
    private lateinit var filePreviewView: TextView

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

        root.addView(sectionTitle("Full File Manager Mode"))
        root.addView(TextView(this).apply {
            text = "High-risk mode. It requests Android All files access so this app can list and manage shared storage. The owner must open the Android settings screen and enable it manually. File operations still go through Command Inbox approval, Keystore signing, permission gate, and audit log."
            textSize = 14f
        })

        root.addView(Button(this).apply {
            text = "Open Full File Manager Permission"
            setOnClickListener {
                auditLogStore.append("FILE_PERMISSION_REQUESTED", "local", "Owner opened All files access settings")
                val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION).apply {
                    data = Uri.parse("package:$packageName")
                }
                runCatching { startActivity(intent) }.getOrElse {
                    startActivity(Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION))
                }
            }
        })

        root.addView(Button(this).apply {
            text = "Queue file command: list shared storage"
            setOnClickListener {
                queueDemoCommand(
                    AgentCommandType.FILE_LIST_ROOT,
                    FullFileManager.rootPath().absolutePath,
                    "Owner requested a full-file-manager listing of shared storage root",
                )
            }
        })

        root.addView(Button(this).apply {
            text = "Queue file command: send selected files to Claw"
            setOnClickListener {
                queueDemoCommand(
                    AgentCommandType.FILE_SEND_TO_CLAW,
                    "selected-files://local-demo",
                    "Owner requested selected files to be sent to Claw after review",
                )
            }
        })

        root.addView(Button(this).apply {
            text = "Queue file command: delete sensitive test file"
            setOnClickListener {
                queueDemoCommand(
                    AgentCommandType.FILE_DELETE,
                    "/sdcard/Download/api_keys.env",
                    "Owner requested delete test for a sensitive file. This must be blocked by policy in MVP.",
                )
            }
        })

        filePreviewView = TextView(this).apply {
            text = "No file listing yet."
            textSize = 12f
            setPadding(0, 12, 0, 12)
        }
        root.addView(filePreviewView)

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
            source = if (type.name.startsWith("FILE_")) "local-file-manager" else "local-demo",
            type = type,
            target = target,
            reason = reason,
            requiresPermission = PermissionGate.requiredPermissionFor(type),
            requiresUserConfirm = true,
        )
        commandStore.add(command)
        val eventType = if (type.name.startsWith("FILE_")) "FILE_ACTION_QUEUED" else "COMMAND_QUEUED"
        auditLogStore.append(eventType, command.commandId, "Queued ${command.type.name} digest=${command.commandDigest}")
        refreshUi("Queued ${command.type.name}")
    }

    private fun refreshUi(extra: String? = null) {
        statusView.text = buildStatusText(extra)
        if (::filePreviewView.isInitialized && permissionGate.isFullFileManagerEnabled()) {
            filePreviewView.text = "Full file manager permission enabled. Queue and approve list command to render files."
        }
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
        val policyBlock = filePolicyBlock(command)
        if (policyBlock != null) {
            commandStore.markBlocked(command.commandId, policyBlock)
            auditLogStore.append("FILE_ACTION_BLOCKED", command.commandId, policyBlock, AgentErrorCodes.FILE_SENSITIVE_REVIEW_REQUIRED)
            refreshUi(policyBlock)
            return
        }

        val gate = permissionGate.evaluate(command)
        if (!gate.allowed) {
            if (gate.errorCode == AgentErrorCodes.PERMISSION_REQUIRED) {
                commandStore.markWaitingPermission(command.commandId, gate.message)
            } else {
                commandStore.markBlocked(command.commandId, gate.message)
            }
            val eventType = if (command.type.name.startsWith("FILE_")) "FILE_ACTION_BLOCKED" else "COMMAND_BLOCKED"
            auditLogStore.append(eventType, command.commandId, gate.message, gate.errorCode)
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

        val approvedEvent = if (signed.type.name.startsWith("FILE_")) "FILE_ACTION_APPROVED" else "COMMAND_APPROVED"
        auditLogStore.append(approvedEvent, signed.commandId, "Owner approved signed digest=${signed.commandDigest}")
        commandStore.markApproved(signed.commandId, signed.approvalSignature!!)

        val result = executeCommand(signed)
        if (result.success) {
            commandStore.markExecuted(signed.commandId)
            val eventType = if (signed.type.name.startsWith("FILE_")) "FILE_ACTION_EXECUTED" else "COMMAND_EXECUTED"
            auditLogStore.append(eventType, signed.commandId, result.message)
        } else {
            commandStore.markFailed(signed.commandId, result.errorCode ?: "EXECUTION_FAILED", result.message)
            auditLogStore.append("COMMAND_FAILED", signed.commandId, result.message, result.errorCode)
        }
        refreshUi(result.message)
    }

    private fun filePolicyBlock(command: AgentCommand): String? {
        if (!command.type.name.startsWith("FILE_")) return null
        val lowered = command.target.lowercase()
        val isSecret = lowered.endsWith(".env") || lowered.contains("api_key") || lowered.contains("apikey") || lowered.contains("token") || lowered.contains("secret") || lowered.endsWith(".pem") || lowered.endsWith(".key")
        if (isSecret) return "Blocked sensitive file action for ${command.target}. Secret-like files require a future explicit sensitive-file approval sheet."
        if (command.type == AgentCommandType.FILE_DELETE) return "Delete is blocked in MVP. It requires a future destructive-action confirmation sheet."
        return null
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
            AgentCommandType.FILE_LIST_ROOT -> {
                val summary = FullFileManager.buildListSummary()
                filePreviewView.text = summary
                auditLogStore.append("FILE_LISTED", command.commandId, "Listed shared storage root")
                CommandExecutionResult(true, "Listed shared storage root")
            }
            AgentCommandType.FILE_PREVIEW -> CommandExecutionResult(true, "Preview action approved for ${command.target}")
            AgentCommandType.FILE_SELECT -> CommandExecutionResult(true, "Selected file ${command.target}")
            AgentCommandType.FILE_SEND_TO_CLAW -> CommandExecutionResult(true, "Queued selected files for Claw processing after owner approval")
            AgentCommandType.FILE_RENAME,
            AgentCommandType.FILE_MOVE -> CommandExecutionResult(false, "Rename/move executor is not enabled in this MVP", AgentErrorCodes.EXECUTOR_UNSUPPORTED)
            AgentCommandType.FILE_DELETE -> CommandExecutionResult(false, "Delete executor is blocked in this MVP", AgentErrorCodes.FILE_SENSITIVE_REVIEW_REQUIRED)
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
            "Full file manager enabled: ${permissionGate.isFullFileManagerEnabled()}",
            "Enabled actions v1: status, open_url, open_settings, open_app, back, home, scroll_down, file_list_root, file_send_to_claw",
            "Pending commands: ${commandStore.listPending().size}",
            extra,
        ).joinToString("\n")
    }
}
