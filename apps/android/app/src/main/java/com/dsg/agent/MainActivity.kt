package com.dsg.agent

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
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
import com.dsg.agent.automation.OwnerApprovalSigner
import com.dsg.agent.automation.PermissionGate
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

    private var fileListRendered = false

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
            setPadding(dp(18), dp(18), dp(18), dp(28))
            setBackgroundColor(COLOR_BG)
        }

        addHero(root)
        addTabs(root)
        addServiceCard(root)
        addFullFileManagerCard(root)
        addCommandInbox(root)
        addAuditLog(root)

        setContentView(ScrollView(this).apply {
            setBackgroundColor(COLOR_BG)
            addView(root)
        })
        refreshUi()
    }

    private fun addHero(root: LinearLayout) {
        val hero = card(COLOR_SURFACE_DARK, stroke = COLOR_PRIMARY_SOFT).apply {
            setPadding(dp(18), dp(18), dp(18), dp(18))
        }

        val top = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        top.addView(TextView(this).apply {
            text = "⚡"
            textSize = 26f
            gravity = Gravity.CENTER
            setTextColor(Color.WHITE)
            background = rounded(COLOR_PRIMARY, 14)
        }, LinearLayout.LayoutParams(dp(48), dp(48)))

        top.addView(LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(12), 0, 0, 0)
            addView(TextView(this@MainActivity).apply {
                text = "DSG Agent"
                textSize = 28f
                typeface = Typeface.DEFAULT_BOLD
                setTextColor(Color.WHITE)
            })
            addView(TextView(this@MainActivity).apply {
                text = "Owner-approved Android automation"
                textSize = 13f
                setTextColor(COLOR_TEXT_MUTED_DARK)
            })
        }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))

        top.addView(statusPill("AUDIT ON", true))
        hero.addView(top)

        hero.addView(TextView(this).apply {
            text = "Commands enter an inbox first. Approval is bound to the exact digest by Android Keystore before execution."
            textSize = 14f
            setTextColor(COLOR_TEXT_SOFT_DARK)
            setPadding(0, dp(16), 0, dp(14))
        })

        statusView = TextView(this).apply {
            text = buildStatusText()
            textSize = 12f
            setTextColor(COLOR_TEXT_SOFT_DARK)
            background = rounded(COLOR_SURFACE_DARK_2, 14, COLOR_BORDER_DARK, 1)
            setPadding(dp(14), dp(12), dp(14), dp(12))
        }
        hero.addView(statusView)
        addWithMargin(root, hero, bottom = 12)
    }

    private fun addTabs(root: LinearLayout) {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        row.addView(tab("📁 Files", true))
        row.addView(tab("🛠 Skills", false))
        row.addView(tab("📋 Logs", false))
        row.addView(tab("💬 Chat", false))
        addWithMargin(root, row, bottom = 12)
    }

    private fun addServiceCard(root: LinearLayout) {
        val card = card().apply { setPadding(dp(16), dp(16), dp(16), dp(16)) }
        card.addView(sectionHeader("Gateway & Permissions", "Live device gates"))

        val grid = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
        }
        grid.addView(actionButton("Start Agent Service", "Foreground worker", ButtonTone.PRIMARY) {
            startForegroundService(Intent(this@MainActivity, AgentForegroundService::class.java))
            auditLogStore.append("SERVICE_START_REQUESTED", "local", "Foreground service start requested")
            refreshUi("Foreground service start requested")
        })
        grid.addView(actionButton("Stop Agent Service", "Safe shutdown", ButtonTone.SECONDARY) {
            stopService(Intent(this@MainActivity, AgentForegroundService::class.java))
            auditLogStore.append("SERVICE_STOP_REQUESTED", "local", "Foreground service stop requested")
            refreshUi("Foreground service stop requested")
        })
        grid.addView(actionButton("Open Accessibility Permission", "Back / Home / Scroll gate", ButtonTone.SECONDARY) {
            auditLogStore.append("OPEN_PERMISSION_SCREEN", "local", "Accessibility settings opened by owner")
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
        })
        grid.addView(actionButton("Open Notification Listener Permission", "Notification summary gate", ButtonTone.SECONDARY) {
            auditLogStore.append("OPEN_PERMISSION_SCREEN", "local", "Notification listener settings opened by owner")
            startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
        })
        grid.addView(actionButton("Open DSG Status API", "Verify backend", ButtonTone.SECONDARY) {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(DsgConfig.STATUS_URL)))
        })
        grid.addView(actionButton("Open Bridge Manifest", "OpenClaw mapping", ButtonTone.SECONDARY) {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(DsgConfig.OPENCLAW_URL)))
        })
        card.addView(grid)
        addWithMargin(root, card, bottom = 12)
    }

    private fun addFullFileManagerCard(root: LinearLayout) {
        val fmCard = card().apply { setPadding(dp(16), dp(16), dp(16), dp(16)) }
        fmCard.addView(sectionHeader("Full File Manager Mode", "Owner-approved all-files access"))

        fmCard.addView(TextView(this).apply {
            text = "High-risk mode. Android Settings must grant All files access manually. Every file action still goes through inbox approval, Keystore signing, permission gate, and audit."
            textSize = 13f
            setTextColor(COLOR_TEXT_MUTED)
            setPadding(0, 0, 0, dp(12))
        })

        val storageCard = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = rounded(COLOR_ACCENT_SOFT, 18, COLOR_ACCENT_BORDER, 1)
            setPadding(dp(14), dp(14), dp(14), dp(14))
            addView(TextView(this@MainActivity).apply {
                text = "☁️ Claw File Workspace"
                textSize = 16f
                typeface = Typeface.DEFAULT_BOLD
                setTextColor(COLOR_TEXT)
            })
            addView(TextView(this@MainActivity).apply {
                text = "40 GB cloud target • local selection first • sensitive files blocked by policy"
                textSize = 12f
                setTextColor(COLOR_TEXT_MUTED)
                setPadding(0, dp(4), 0, dp(10))
            })
            addView(View(this@MainActivity).apply {
                background = rounded(COLOR_PRIMARY, 6)
            }, LinearLayout.LayoutParams(dp(132), dp(8)))
        }
        addWithMargin(fmCard, storageCard, bottom = 12)

        fmCard.addView(actionButton("Open Full File Manager Permission", "Android All files access", ButtonTone.WARNING) {
            auditLogStore.append("FILE_PERMISSION_REQUESTED", "local", "Owner opened All files access settings")
            val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION).apply {
                data = Uri.parse("package:$packageName")
            }
            runCatching { startActivity(intent) }.getOrElse {
                startActivity(Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION))
            }
        })
        fmCard.addView(actionButton("Queue file command: list shared storage", "Requires approval + all-files gate", ButtonTone.PRIMARY) {
            queueDemoCommand(
                AgentCommandType.FILE_LIST_ROOT,
                FullFileManager.rootPath().absolutePath,
                "Owner requested a full-file-manager listing of shared storage root",
            )
        })
        fmCard.addView(actionButton("Queue file command: send selected files to Claw", "Creates approved file workflow", ButtonTone.SECONDARY) {
            queueDemoCommand(
                AgentCommandType.FILE_SEND_TO_CLAW,
                "selected-files://local-demo",
                "Owner requested selected files to be sent to Claw after review",
            )
        })
        fmCard.addView(actionButton("Queue file command: delete sensitive test file", "Should be blocked in MVP", ButtonTone.DANGER) {
            queueDemoCommand(
                AgentCommandType.FILE_DELETE,
                "/sdcard/Download/api_keys.env",
                "Owner requested delete test for a sensitive file. This must be blocked by policy in MVP.",
            )
        })

        filePreviewView = TextView(this).apply {
            text = "No file listing yet. Queue and approve FILE_LIST_ROOT after enabling permission."
            textSize = 12f
            setTextColor(COLOR_TEXT_MUTED)
            background = rounded(COLOR_BG, 16, COLOR_BORDER, 1)
            setPadding(dp(14), dp(12), dp(14), dp(12))
        }
        addWithMargin(fmCard, filePreviewView, top = 8, bottom = 0)
        addWithMargin(root, fmCard, bottom = 12)
    }

    private fun addCommandInbox(root: LinearLayout) {
        val card = card().apply { setPadding(dp(16), dp(16), dp(16), dp(16)) }
        card.addView(sectionHeader("Command Inbox", "Approve before execution"))

        val demoRow = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        demoRow.addView(actionButton("Queue demo: open_url", "Visible browser action", ButtonTone.SECONDARY) {
            queueDemoCommand(
                AgentCommandType.OPEN_URL,
                DsgConfig.STATUS_URL,
                "Open DSG status page for visible owner verification",
            )
        })
        demoRow.addView(actionButton("Queue demo: open_app settings", "Open Android Settings", ButtonTone.SECONDARY) {
            queueDemoCommand(
                AgentCommandType.OPEN_APP,
                "com.android.settings",
                "Open Android Settings package for owner-approved setup",
            )
        })
        demoRow.addView(actionButton("Queue demo: back", "Accessibility-gated", ButtonTone.SECONDARY) {
            queueDemoCommand(AgentCommandType.BACK, "GLOBAL_BACK", "Run Android Back through Accessibility after owner approval")
        })
        demoRow.addView(actionButton("Queue demo: home", "Accessibility-gated", ButtonTone.SECONDARY) {
            queueDemoCommand(AgentCommandType.HOME, "GLOBAL_HOME", "Run Android Home through Accessibility after owner approval")
        })
        demoRow.addView(actionButton("Queue demo: scroll down", "Accessibility-gated", ButtonTone.SECONDARY) {
            queueDemoCommand(AgentCommandType.SCROLL_DOWN, "FOCUSED_OR_ROOT_NODE", "Run one scroll down through Accessibility after owner approval")
        })
        demoRow.addView(actionButton("Kill Switch: Clear Pending Commands", "Owner emergency stop", ButtonTone.DANGER) {
            val count = commandStore.clearPending()
            auditLogStore.append("KILL_SWITCH_CLEAR_PENDING", "local", "Owner cleared $count pending command(s)")
            refreshUi("Kill switch cleared $count pending command(s)")
        })
        card.addView(demoRow)

        commandListView = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, dp(10), 0, 0)
        }
        card.addView(commandListView)
        addWithMargin(root, card, bottom = 12)
    }

    private fun addAuditLog(root: LinearLayout) {
        val card = card().apply { setPadding(dp(16), dp(16), dp(16), dp(16)) }
        card.addView(sectionHeader("Local Audit Log", "Hash-chained device evidence"))
        auditView = TextView(this).apply {
            textSize = 12f
            setTextColor(COLOR_TEXT_MUTED)
            background = rounded(COLOR_BG, 16, COLOR_BORDER, 1)
            setPadding(dp(14), dp(12), dp(14), dp(12))
        }
        card.addView(auditView)
        addWithMargin(root, card, bottom = 0)
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
        if (::filePreviewView.isInitialized && permissionGate.isFullFileManagerEnabled() && !fileListRendered) {
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
                textSize = 13f
                setTextColor(COLOR_TEXT_MUTED)
                setPadding(0, dp(8), 0, 0)
            })
            return
        }

        pending.forEach { command ->
            val item = card(COLOR_CARD_ALT, radius = 18, stroke = COLOR_BORDER).apply {
                setPadding(dp(14), dp(14), dp(14), dp(14))
            }
            item.addView(TextView(this).apply {
                text = command.type.name
                textSize = 15f
                typeface = Typeface.DEFAULT_BOLD
                setTextColor(COLOR_TEXT)
            })
            item.addView(TextView(this).apply {
                text = command.toHumanText()
                textSize = 12f
                setTextColor(COLOR_TEXT_MUTED)
                setPadding(0, dp(8), 0, dp(10))
            })

            val actionRow = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
            }
            actionRow.addView(compactButton("Approve", ButtonTone.PRIMARY) { approveCommand(command) })
            actionRow.addView(compactButton("Reject", ButtonTone.SECONDARY) {
                commandStore.markRejected(command.commandId)
                auditLogStore.append("COMMAND_REJECTED", command.commandId, "Owner rejected ${command.type.name}")
                refreshUi("Rejected ${command.type.name}")
            })
            item.addView(actionRow)
            addWithMargin(commandListView, item, bottom = 10)
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
                fileListRendered = true
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
            "Mode: owner-device • permission-first • signed approval • audit-required",
            "Accessibility: ${permissionGate.isAccessibilityEnabled()}",
            "Notifications: ${permissionGate.isNotificationListenerEnabled()}",
            "Full file manager: ${permissionGate.isFullFileManagerEnabled()}",
            "Actions: open_url, open_app, back, home, scroll, file_list_root, file_send_to_claw",
            "Pending: ${commandStore.listPending().size}",
            extra,
        ).joinToString("\n")
    }

    private fun sectionHeader(title: String, subtitle: String): View {
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, 0, 0, dp(12))
            addView(TextView(this@MainActivity).apply {
                text = title
                textSize = 20f
                typeface = Typeface.DEFAULT_BOLD
                setTextColor(COLOR_TEXT)
            })
            addView(TextView(this@MainActivity).apply {
                text = subtitle
                textSize = 12f
                setTextColor(COLOR_TEXT_MUTED)
                setPadding(0, dp(2), 0, 0)
            })
        }
    }

    private fun actionButton(title: String, subtitle: String, tone: ButtonTone, onClick: () -> Unit): View {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            background = rounded(buttonBg(tone), 16, buttonBorder(tone), 1)
            setPadding(dp(14), dp(12), dp(14), dp(12))
            setOnClickListener { onClick() }
        }
        row.addView(TextView(this).apply {
            text = buttonIcon(tone)
            textSize = 20f
            gravity = Gravity.CENTER
        }, LinearLayout.LayoutParams(dp(34), dp(34)))
        row.addView(LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(10), 0, 0, 0)
            addView(TextView(this@MainActivity).apply {
                text = title
                textSize = 14f
                typeface = Typeface.DEFAULT_BOLD
                setTextColor(if (tone == ButtonTone.PRIMARY) Color.WHITE else COLOR_TEXT)
            })
            addView(TextView(this@MainActivity).apply {
                text = subtitle
                textSize = 11f
                setTextColor(if (tone == ButtonTone.PRIMARY) COLOR_TEXT_SOFT_DARK else COLOR_TEXT_MUTED)
            })
        }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        addBottomMargin(row, 10)
        return row
    }

    private fun compactButton(textValue: String, tone: ButtonTone, onClick: () -> Unit): Button {
        return Button(this).apply {
            text = textValue
            textSize = 12f
            isAllCaps = false
            setTextColor(if (tone == ButtonTone.PRIMARY) Color.WHITE else COLOR_TEXT)
            background = rounded(buttonBg(tone), 14, buttonBorder(tone), 1)
            setOnClickListener { onClick() }
            val lp = LinearLayout.LayoutParams(0, dp(44), 1f)
            lp.setMargins(0, 0, dp(8), 0)
            layoutParams = lp
        }
    }

    private fun tab(label: String, active: Boolean): TextView {
        return TextView(this).apply {
            text = label
            textSize = 13f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            setTextColor(if (active) Color.WHITE else COLOR_TEXT_MUTED)
            background = rounded(if (active) COLOR_PRIMARY else COLOR_CARD, 22, if (active) COLOR_PRIMARY else COLOR_BORDER, 1)
            val lp = LinearLayout.LayoutParams(0, dp(42), 1f)
            lp.setMargins(0, 0, dp(8), 0)
            layoutParams = lp
        }
    }

    private fun statusPill(label: String, ok: Boolean): TextView {
        return TextView(this).apply {
            text = label
            textSize = 11f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            setTextColor(if (ok) COLOR_GREEN else COLOR_RED)
            background = rounded(if (ok) COLOR_GREEN_SOFT else COLOR_RED_SOFT, 18, if (ok) COLOR_GREEN_BORDER else COLOR_RED_BORDER, 1)
            setPadding(dp(10), dp(6), dp(10), dp(6))
        }
    }

    private fun card(color: Int = COLOR_CARD, radius: Int = 24, stroke: Int = COLOR_BORDER): LinearLayout {
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = rounded(color, radius, stroke, 1)
        }
    }

    private fun rounded(color: Int, radius: Int, strokeColor: Int? = null, strokeWidth: Int = 0): GradientDrawable {
        return GradientDrawable().apply {
            setColor(color)
            cornerRadius = dp(radius).toFloat()
            if (strokeColor != null && strokeWidth > 0) setStroke(dp(strokeWidth), strokeColor)
        }
    }

    private fun addWithMargin(parent: LinearLayout, child: View, top: Int = 0, bottom: Int = 0) {
        val lp = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        lp.setMargins(0, dp(top), 0, dp(bottom))
        parent.addView(child, lp)
    }

    private fun addBottomMargin(view: View, bottom: Int) {
        view.layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
            setMargins(0, 0, 0, dp(bottom))
        }
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    private fun buttonBg(tone: ButtonTone): Int = when (tone) {
        ButtonTone.PRIMARY -> COLOR_PRIMARY
        ButtonTone.SECONDARY -> COLOR_CARD_ALT
        ButtonTone.WARNING -> COLOR_WARNING_SOFT
        ButtonTone.DANGER -> COLOR_RED_SOFT
    }

    private fun buttonBorder(tone: ButtonTone): Int = when (tone) {
        ButtonTone.PRIMARY -> COLOR_PRIMARY
        ButtonTone.SECONDARY -> COLOR_BORDER
        ButtonTone.WARNING -> COLOR_WARNING_BORDER
        ButtonTone.DANGER -> COLOR_RED_BORDER
    }

    private fun buttonIcon(tone: ButtonTone): String = when (tone) {
        ButtonTone.PRIMARY -> "🚀"
        ButtonTone.SECONDARY -> "›"
        ButtonTone.WARNING -> "⚠️"
        ButtonTone.DANGER -> "⛔"
    }

    private enum class ButtonTone { PRIMARY, SECONDARY, WARNING, DANGER }

    companion object {
        private const val COLOR_BG = 0xFFF5F6FA.toInt()
        private const val COLOR_CARD = 0xFFFFFFFF.toInt()
        private const val COLOR_CARD_ALT = 0xFFF3F4F8.toInt()
        private const val COLOR_BORDER = 0xFFE3E5ED.toInt()
        private const val COLOR_TEXT = 0xFF171821.toInt()
        private const val COLOR_TEXT_MUTED = 0xFF707486.toInt()
        private const val COLOR_PRIMARY = 0xFF5B5FEF.toInt()
        private const val COLOR_PRIMARY_SOFT = 0xFF8387FF.toInt()
        private const val COLOR_ACCENT_SOFT = 0xFFEFF7FF.toInt()
        private const val COLOR_ACCENT_BORDER = 0xFFB7DBFF.toInt()
        private const val COLOR_WARNING_SOFT = 0xFFFFF7E8.toInt()
        private const val COLOR_WARNING_BORDER = 0xFFFFC66D.toInt()
        private const val COLOR_RED = 0xFFE23B3B.toInt()
        private const val COLOR_RED_SOFT = 0xFFFFECEC.toInt()
        private const val COLOR_RED_BORDER = 0xFFFFB5B5.toInt()
        private const val COLOR_GREEN = 0xFF0FA66B.toInt()
        private const val COLOR_GREEN_SOFT = 0xFFEAFBF3.toInt()
        private const val COLOR_GREEN_BORDER = 0xFFA7EACB.toInt()
        private const val COLOR_SURFACE_DARK = 0xFF111225.toInt()
        private const val COLOR_SURFACE_DARK_2 = 0xFF1C1E36.toInt()
        private const val COLOR_BORDER_DARK = 0xFF2F3358.toInt()
        private const val COLOR_TEXT_MUTED_DARK = 0xFFAEB2D5.toInt()
        private const val COLOR_TEXT_SOFT_DARK = 0xFFD6D8F6.toInt()
    }
}
