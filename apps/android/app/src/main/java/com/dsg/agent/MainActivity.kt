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
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
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
import com.dsg.agent.automation.DadBotCallback
import com.dsg.agent.automation.DadBotClient
import com.dsg.agent.automation.DadBotMessage
import com.dsg.agent.automation.FullFileManager
import com.dsg.agent.automation.OwnerApprovalSigner
import com.dsg.agent.automation.PermissionGate
import com.dsg.agent.service.AgentForegroundService

class MainActivity : Activity() {
    private lateinit var statusView: TextView
    private lateinit var commandListView: LinearLayout
    private lateinit var auditView: TextView
    private lateinit var filePreviewView: TextView
    private lateinit var chatInput: EditText

    private lateinit var commandStore: AgentCommandStore
    private lateinit var auditLogStore: AuditLogStore
    private lateinit var permissionGate: PermissionGate
    private lateinit var approvalSigner: OwnerApprovalSigner

    private var fileListRendered = false
    private var workSessionEnabled = false
    private val dadBotMessages = mutableListOf<DadBotMessage>()
    private var dadBotTyping = false
    private lateinit var dadBotClient: DadBotClient
    private lateinit var dadBotMessageList: LinearLayout
    private lateinit var dadBotStreamView: TextView
    private lateinit var dadBotInput: EditText
    private var autonomousModeEnabled: Boolean
        get() = getSharedPreferences("dsg_prefs", MODE_PRIVATE).getBoolean("autonomous_mode", false)
        set(value) { getSharedPreferences("dsg_prefs", MODE_PRIVATE).edit().putBoolean("autonomous_mode", value).apply() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 10)
        commandStore = AgentCommandStore(this)
        auditLogStore = AuditLogStore(this)
        permissionGate = PermissionGate(this)
        approvalSigner = OwnerApprovalSigner()
        dadBotClient = DadBotClient()
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
        addAutonomousModeCard(root)
        addDadBotSection(root)
        addNoCodeChat(root)
        addWorkSessionCard(root)
        addFileManagerCard(root)
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
                text = "No-code work session agent"
                textSize = 13f
                setTextColor(COLOR_TEXT_MUTED_DARK)
            })
        }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        top.addView(statusPill("AUDIT ON", true))
        hero.addView(top)
        hero.addView(TextView(this).apply {
            text = "พิมพ์เป้าหมายงาน แล้วให้ Agent ทำงานต่อใน Work Session; งานที่ต้องใช้สิทธิ์ใหม่หรือกระทบไฟล์สำคัญจะหยุดให้ตรวจ"
            textSize = 14f
            setTextColor(COLOR_TEXT_SOFT_DARK)
            setPadding(0, dp(16), 0, dp(14))
        })
        statusView = TextView(this).apply {
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
        row.addView(tab("💬 Chat", true))
        row.addView(tab("📁 Files", false))
        row.addView(tab("🛠 Skills", false))
        row.addView(tab("📋 Logs", false))
        addWithMargin(root, row, bottom = 12)
    }

    private fun addNoCodeChat(root: LinearLayout) {
        val box = card().apply { setPadding(dp(16), dp(16), dp(16), dp(16)) }
        box.addView(sectionHeader("No-code Chat", "พิมพ์งานเดียว แล้วให้ Agent สร้างงานให้"))
        box.addView(TextView(this).apply {
            text = "ตัวอย่าง: ตรวจระบบให้ครบ, เปิด status, แสดงไฟล์, ส่งไฟล์ให้ Claw, เปิด settings, back, home, scroll"
            textSize = 12f
            setTextColor(COLOR_TEXT_MUTED)
            setPadding(0, 0, 0, dp(10))
        })
        chatInput = EditText(this).apply {
            hint = "พิมพ์เป้าหมายงาน เช่น ตรวจระบบให้ครบ"
            textSize = 14f
            minLines = 3
            maxLines = 5
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE
            setTextColor(COLOR_TEXT)
            setHintTextColor(COLOR_TEXT_MUTED)
            background = rounded(COLOR_BG, 18, COLOR_BORDER, 1)
            setPadding(dp(14), dp(12), dp(14), dp(12))
        }
        addWithMargin(box, chatInput, bottom = 10)
        val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        row.addView(compactButton("Run", ButtonTone.PRIMARY) { runNoCodePrompt() })
        row.addView(compactButton("Clear", ButtonTone.SECONDARY) { chatInput.setText("") })
        box.addView(row)
        addWithMargin(root, box, bottom = 12)
    }

    private fun addAutonomousModeCard(root: LinearLayout) {
        val card = card(if (autonomousModeEnabled) Color.parseColor("#1a2e1a") else COLOR_CARD_ALT,
            stroke = if (autonomousModeEnabled) Color.parseColor("#4ade80") else COLOR_BORDER).apply {
            setPadding(dp(16), dp(14), dp(16), dp(14))
        }
        card.addView(TextView(this).apply {
            text = if (autonomousModeEnabled) "⚡ AUTONOMOUS MODE — ON" else "🔒 Autonomous Mode — Off"
            textSize = 15f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(if (autonomousModeEnabled) Color.parseColor("#4ade80") else COLOR_TEXT_MUTED)
        })
        card.addView(TextView(this).apply {
            text = if (autonomousModeEnabled)
                "All commands execute instantly. No approval dialog. No file blocks. Permission gates bypassed."
            else
                "Enable to run all commands without approval popups, remove file restrictions, and bypass permission gates."
            textSize = 12f
            setTextColor(COLOR_TEXT_MUTED)
            setPadding(0, dp(4), 0, dp(10))
        })
        val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        if (autonomousModeEnabled) {
            row.addView(compactButton("Disable Autonomous Mode", ButtonTone.SECONDARY) {
                autonomousModeEnabled = false
                auditLogStore.append("AUTONOMOUS_MODE_DISABLED", "owner", "Owner disabled autonomous mode")
                render()
            })
        } else {
            row.addView(compactButton("Enable Autonomous Mode", ButtonTone.PRIMARY) {
                autonomousModeEnabled = true
                auditLogStore.append("AUTONOMOUS_MODE_ENABLED", "owner", "Owner enabled autonomous mode — all gates bypassed")
                render()
            })
        }
        card.addView(row)
        addWithMargin(root, card, bottom = 12)
    }

    private fun addDadBotSection(root: LinearLayout) {
        val box = card().apply { setPadding(dp(16), dp(16), dp(16), dp(16)) }
        val headerRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, 0, 0, dp(12))
        }
        headerRow.addView(TextView(this).apply {
            text = "🤖 DadBot"
            textSize = 20f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(COLOR_TEXT)
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
        })
        headerRow.addView(TextView(this).apply {
            text = "Haiku"
            textSize = 11f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(COLOR_PRIMARY)
            background = rounded(0xFFEEEFFF.toInt(), 10, COLOR_PRIMARY_SOFT, 1)
            setPadding(dp(8), dp(4), dp(8), dp(4))
        })
        box.addView(headerRow)

        dadBotMessageList = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, 0, 0, dp(8))
        }
        box.addView(dadBotMessageList)

        dadBotStreamView = TextView(this).apply {
            text = ""
            textSize = 13f
            setTextColor(COLOR_TEXT)
            background = rounded(0xFFEEEFFF.toInt(), 14, COLOR_PRIMARY_SOFT, 1)
            setPadding(dp(12), dp(10), dp(12), dp(10))
            visibility = View.GONE
        }
        addWithMargin(box, dadBotStreamView, bottom = 8)

        dadBotInput = EditText(this).apply {
            hint = "พิมพ์คำสั่ง เช่น เปิด YouTube, แสดงไฟล์"
            textSize = 14f
            maxLines = 3
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE
            setTextColor(COLOR_TEXT)
            setHintTextColor(COLOR_TEXT_MUTED)
            background = rounded(COLOR_BG, 16, COLOR_BORDER, 1)
            setPadding(dp(14), dp(10), dp(14), dp(10))
        }
        addWithMargin(box, dadBotInput, bottom = 8)

        val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        row.addView(compactButton("Send", ButtonTone.PRIMARY) { sendDadBotMessage() })
        row.addView(compactButton("Clear", ButtonTone.SECONDARY) {
            dadBotMessages.clear()
            dadBotMessageList.removeAllViews()
            dadBotInput.setText("")
        })
        box.addView(row)
        addWithMargin(root, box, bottom = 12)
    }

    private fun sendDadBotMessage() {
        val text = dadBotInput.text.toString().trim()
        if (text.isBlank() || dadBotTyping) return
        dadBotInput.setText("")
        dadBotMessages.add(DadBotMessage("user", text))
        appendDadBotBubble("You", text, COLOR_CARD_ALT)
        dadBotTyping = true
        dadBotStreamView.text = "..."
        dadBotStreamView.visibility = View.VISIBLE
        var streamBuffer = ""
        dadBotClient.chat(dadBotMessages.toList(), object : DadBotCallback {
            override fun onToken(token: String) {
                streamBuffer += token
                dadBotStreamView.text = streamBuffer
            }
            override fun onCommand(type: AgentCommandType, target: String, reason: String) {
                appendDadBotBubble("Action", "▶ ${type.name}: $target", 0xFFEAFBF3.toInt())
                queueCommand(type, target, "DadBot: $reason", "dadbot")
            }
            override fun onDone() {
                if (streamBuffer.isNotBlank()) {
                    dadBotMessages.add(DadBotMessage("assistant", streamBuffer))
                    appendDadBotBubble("DadBot", streamBuffer, COLOR_CARD)
                }
                dadBotStreamView.text = ""
                dadBotStreamView.visibility = View.GONE
                dadBotTyping = false
            }
            override fun onError(message: String) {
                appendDadBotBubble("Error", message, COLOR_RED_SOFT)
                dadBotStreamView.visibility = View.GONE
                dadBotTyping = false
            }
        })
    }

    private fun appendDadBotBubble(label: String, content: String, bgColor: Int) {
        val bubble = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = rounded(bgColor, 14, COLOR_BORDER, 1)
            setPadding(dp(12), dp(10), dp(12), dp(10))
        }
        bubble.addView(TextView(this).apply {
            text = label
            textSize = 10f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(COLOR_TEXT_MUTED)
        })
        bubble.addView(TextView(this).apply {
            text = content
            textSize = 13f
            setTextColor(COLOR_TEXT)
            setPadding(0, dp(2), 0, 0)
        })
        addWithMargin(dadBotMessageList, bubble, bottom = 6)
    }


    private fun addWorkSessionCard(root: LinearLayout) {
        val box = card().apply { setPadding(dp(16), dp(16), dp(16), dp(16)) }
        box.addView(sectionHeader("Work Session", "ลดการกดซ้ำ ใช้ manual fallback ได้"))
        box.addView(TextView(this).apply {
            text = "เปิด Work Session แล้วคำสั่ง low-risk ที่ permission พร้อมจะรันต่อเอง พร้อมบันทึก audit ทุก step"
            textSize = 12f
            setTextColor(COLOR_TEXT_MUTED)
            setPadding(0, 0, 0, dp(10))
        })
        box.addView(actionButton("Start Work Session", "Run allowed steps without approving each one", ButtonTone.PRIMARY) {
            workSessionEnabled = true
            auditLogStore.append("WORK_SESSION_STARTED", "local", "Owner started work session")
            refreshUi("Work Session enabled")
        })
        box.addView(actionButton("Stop Work Session", "Return to manual review", ButtonTone.DANGER) {
            workSessionEnabled = false
            auditLogStore.append("WORK_SESSION_STOPPED", "local", "Owner stopped work session")
            refreshUi("Work Session stopped")
        })
        box.addView(actionButton("Start Agent Service", "Poll backend queue every 5s", ButtonTone.SECONDARY) {
            startForegroundService(Intent(this@MainActivity, AgentForegroundService::class.java))
            auditLogStore.append("SERVICE_START_REQUESTED", "local", "Foreground service start requested")
            refreshUi("Foreground service start requested")
        })
        box.addView(actionButton("Open Accessibility Permission", "Back / Home / Scroll gate", ButtonTone.SECONDARY) {
            auditLogStore.append("OPEN_PERMISSION_SCREEN", "local", "Accessibility settings opened by owner")
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
        })
        box.addView(actionButton("Open Notification Listener Permission", "Notification summary gate", ButtonTone.SECONDARY) {
            auditLogStore.append("OPEN_PERMISSION_SCREEN", "local", "Notification listener settings opened by owner")
            startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
        })
        addWithMargin(root, box, bottom = 12)
    }

    private fun addFileManagerCard(root: LinearLayout) {
        val box = card().apply { setPadding(dp(16), dp(16), dp(16), dp(16)) }
        box.addView(sectionHeader("Full File Manager Mode", "Owner-enabled all-files access"))
        box.addView(TextView(this).apply {
            text = "All files access ต้องเปิดเองใน Android Settings ก่อน หลังจากนั้น list/send workflow จะรันใน Work Session ได้ ถ้าผ่าน gate"
            textSize = 13f
            setTextColor(COLOR_TEXT_MUTED)
            setPadding(0, 0, 0, dp(12))
        })
        box.addView(actionButton("Open Full File Manager Permission", "Android All files access", ButtonTone.WARNING) {
            auditLogStore.append("FILE_PERMISSION_REQUESTED", "local", "Owner opened all files access settings")
            val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION).apply { data = Uri.parse("package:$packageName") }
            runCatching { startActivity(intent) }.getOrElse { startActivity(Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION)) }
        })
        box.addView(actionButton("List shared storage", "Show files after permission", ButtonTone.PRIMARY) {
            val command = queueCommand(AgentCommandType.FILE_LIST_ROOT, FullFileManager.rootPath().absolutePath, "List shared storage", "local-file-manager")
            runInSessionIfAllowed(command)
        })
        box.addView(actionButton("Send selected files to Claw", "Placeholder Claw workflow", ButtonTone.SECONDARY) {
            val command = queueCommand(AgentCommandType.FILE_SEND_TO_CLAW, "selected-files://local-demo", "Prepare selected files for Claw", "local-file-manager")
            runInSessionIfAllowed(command)
        })
        filePreviewView = TextView(this).apply {
            text = "No file listing yet. Open permission, start Work Session, then ask: แสดงไฟล์"
            textSize = 12f
            setTextColor(COLOR_TEXT_MUTED)
            background = rounded(COLOR_BG, 16, COLOR_BORDER, 1)
            setPadding(dp(14), dp(12), dp(14), dp(12))
        }
        addWithMargin(box, filePreviewView, top = 8)
        addWithMargin(root, box, bottom = 12)
    }

    private fun addCommandInbox(root: LinearLayout) {
        val box = card().apply { setPadding(dp(16), dp(16), dp(16), dp(16)) }
        box.addView(sectionHeader("Command Inbox", "Manual fallback"))
        box.addView(actionButton("Queue demo: open_url", "Visible browser action", ButtonTone.SECONDARY) {
            queueCommand(AgentCommandType.OPEN_URL, DsgConfig.STATUS_URL, "Open DSG status page", "local-demo")
        })
        box.addView(actionButton("Queue demo: open settings", "Open Android Settings", ButtonTone.SECONDARY) {
            queueCommand(AgentCommandType.OPEN_APP, "com.android.settings", "Open Android Settings", "local-demo")
        })
        box.addView(actionButton("Queue demo: back", "Accessibility-gated", ButtonTone.SECONDARY) {
            queueCommand(AgentCommandType.BACK, "GLOBAL_BACK", "Run Android Back", "local-demo")
        })
        box.addView(actionButton("Queue demo: home", "Accessibility-gated", ButtonTone.SECONDARY) {
            queueCommand(AgentCommandType.HOME, "GLOBAL_HOME", "Run Android Home", "local-demo")
        })
        box.addView(actionButton("Kill Switch: Clear Pending Commands", "Owner emergency stop", ButtonTone.DANGER) {
            val count = commandStore.clearPending()
            auditLogStore.append("KILL_SWITCH_CLEAR_PENDING", "local", "Owner cleared $count pending command(s)")
            refreshUi("Kill switch cleared $count pending command(s)")
        })
        commandListView = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, dp(10), 0, 0)
        }
        box.addView(commandListView)
        addWithMargin(root, box, bottom = 12)
    }

    private fun addAuditLog(root: LinearLayout) {
        val box = card().apply { setPadding(dp(16), dp(16), dp(16), dp(16)) }
        box.addView(sectionHeader("Local Audit Log", "Device evidence"))
        auditView = TextView(this).apply {
            textSize = 12f
            setTextColor(COLOR_TEXT_MUTED)
            background = rounded(COLOR_BG, 16, COLOR_BORDER, 1)
            setPadding(dp(14), dp(12), dp(14), dp(12))
        }
        box.addView(auditView)
        addWithMargin(root, box)
    }

    private fun runNoCodePrompt() {
        val prompt = chatInput.text.toString().trim()
        if (prompt.isBlank()) {
            refreshUi("พิมพ์คำสั่งก่อน")
            return
        }
        val commands = planFromPrompt(prompt)
        commands.forEach { mapped ->
            val command = queueCommand(mapped.type, mapped.target, "No-code: $prompt", "no-code-chat")
            runInSessionIfAllowed(command)
        }
        chatInput.setText("")
    }

    private data class MappedCommand(val type: AgentCommandType, val target: String)

    private fun planFromPrompt(prompt: String): List<MappedCommand> {
        val lower = prompt.lowercase()
        val url = Regex("https?://\\S+").find(prompt)?.value
        if (url != null) return listOf(MappedCommand(AgentCommandType.OPEN_URL, url))
        if (lower.contains("ตรวจระบบ") || lower.contains("status") || lower.contains("สถานะ")) {
            return listOf(
                MappedCommand(AgentCommandType.OPEN_URL, DsgConfig.STATUS_URL),
                MappedCommand(AgentCommandType.OPEN_URL, DsgConfig.OPENCLAW_URL),
            )
        }
        return when {
            lower.contains("setting") || lower.contains("ตั้งค่า") -> listOf(MappedCommand(AgentCommandType.OPEN_APP, "com.android.settings"))
            lower.contains("ไฟล์") || lower.contains("file") || lower.contains("storage") -> listOf(MappedCommand(AgentCommandType.FILE_LIST_ROOT, FullFileManager.rootPath().absolutePath))
            lower.contains("claw") || lower.contains("ส่ง") -> listOf(MappedCommand(AgentCommandType.FILE_SEND_TO_CLAW, "selected-files://no-code-chat"))
            lower.contains("back") || lower.contains("ย้อน") -> listOf(MappedCommand(AgentCommandType.BACK, "GLOBAL_BACK"))
            lower.contains("home") || lower.contains("หน้าหลัก") -> listOf(MappedCommand(AgentCommandType.HOME, "GLOBAL_HOME"))
            lower.contains("scroll") || lower.contains("เลื่อน") -> listOf(MappedCommand(AgentCommandType.SCROLL_DOWN, "FOCUSED_OR_ROOT_NODE"))
            else -> listOf(MappedCommand(AgentCommandType.OPEN_URL, DsgConfig.STATUS_URL))
        }
    }

    private fun queueCommand(type: AgentCommandType, target: String, reason: String, source: String): AgentCommand {
        commandStore.pruneExpired()
        val command = AgentCommand.create(source, type, target, reason, PermissionGate.requiredPermissionFor(type), true)
        commandStore.add(command)
        auditLogStore.append(if (type.name.startsWith("FILE_")) "FILE_ACTION_QUEUED" else "COMMAND_QUEUED", command.commandId, "Queued ${command.type.name} digest=${command.commandDigest}")
        // Autonomous mode: skip inbox, execute immediately
        if (autonomousModeEnabled) {
            auditLogStore.append("AUTONOMOUS_AUTO_EXEC", command.commandId, "Autonomous mode — executing ${command.type.name} without approval dialog")
            approveCommand(command)
        } else {
            refreshUi("Queued ${command.type.name}")
            runInSessionIfAllowed(command)
        }
        return command
    }

    private fun runInSessionIfAllowed(command: AgentCommand) {
        if (!workSessionEnabled) return
        if (!sessionCanRun(command)) {
            auditLogStore.append("WORK_SESSION_WAITING", command.commandId, "Manual review required for ${command.type.name}")
            refreshUi("Manual review required for ${command.type.name}")
            return
        }
        auditLogStore.append("WORK_SESSION_RUN", command.commandId, "Running ${command.type.name} in active work session")
        approveCommand(command)
    }

    // In autonomous mode all command types are allowed; otherwise whitelist only low-risk ones
    private fun sessionCanRun(command: AgentCommand): Boolean {
        if (autonomousModeEnabled) return true
        return when (command.type) {
            AgentCommandType.STATUS,
            AgentCommandType.OPEN_URL,
            AgentCommandType.OPEN_SETTINGS,
            AgentCommandType.OPEN_APP,
            AgentCommandType.BACK,
            AgentCommandType.HOME,
            AgentCommandType.SCROLL_DOWN,
            AgentCommandType.FILE_LIST_ROOT,
            AgentCommandType.FILE_SEND_TO_CLAW -> true
            AgentCommandType.NOTIFICATION_SUMMARY,
            AgentCommandType.FILE_PREVIEW,
            AgentCommandType.FILE_SELECT,
            AgentCommandType.FILE_RENAME,
            AgentCommandType.FILE_MOVE,
            AgentCommandType.FILE_DELETE -> false
        }
    }

    private fun refreshUi(extra: String? = null) {
        statusView.text = buildStatusText(extra)
        if (::filePreviewView.isInitialized && permissionGate.isFullFileManagerEnabled() && !fileListRendered) {
            filePreviewView.text = "Full file manager permission enabled. Start Work Session, then ask: แสดงไฟล์"
        }
        renderCommands()
        renderAuditLog()
    }

    private fun renderCommands() {
        commandListView.removeAllViews()
        val pending = commandStore.listPending()
        if (pending.isEmpty()) {
            commandListView.addView(TextView(this).apply {
                text = if (workSessionEnabled) "No pending commands. Work Session is active." else "No pending commands."
                textSize = 13f
                setTextColor(COLOR_TEXT_MUTED)
                setPadding(0, dp(8), 0, 0)
            })
            return
        }
        pending.forEach { command ->
            val item = card(COLOR_CARD_ALT, radius = 18, stroke = COLOR_BORDER).apply { setPadding(dp(14), dp(14), dp(14), dp(14)) }
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
            val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
            row.addView(compactButton("Approve", ButtonTone.PRIMARY) { approveCommand(command) })
            row.addView(compactButton("Reject", ButtonTone.SECONDARY) {
                commandStore.markRejected(command.commandId)
                auditLogStore.append("COMMAND_REJECTED", command.commandId, "Owner rejected ${command.type.name}")
                refreshUi("Rejected ${command.type.name}")
            })
            item.addView(row)
            addWithMargin(commandListView, item, bottom = 10)
        }
    }

    private fun approveCommand(command: AgentCommand) {
        if (!autonomousModeEnabled) {
            val blockMessage = filePolicyBlock(command)
            if (blockMessage != null) {
                commandStore.markBlocked(command.commandId, blockMessage)
                auditLogStore.append("FILE_ACTION_BLOCKED", command.commandId, blockMessage, AgentErrorCodes.FILE_SENSITIVE_REVIEW_REQUIRED)
                refreshUi(blockMessage)
                return
            }
        }
        val gate = permissionGate.evaluate(command, autonomousModeEnabled)
        if (!gate.allowed) {
            if (gate.errorCode == AgentErrorCodes.PERMISSION_REQUIRED) commandStore.markWaitingPermission(command.commandId, gate.message) else commandStore.markBlocked(command.commandId, gate.message)
            auditLogStore.append(if (command.type.name.startsWith("FILE_")) "FILE_ACTION_BLOCKED" else "COMMAND_BLOCKED", command.commandId, gate.message, gate.errorCode)
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
        auditLogStore.append(if (signed.type.name.startsWith("FILE_")) "FILE_ACTION_APPROVED" else "COMMAND_APPROVED", signed.commandId, "Owner approved signed digest=${signed.commandDigest}")
        commandStore.markApproved(signed.commandId, signed.approvalSignature!!)
        val result = executeCommand(signed)
        if (result.success) {
            commandStore.markExecuted(signed.commandId)
            auditLogStore.append(if (signed.type.name.startsWith("FILE_")) "FILE_ACTION_EXECUTED" else "COMMAND_EXECUTED", signed.commandId, result.message)
        } else {
            commandStore.markFailed(signed.commandId, result.errorCode ?: "EXECUTION_FAILED", result.message)
            auditLogStore.append("COMMAND_FAILED", signed.commandId, result.message, result.errorCode)
        }
        refreshUi(result.message)
    }

    private fun filePolicyBlock(command: AgentCommand): String? {
        if (!command.type.name.startsWith("FILE_")) return null
        val lower = command.target.lowercase()
        if (command.type == AgentCommandType.FILE_DELETE) return "Delete is blocked in this build."
        if (lower.endsWith(".env") || lower.contains("api_key") || lower.contains("private") || lower.endsWith(".pem")) return "This file action needs a separate review sheet."
        return null
    }

    private fun executeCommand(command: AgentCommand): CommandExecutionResult {
        if (!approvalSigner.verify(command)) return CommandExecutionResult(false, "Executor refused unsigned or changed command", AgentErrorCodes.APPROVAL_SIGNATURE_INVALID)
        return when (command.type) {
            AgentCommandType.STATUS -> CommandExecutionResult(true, "Status command reviewed")
            AgentCommandType.OPEN_URL -> {
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(command.target)))
                CommandExecutionResult(true, "Opened URL visibly: ${command.target}")
            }
            AgentCommandType.OPEN_SETTINGS -> {
                startActivity(Intent(Settings.ACTION_SETTINGS))
                CommandExecutionResult(true, "Opened Android Settings")
            }
            AgentCommandType.OPEN_APP -> {
                val launchIntent = packageManager.getLaunchIntentForPackage(command.target)
                if (launchIntent == null) CommandExecutionResult(false, "Package not launchable: ${command.target}", "PACKAGE_NOT_LAUNCHABLE") else {
                    startActivity(launchIntent)
                    CommandExecutionResult(true, "Opened app package visibly: ${command.target}")
                }
            }
            AgentCommandType.BACK -> AccessibilityActionBridge.performBack()
            AgentCommandType.HOME -> AccessibilityActionBridge.performHome()
            AgentCommandType.SCROLL_DOWN -> AccessibilityActionBridge.performScrollDown()
            AgentCommandType.NOTIFICATION_SUMMARY -> CommandExecutionResult(false, "Notification summary executor is not enabled", AgentErrorCodes.EXECUTOR_UNSUPPORTED)
            AgentCommandType.FILE_LIST_ROOT -> {
                fileListRendered = true
                filePreviewView.text = FullFileManager.buildListSummary()
                auditLogStore.append("FILE_LISTED", command.commandId, "Listed shared storage root")
                CommandExecutionResult(true, "Listed shared storage root")
            }
            AgentCommandType.FILE_SEND_TO_CLAW -> CommandExecutionResult(true, "Prepared selected files for Claw workflow")
            AgentCommandType.FILE_PREVIEW -> {
                val content = FullFileManager.readFile(command.target)
                filePreviewView.text = content
                auditLogStore.append("FILE_PREVIEWED", command.commandId, "Previewed ${command.target}")
                CommandExecutionResult(true, "Previewed: ${command.target}")
            }
            AgentCommandType.FILE_SELECT -> {
                filePreviewView.text = "Selected: ${command.target}"
                auditLogStore.append("FILE_SELECTED", command.commandId, "Selected ${command.target}")
                CommandExecutionResult(true, "Selected: ${command.target}")
            }
            AgentCommandType.FILE_RENAME -> {
                val parts = command.target.split("||")
                if (parts.size < 2) return CommandExecutionResult(false, "Rename format: <path>||<newName>", "INVALID_ARGS")
                val ok = FullFileManager.renameFile(parts[0].trim(), parts[1].trim())
                if (ok) {
                    auditLogStore.append("FILE_RENAMED", command.commandId, "Renamed ${parts[0]} → ${parts[1]}")
                    CommandExecutionResult(true, "Renamed to ${parts[1]}")
                } else {
                    CommandExecutionResult(false, "Rename failed for ${parts[0]}", "FILE_OP_FAILED")
                }
            }
            AgentCommandType.FILE_MOVE -> {
                val parts = command.target.split("||")
                if (parts.size < 2) return CommandExecutionResult(false, "Move format: <path>||<destDir>", "INVALID_ARGS")
                val ok = FullFileManager.moveFile(parts[0].trim(), parts[1].trim())
                if (ok) {
                    auditLogStore.append("FILE_MOVED", command.commandId, "Moved ${parts[0]} → ${parts[1]}")
                    CommandExecutionResult(true, "Moved to ${parts[1]}")
                } else {
                    CommandExecutionResult(false, "Move failed for ${parts[0]}", "FILE_OP_FAILED")
                }
            }
            AgentCommandType.FILE_DELETE -> {
                val ok = FullFileManager.deleteFile(command.target)
                if (ok) {
                    auditLogStore.append("FILE_DELETED", command.commandId, "Deleted ${command.target}")
                    CommandExecutionResult(true, "Deleted: ${command.target}")
                } else {
                    CommandExecutionResult(false, "Delete failed for ${command.target}", "FILE_OP_FAILED")
                }
            }
        }
    }

    private fun renderAuditLog() {
        auditView.text = auditLogStore.tail(20).ifEmpty { "No audit events yet." }
    }

    private fun buildStatusText(extra: String? = null): String = listOfNotNull(
        "Backend: ${DsgConfig.BASE_URL}",
        if (autonomousModeEnabled) "⚡ AUTONOMOUS MODE: ON — all gates bypassed" else "Mode: no-code • work-session • signed execution • audit",
        "Work Session: $workSessionEnabled",
        "Accessibility: ${permissionGate.isAccessibilityEnabled()}",
        "Notifications: ${permissionGate.isNotificationListenerEnabled()}",
        "Full file manager: ${permissionGate.isFullFileManagerEnabled()}",
        "Pending: ${commandStore.listPending().size}",
        extra,
    ).joinToString("\n")

    private fun sectionHeader(title: String, subtitle: String): View = LinearLayout(this).apply {
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

    private fun compactButton(textValue: String, tone: ButtonTone, onClick: () -> Unit): Button = Button(this).apply {
        text = textValue
        textSize = 12f
        isAllCaps = false
        setTextColor(if (tone == ButtonTone.PRIMARY) Color.WHITE else COLOR_TEXT)
        background = rounded(buttonBg(tone), 14, buttonBorder(tone), 1)
        setOnClickListener { onClick() }
        layoutParams = LinearLayout.LayoutParams(0, dp(44), 1f).apply { setMargins(0, 0, dp(8), 0) }
    }

    private fun tab(label: String, active: Boolean): TextView = TextView(this).apply {
        text = label
        textSize = 13f
        typeface = Typeface.DEFAULT_BOLD
        gravity = Gravity.CENTER
        setTextColor(if (active) Color.WHITE else COLOR_TEXT_MUTED)
        background = rounded(if (active) COLOR_PRIMARY else COLOR_CARD, 22, if (active) COLOR_PRIMARY else COLOR_BORDER, 1)
        layoutParams = LinearLayout.LayoutParams(0, dp(42), 1f).apply { setMargins(0, 0, dp(8), 0) }
    }

    private fun statusPill(label: String, ok: Boolean): TextView = TextView(this).apply {
        text = label
        textSize = 11f
        typeface = Typeface.DEFAULT_BOLD
        gravity = Gravity.CENTER
        setTextColor(if (ok) COLOR_GREEN else COLOR_RED)
        background = rounded(if (ok) COLOR_GREEN_SOFT else COLOR_RED_SOFT, 18, if (ok) COLOR_GREEN_BORDER else COLOR_RED_BORDER, 1)
        setPadding(dp(10), dp(6), dp(10), dp(6))
    }

    private fun card(color: Int = COLOR_CARD, radius: Int = 24, stroke: Int = COLOR_BORDER): LinearLayout = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        background = rounded(color, radius, stroke, 1)
    }

    private fun rounded(color: Int, radius: Int, strokeColor: Int? = null, strokeWidth: Int = 0): GradientDrawable = GradientDrawable().apply {
        setColor(color)
        cornerRadius = dp(radius).toFloat()
        if (strokeColor != null && strokeWidth > 0) setStroke(dp(strokeWidth), strokeColor)
    }

    private fun addWithMargin(parent: LinearLayout, child: View, top: Int = 0, bottom: Int = 0) {
        parent.addView(child, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
            setMargins(0, dp(top), 0, dp(bottom))
        })
    }

    private fun addBottomMargin(view: View, bottom: Int) {
        view.layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { setMargins(0, 0, 0, dp(bottom)) }
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
    private fun buttonBg(tone: ButtonTone): Int = when (tone) { ButtonTone.PRIMARY -> COLOR_PRIMARY; ButtonTone.SECONDARY -> COLOR_CARD_ALT; ButtonTone.WARNING -> COLOR_WARNING_SOFT; ButtonTone.DANGER -> COLOR_RED_SOFT }
    private fun buttonBorder(tone: ButtonTone): Int = when (tone) { ButtonTone.PRIMARY -> COLOR_PRIMARY; ButtonTone.SECONDARY -> COLOR_BORDER; ButtonTone.WARNING -> COLOR_WARNING_BORDER; ButtonTone.DANGER -> COLOR_RED_BORDER }
    private fun buttonIcon(tone: ButtonTone): String = when (tone) { ButtonTone.PRIMARY -> "🚀"; ButtonTone.SECONDARY -> "›"; ButtonTone.WARNING -> "⚠️"; ButtonTone.DANGER -> "⛔" }
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
