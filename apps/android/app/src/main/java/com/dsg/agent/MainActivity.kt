package com.dsg.agent

import android.Manifest
import android.animation.ObjectAnimator
import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.text.Spannable
import android.text.SpannableStringBuilder
import android.text.InputType
import android.text.style.BackgroundColorSpan
import android.text.style.ForegroundColorSpan
import android.text.style.RelativeSizeSpan
import android.text.style.StyleSpan
import android.text.style.TypefaceSpan
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.net.ConnectivityManager
import android.widget.Button
import android.widget.EditText
import android.widget.HorizontalScrollView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.core.app.ActivityCompat
import com.dsg.agent.automation.AccessibilityActionBridge
import com.dsg.agent.automation.AgentCommand
import com.dsg.agent.automation.AgentCommandStore
import com.dsg.agent.automation.AgentCommandType
import com.dsg.agent.automation.AutonomyDial
import com.dsg.agent.automation.AgentErrorCodes
import com.dsg.agent.automation.AuditLogStore
import com.dsg.agent.automation.CommandExecutionResult
import com.dsg.agent.automation.CustomSkill
import com.dsg.agent.automation.DadBotCallback
import com.dsg.agent.automation.DadBotClient
import com.dsg.agent.automation.DadBotMessage
import com.dsg.agent.automation.FullFileManager
import com.dsg.agent.automation.HermesHealth
import com.dsg.agent.automation.HermesRuntimeClient
import com.dsg.agent.automation.MemoryStore
import com.dsg.agent.automation.OwnerApprovalSigner
import com.dsg.agent.automation.PermissionGate
import com.dsg.agent.automation.ScheduledTaskStore
import com.dsg.agent.automation.SkillStore
import com.dsg.agent.service.AgentForegroundService
import com.dsg.agent.service.LocalApiServer
import com.dsg.agent.service.TelegramGateway
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : Activity() {
    // Standard UI refs
    private lateinit var statusView: TextView
    private lateinit var commandListView: LinearLayout
    private lateinit var auditView: TextView
    private lateinit var filePreviewView: TextView
    private lateinit var chatInput: EditText

    // Navigation
    private lateinit var outerScroll: ScrollView
    private var dadBotSectionView: View? = null
    private var sessionsSectionView: View? = null
    private var memorySectionView: View? = null
    private var fileSectionView: View? = null
    private var skillsSectionView: View? = null
    private var cronSectionView: View? = null
    private var gatewaySectionView: View? = null
    private var hermesSectionView: View? = null
    private var logsSectionView: View? = null

    // DadBot chat UI refs
    private lateinit var dadBotScroll: ScrollView
    private lateinit var dadBotMessageList: LinearLayout
    private lateinit var dadBotInput: EditText
    private lateinit var typingDot1: TextView
    private lateinit var typingDot2: TextView
    private lateinit var typingDot3: TextView
    private lateinit var typingRow: LinearLayout
    private var typingAnimators: List<ObjectAnimator> = emptyList()
    private var liveBotBubble: TextView? = null
    private var liveBotWrapper: LinearLayout? = null
    private var liveBotBuffer = StringBuilder()
    private var subagentCount = 0
    private var subagentChip: TextView? = null

    // Dynamic section list views (refreshed without full render)
    private var sessionsListView: LinearLayout? = null
    private var memoryListView: LinearLayout? = null
    private var logsListView: LinearLayout? = null
    private var cronListView: LinearLayout? = null
    private var statusDot: TextView? = null
    private var gatewayStatusDot: TextView? = null
    private var localApiStatusDot: TextView? = null

    // Hermes runtime (backend-connected) refs + step state
    private var hermesStatusView: TextView? = null
    private var hermesHealth: HermesHealth? = null
    private var hermesInstalled = false
    private var hermesStarted = false
    private var hermesNousConnected = false
    private var hermesTestResult: String? = null

    // Domain objects
    private lateinit var commandStore: AgentCommandStore
    private lateinit var auditLogStore: AuditLogStore
    private lateinit var permissionGate: PermissionGate
    private lateinit var approvalSigner: OwnerApprovalSigner
    private lateinit var dadBotClient: DadBotClient
    private lateinit var memoryStore: MemoryStore
    private lateinit var skillStore: SkillStore
    private lateinit var scheduledTaskStore: ScheduledTaskStore
    private lateinit var telegramGateway: TelegramGateway
    private lateinit var localApiServer: LocalApiServer
    private lateinit var hermesRuntimeClient: HermesRuntimeClient

    private val dadBotMessages = mutableListOf<DadBotMessage>()
    private var fileListRendered = false
    private var workSessionEnabled = false
    private var autonomousModeEnabled: Boolean
        get() = getSharedPreferences("dsg_prefs", MODE_PRIVATE).getBoolean("autonomous_mode", false)
        set(value) { getSharedPreferences("dsg_prefs", MODE_PRIVATE).edit().putBoolean("autonomous_mode", value).apply() }
    private var autonomyLevel: Int
        get() = getSharedPreferences("dsg_prefs", MODE_PRIVATE).getInt("autonomy_level", 0)
        set(value) { getSharedPreferences("dsg_prefs", MODE_PRIVATE).edit().putInt("autonomy_level", value.coerceIn(0, 3)).apply() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 10)
        commandStore = AgentCommandStore(this)
        auditLogStore = AuditLogStore(this)
        permissionGate = PermissionGate(this)
        approvalSigner = OwnerApprovalSigner()
        dadBotClient = DadBotClient()
        memoryStore = MemoryStore(this)
        skillStore = SkillStore(this)
        scheduledTaskStore = ScheduledTaskStore(this)
        telegramGateway = TelegramGateway(this)
        localApiServer = LocalApiServer(this)
        hermesRuntimeClient = HermesRuntimeClient()
        render()
        checkBackendStatus()
        scheduledTaskStore.scheduleAll()
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
        addSessionsSection(root)
        addMemorySection(root)
        addSkillsSection(root)
        addCronSection(root)
        addGatewaySection(root)
        addHermesRuntimeSection(root)
        addWorkSessionCard(root)
        addFileManagerCard(root)
        addLogsSection(root)
        outerScroll = ScrollView(this).apply {
            setBackgroundColor(COLOR_BG)
            addView(root)
        }
        setContentView(outerScroll)
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
        // Hermes-style backend status strip
        statusDot = TextView(this).apply {
            text = "● Checking..."
            textSize = 11f
            setTextColor(COLOR_TEXT_MUTED_DARK)
            setPadding(0, dp(8), 0, 0)
        }
        hero.addView(statusDot)
        addWithMargin(root, hero, bottom = 12)
    }

    private fun addTabs(root: LinearLayout) {
        val scroll = HorizontalScrollView(this).apply { isHorizontalScrollBarEnabled = false }
        val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        row.addView(tab("💬 Chat", true)     { scrollToView(dadBotSectionView) })
        row.addView(tab("🗂 Sessions", false) { scrollToView(sessionsSectionView) })
        row.addView(tab("🧠 Memory", false)  { scrollToView(memorySectionView) })
        row.addView(tab("🛠 Skills", false)  { scrollToView(skillsSectionView) })
        row.addView(tab("⏰ Cron", false)    { scrollToView(cronSectionView) })
        row.addView(tab("🌐 Gateway", false) { scrollToView(gatewaySectionView) })
        row.addView(tab("⚙ Hermes", false)  { scrollToView(hermesSectionView) })
        row.addView(tab("📁 Files", false)   { scrollToView(fileSectionView) })
        row.addView(tab("📋 Logs", false)    { scrollToView(logsSectionView) })
        scroll.addView(row)
        addWithMargin(root, scroll, bottom = 12)
    }

    private fun scrollToView(v: View?) {
        v ?: return
        outerScroll.post { outerScroll.smoothScrollTo(0, v.top) }
    }

    private fun addAutonomousModeCard(root: LinearLayout) {
        val level = autonomyLevel
        val info = AutonomyDial.info(level)
        val on = level >= 2
        val cardBg = if (on) Color.parseColor("#1a2e1a") else COLOR_CARD_ALT
        val cardStroke = if (on) Color.parseColor("#4ade80") else COLOR_BORDER
        val modeCard = card(cardBg, stroke = cardStroke).apply {
            setPadding(dp(16), dp(14), dp(16), dp(14))
        }
        modeCard.addView(TextView(this).apply {
            text = "🎚 Autonomy Dial — ${info.name}"
            textSize = 15f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(if (on) Color.parseColor("#4ade80") else COLOR_TEXT)
        })
        modeCard.addView(TextView(this).apply {
            text = info.desc
            textSize = 12f
            setTextColor(COLOR_TEXT_MUTED)
            setPadding(0, dp(4), 0, dp(8))
        })
        val row1 = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        val row2 = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; setPadding(0, dp(8), 0, 0) }
        AutonomyDial.LEVELS.forEach { lv ->
            val tone = if (lv.level == level) ButtonTone.PRIMARY else ButtonTone.SECONDARY
            val btn = compactButton("L${lv.level}", tone) {
                UiAnimations.buttonPressScale(modeCard)
                autonomyLevel = lv.level
                workSessionEnabled = lv.level >= 1
                autonomousModeEnabled = lv.level >= 3
                auditLogStore.append("AUTONOMY_LEVEL_SET", "owner", "Owner set autonomy ${lv.name} (workSession=${lv.level >= 1}, autonomous=${lv.level >= 3})")
                render()
            }
            (if (lv.level <= 1) row1 else row2).addView(btn)
        }
        modeCard.addView(row1)
        modeCard.addView(row2)
        modeCard.addView(TextView(this).apply {
            text = "พื้นความปลอดภัยคงอยู่ทุกระดับ: คำสั่งลบ/ย้ายไฟล์ (Tier 2) ยังผ่าน permission gate + sensitive-file block + ลายเซ็นเจ้าของ + audit แม้ที่ L3"
            textSize = 11f
            setTextColor(COLOR_TEXT_MUTED)
            setPadding(0, dp(10), 0, 0)
        })
        addWithMargin(root, modeCard, bottom = 12)
    }

    private fun addDadBotSection(root: LinearLayout) {
        val box = card(COLOR_SURFACE_DARK, stroke = COLOR_BORDER_DARK).apply {
            setPadding(dp(16), dp(16), dp(16), dp(16))
        }

        // Header row
        val headerRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, 0, 0, dp(12))
        }
        headerRow.addView(TextView(this).apply {
            text = "🤖"
            textSize = 18f
            gravity = Gravity.CENTER
            background = rounded(COLOR_PRIMARY, 10)
        }, LinearLayout.LayoutParams(dp(36), dp(36)))
        headerRow.addView(LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(10), 0, 0, 0)
            addView(TextView(this@MainActivity).apply {
                text = "DadBot AI Chat"
                textSize = 17f
                typeface = Typeface.DEFAULT_BOLD
                setTextColor(Color.WHITE)
            })
            addView(TextView(this@MainActivity).apply {
                text = "Thai/English · Claude Haiku · Real-time"
                textSize = 11f
                setTextColor(COLOR_TEXT_MUTED_DARK)
            })
        }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        box.addView(headerRow)

        // Chat history scroll area
        dadBotScroll = ScrollView(this).apply {
            background = rounded(COLOR_SURFACE_DARK_2, 16, COLOR_BORDER_DARK, 1)
        }
        dadBotMessageList = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(10), dp(10), dp(10), dp(10))
        }

        // Greeting bubble
        val greetBubble = makeBubble(
            "สวัสดีครับ! ผม DadBot 🤖 บอกได้เลยว่าอยากให้ทำอะไร เช่น ตรวจระบบ, เปิดไฟล์, กด Back",
            isUser = false,
        )
        dadBotMessageList.addView(greetBubble)

        // Kimi-style thinking box (GONE until AI is thinking)
        typingRow = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = rounded(COLOR_SURFACE_DARK_2, 12, COLOR_PRIMARY, 1)
            setPadding(dp(12), dp(10), dp(12), dp(10))
            visibility = View.GONE
        }
        val thinkHeader = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        typingDot1 = TextView(this).apply { text = "🧠"; textSize = 14f; gravity = Gravity.CENTER }
        thinkHeader.addView(typingDot1, LinearLayout.LayoutParams(dp(26), dp(26)))
        thinkHeader.addView(TextView(this).apply {
            text = " กำลังคิด..."
            textSize = 13f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(COLOR_PRIMARY)
        }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        typingRow.addView(thinkHeader)
        typingDot2 = TextView(this).apply {
            text = "  • วิเคราะห์คำถาม"
            textSize = 12f; setTextColor(COLOR_TEXT_MUTED_DARK); alpha = 0f
            setPadding(dp(4), dp(4), 0, 0)
        }
        typingDot3 = TextView(this).apply {
            text = "  • เตรียมคำตอบ"
            textSize = 12f; setTextColor(COLOR_TEXT_MUTED_DARK); alpha = 0f
            setPadding(dp(4), dp(2), 0, 0)
        }
        typingRow.addView(typingDot2)
        typingRow.addView(typingDot3)
        dadBotMessageList.addView(typingRow)

        dadBotScroll.addView(dadBotMessageList)
        box.addView(dadBotScroll, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, dp(300),
        ).apply { setMargins(0, 0, 0, dp(10)) })

        // Input row
        val inputRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        dadBotInput = EditText(this).apply {
            hint = "พิมพ์ข้อความ..."
            textSize = 14f
            maxLines = 3
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE
            setTextColor(COLOR_TEXT_SOFT_DARK)
            setHintTextColor(COLOR_TEXT_MUTED_DARK)
            background = rounded(COLOR_SURFACE_DARK_2, 16, COLOR_BORDER_DARK, 1)
            setPadding(dp(12), dp(10), dp(12), dp(10))
        }
        inputRow.addView(dadBotInput, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply {
            setMargins(0, 0, dp(8), 0)
        })
        val sendBtn = Button(this).apply {
            text = "🚀"
            textSize = 18f
            isAllCaps = false
            background = rounded(COLOR_PRIMARY, 16)
            setTextColor(Color.WHITE)
            setOnClickListener {
                UiAnimations.buttonPressScale(this)
                sendDadBot(dadBotInput.text.toString().trim())
            }
        }
        inputRow.addView(sendBtn, LinearLayout.LayoutParams(dp(52), dp(52)))
        box.addView(inputRow)

        // 2×2 Kimi-style welcome card grid
        val promptRow1 = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; setPadding(0, dp(10), 0, 0) }
        val promptRow2 = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; setPadding(0, dp(6), 0, 0) }
        promptRow1.addView(makeWelcomeCard("🔍", "ตรวจระบบ", "ดูสถานะ permissions") { sendDadBot("ตรวจระบบ") })
        promptRow1.addView(makeWelcomeCard("📁", "แสดงไฟล์", "รายการไฟล์ทั้งหมด") { sendDadBot("แสดงไฟล์") })
        promptRow2.addView(makeWelcomeCard("↩️", "ย้อนกลับ", "Android Back button") { sendDadBot("ย้อนกลับ") })
        promptRow2.addView(makeWelcomeCard("⚙️", "เปิด settings", "ตั้งค่าระบบ") { sendDadBot("เปิด settings") })
        box.addView(promptRow1)
        box.addView(promptRow2)

        dadBotSectionView = box
        addWithMargin(root, box, bottom = 12)
    }

    private fun makeBubble(text: String, isUser: Boolean): LinearLayout {
        val outerRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = if (isUser) Gravity.END else Gravity.START
            setPadding(0, dp(3), 0, dp(3))
        }
        val screenW = resources.displayMetrics.widthPixels
        if (isUser) {
            val bubble = TextView(this).apply {
                this.text = text
                textSize = 14f
                setTextColor(Color.WHITE)
                background = makeBubbleDrawable(isUser = true)
                setPadding(dp(12), dp(9), dp(12), dp(9))
                maxWidth = (screenW * 0.78).toInt()
                setLineSpacing(dp(2).toFloat(), 1f)
            }
            outerRow.addView(bubble, LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT,
            ).apply { marginStart = (screenW * 0.18).toInt() })
        } else {
            // Bot: contentWrap (vertical) holds bubble + long-press action row
            val contentWrap = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
            val bubble = TextView(this).apply {
                setText(renderMarkdown(text), TextView.BufferType.SPANNABLE)
                textSize = 14f
                setTextColor(COLOR_TEXT_SOFT_DARK)
                background = makeBubbleDrawable(isUser = false)
                setPadding(dp(12), dp(9), dp(12), dp(9))
                maxWidth = (screenW * 0.78).toInt()
                setLineSpacing(dp(2).toFloat(), 1f)
            }
            contentWrap.addView(bubble, LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT))
            val actionsRow = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                visibility = View.GONE
                setPadding(dp(4), dp(6), 0, dp(2))
            }
            actionsRow.addView(makeIconBtn("📋") {
                val cm = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                cm.setPrimaryClip(ClipData.newPlainText("msg", bubble.text))
            })
            actionsRow.addView(makeIconBtn("👍") { v -> UiAnimations.buttonPressScale(v) })
            actionsRow.addView(makeIconBtn("👎") { v -> UiAnimations.buttonPressScale(v) })
            contentWrap.addView(actionsRow)
            contentWrap.setOnLongClickListener {
                actionsRow.visibility = if (actionsRow.visibility == View.VISIBLE) View.GONE else View.VISIBLE
                true
            }
            outerRow.addView(contentWrap, LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT,
            ).apply { marginEnd = (screenW * 0.18).toInt() })
        }
        return outerRow
    }

    private fun makeIconBtn(icon: String, onClick: (View) -> Unit): TextView = TextView(this).apply {
        text = icon; textSize = 16f; gravity = Gravity.CENTER
        setPadding(dp(8), dp(4), dp(8), dp(4))
        setOnClickListener { onClick(it) }
    }

    private fun makeToolCallCard(type: AgentCommandType, target: String, reason: String): View {
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = GradientDrawable().apply {
                setColor(COLOR_SURFACE_DARK_2)
                cornerRadius = dp(10).toFloat()
                setStroke(dp(2), COLOR_HERMES_AMBER)
            }
            setPadding(dp(12), dp(8), dp(12), dp(8))
        }
        card.addView(TextView(this).apply {
            text = "🔧 ${type.name.lowercase()}"; textSize = 12f; typeface = Typeface.DEFAULT_BOLD
            setTextColor(COLOR_HERMES_AMBER)
        })
        val short = if (target.length > 60) target.take(57) + "..." else target
        card.addView(TextView(this).apply { text = "  TYPE: ${type.name}"; textSize = 11f; setTextColor(COLOR_TEXT_MUTED_DARK) })
        card.addView(TextView(this).apply { text = "  TARGET: $short"; textSize = 11f; setTextColor(COLOR_TEXT_MUTED_DARK) })
        card.addView(TextView(this).apply { text = "  \"$reason\""; textSize = 11f; setTextColor(COLOR_TEXT_MUTED_DARK) })
        val outerRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.START
            setPadding(0, dp(3), 0, dp(3))
        }
        outerRow.addView(card, LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
            marginEnd = (resources.displayMetrics.widthPixels * 0.18).toInt()
        })
        return outerRow
    }

    private fun checkBackendStatus() {
        Thread {
            val ok = runCatching {
                val conn = (URL(DsgConfig.STATUS_URL).openConnection() as HttpURLConnection).apply {
                    connectTimeout = 5_000; readTimeout = 5_000; requestMethod = "GET"
                }
                val code = conn.responseCode; conn.disconnect(); code < 400
            }.getOrDefault(false)
            runOnUiThread {
                statusDot?.text = if (ok) "● ${DsgConfig.BASE_URL}" else "● Offline — ${DsgConfig.BASE_URL}"
                statusDot?.setTextColor(if (ok) COLOR_GREEN else COLOR_RED)
            }
        }.start()
    }

    private fun makeWelcomeCard(icon: String, title: String, subtitle: String, onClick: () -> Unit): LinearLayout {
        val cardView = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = rounded(COLOR_SURFACE_DARK_2, 12, COLOR_PRIMARY_SOFT, 1)
            setPadding(dp(10), dp(10), dp(10), dp(10))
            setOnClickListener { UiAnimations.buttonPressScale(this); onClick() }
        }
        cardView.addView(TextView(this).apply {
            text = "$icon  $title"; textSize = 13f; typeface = Typeface.DEFAULT_BOLD; setTextColor(Color.WHITE)
        })
        cardView.addView(TextView(this).apply {
            text = subtitle; textSize = 11f; setTextColor(COLOR_TEXT_MUTED_DARK); setPadding(0, dp(3), 0, 0)
        })
        cardView.layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply {
            setMargins(dp(3), 0, dp(3), 0)
        }
        return cardView
    }

    private fun renderMarkdown(text: String): SpannableStringBuilder {
        val sb = SpannableStringBuilder()
        val lines = text.split("\n")
        lines.forEachIndexed { idx, line ->
            val headerMatch = Regex("^(#{1,3})\\s+(.+)$").find(line)
            if (headerMatch != null) {
                val level = headerMatch.groupValues[1].length
                val content = headerMatch.groupValues[2]
                val start = sb.length
                sb.append(content)
                sb.setSpan(StyleSpan(Typeface.BOLD), start, sb.length, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE)
                val scale = when (level) { 1 -> 1.3f; 2 -> 1.15f; else -> 1.05f }
                sb.setSpan(RelativeSizeSpan(scale), start, sb.length, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE)
            } else {
                var i = 0
                while (i < line.length) {
                    when {
                        i + 1 < line.length && line[i] == '*' && line[i + 1] == '*' -> {
                            val end = line.indexOf("**", i + 2)
                            if (end > i) {
                                val s = sb.length; sb.append(line.substring(i + 2, end))
                                sb.setSpan(StyleSpan(Typeface.BOLD), s, sb.length, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE)
                                i = end + 2
                            } else { sb.append(line[i]); i++ }
                        }
                        line[i] == '*' -> {
                            val end = line.indexOf('*', i + 1)
                            if (end > i) {
                                val s = sb.length; sb.append(line.substring(i + 1, end))
                                sb.setSpan(StyleSpan(Typeface.ITALIC), s, sb.length, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE)
                                i = end + 1
                            } else { sb.append(line[i]); i++ }
                        }
                        line[i] == '`' -> {
                            val end = line.indexOf('`', i + 1)
                            if (end > i) {
                                val s = sb.length; sb.append(line.substring(i + 1, end))
                                sb.setSpan(TypefaceSpan("monospace"), s, sb.length, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE)
                                sb.setSpan(BackgroundColorSpan(0xFF2D2040.toInt()), s, sb.length, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE)
                                sb.setSpan(ForegroundColorSpan(0xFFD8B4FE.toInt()), s, sb.length, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE)
                                i = end + 1
                            } else { sb.append(line[i]); i++ }
                        }
                        else -> { sb.append(line[i]); i++ }
                    }
                }
            }
            if (idx < lines.lastIndex) sb.append("\n")
        }
        return sb
    }

    private fun makeBubbleDrawable(isUser: Boolean): GradientDrawable {
        val r = dp(16).toFloat()
        val sm = dp(4).toFloat()
        return GradientDrawable().apply {
            setColor(if (isUser) COLOR_PRIMARY else COLOR_SURFACE_DARK_2)
            cornerRadii = if (isUser)
                floatArrayOf(r, r, r, r, sm, sm, r, r)  // bottom-right small = speech tail
            else
                floatArrayOf(r, r, r, r, r, r, sm, sm)  // bottom-left small = speech tail
            if (!isUser) setStroke(dp(1), COLOR_BORDER_DARK)
        }
    }

    private fun makeDot(): TextView = TextView(this).apply {
        text = "●"
        textSize = 8f
        gravity = Gravity.CENTER
        setTextColor(COLOR_TEXT_MUTED_DARK)
        alpha = 0.3f
    }

    private fun makeChip(label: String, onClick: () -> Unit): TextView = TextView(this).apply {
        text = label
        textSize = 12f
        typeface = Typeface.DEFAULT_BOLD
        gravity = Gravity.CENTER
        setTextColor(COLOR_TEXT_SOFT_DARK)
        background = rounded(COLOR_SURFACE_DARK_2, 18, COLOR_BORDER_DARK, 1)
        setPadding(dp(12), dp(6), dp(12), dp(6))
        setOnClickListener { onClick() }
        layoutParams = LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
        ).apply { setMargins(0, 0, dp(8), 0) }
    }

    private fun sendDadBot(text: String) {
        if (text.isBlank()) return
        dadBotInput.setText("")

        // Subagent detection: @sub1: … @sub2: …
        val subParts = text.split(Regex("@sub\\d+:")).map { it.trim() }.filter { it.isNotBlank() }
        if (subParts.size > 1) {
            subParts.forEachIndexed { i, part -> launchSubagent(i + 1, part) }
            return
        }

        val userBubble = makeBubble(text, isUser = true)
        val insertIdx = dadBotMessageList.childCount - 1
        dadBotMessageList.addView(userBubble, insertIdx)
        UiAnimations.fadeInSlideUp(userBubble)
        dadBotMessages.add(DadBotMessage("user", text))

        showTyping()

        val botBubbleWrapper = makeBubble("กำลังคิด...", isUser = false)
        liveBotWrapper = botBubbleWrapper
        val contentWrap = botBubbleWrapper.getChildAt(0) as? LinearLayout
        liveBotBubble = (contentWrap?.getChildAt(0) as? TextView)?.also { it.alpha = 0.55f }
        liveBotBuffer = StringBuilder()
        dadBotMessageList.addView(botBubbleWrapper, dadBotMessageList.childCount - 1)

        dadBotScroll.post { dadBotScroll.fullScroll(View.FOCUS_DOWN) }
        scrollToView(dadBotSectionView)

        val memCtx = memoryStore.toContextBlock()

        dadBotClient.chat(dadBotMessages.toList(), object : DadBotCallback {
            override fun onToken(token: String) {
                liveBotBuffer.append(token)
                liveBotBubble?.let { it.alpha = 1f; it.text = liveBotBuffer.toString() + "▋" }
                dadBotScroll.post { dadBotScroll.fullScroll(View.FOCUS_DOWN) }
            }

            override fun onCommand(type: AgentCommandType, target: String, reason: String) {
                // Insert Hermes-style tool call card into chat
                val toolCard = makeToolCallCard(type, target, reason)
                dadBotMessageList.addView(toolCard, dadBotMessageList.childCount - 1)
                UiAnimations.fadeInSlideUp(toolCard)
                val cmd = queueCommand(type, target, reason, "dadbot")
                if (workSessionEnabled && !autonomousModeEnabled) this@MainActivity.runInSessionIfAllowed(cmd)
            }

            override fun onDone() {
                hideTyping()
                val finalText = liveBotBuffer.toString()
                if (finalText.isNotBlank()) {
                    dadBotMessages.add(DadBotMessage("assistant", finalText))
                    liveBotBubble?.setText(renderMarkdown(finalText), TextView.BufferType.SPANNABLE)
                    liveBotWrapper?.let { UiAnimations.fadeInSlideUp(it) }
                    // Auto-capture memory from bot response
                    Regex("(?:จำ|จำไว้ว่า|remember):\\s*(.+)", RegexOption.IGNORE_CASE).find(finalText)?.groupValues?.get(1)?.trim()?.let { captured ->
                        if (captured.length in 3..200) memoryStore.add(captured)
                    }
                    // Auto-capture skill definitions
                    skillStore.parseFromBotResponse(finalText)?.let { newSkill ->
                        skillStore.add(newSkill)
                        val confirmBubble = makeBubble("✅ บันทึก skill: ${newSkill.name}", isUser = false)
                        dadBotMessageList.addView(confirmBubble, dadBotMessageList.childCount - 1)
                        UiAnimations.fadeInSlideUp(confirmBubble)
                    }
                    renderSessionsList()
                } else {
                    liveBotWrapper?.visibility = View.GONE
                }
                liveBotBubble = null; liveBotWrapper = null
                dadBotScroll.post { dadBotScroll.fullScroll(View.FOCUS_DOWN) }
            }

            override fun onError(message: String) {
                hideTyping()
                liveBotBubble?.let {
                    it.text = "⚠️ $message"
                    val fallbackCmds = planFromPrompt(dadBotMessages.lastOrNull { m -> m.role == "user" }?.content ?: "")
                    if (fallbackCmds.isNotEmpty()) {
                        it.text = "⚠️ $message\n\n▶ ใช้งาน offline แทน: ${fallbackCmds.joinToString(", ") { c -> c.type.name }}"
                        fallbackCmds.forEach { mapped ->
                            val cmd = this@MainActivity.queueCommand(mapped.type, mapped.target, "DadBot offline: ${mapped.type.name}", "dadbot-fallback")
                            if (workSessionEnabled || autonomousModeEnabled) this@MainActivity.runInSessionIfAllowed(cmd)
                        }
                    }
                }
                liveBotBubble = null; liveBotWrapper = null
            }
        }, memCtx)
    }

    private fun launchSubagent(index: Int, prompt: String) {
        subagentCount++
        subagentChip?.let { it.text = "🤖 Subagents ($subagentCount running)"; it.visibility = View.VISIBLE }

        val wrapperRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.START
            setPadding(0, dp(3), 0, dp(3))
        }
        val bubble = TextView(this).apply {
            text = "🤖 Sub $index: กำลังคิด..."
            textSize = 13f
            setTextColor(COLOR_HERMES_CREAM)
            background = GradientDrawable().apply {
                setColor(COLOR_HERMES_TEAL)
                cornerRadius = dp(14).toFloat()
                setStroke(dp(1), COLOR_HERMES_AMBER)
            }
            setPadding(dp(12), dp(9), dp(12), dp(9))
            maxWidth = (resources.displayMetrics.widthPixels * 0.78).toInt()
        }
        wrapperRow.addView(bubble, LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
            marginEnd = (resources.displayMetrics.widthPixels * 0.08).toInt()
        })
        dadBotMessageList.addView(wrapperRow, dadBotMessageList.childCount - 1)
        UiAnimations.fadeInSlideUp(wrapperRow)

        val buf = StringBuilder()
        val memCtx = memoryStore.toContextBlock()
        dadBotClient.chat(listOf(DadBotMessage("user", prompt)), object : DadBotCallback {
            override fun onToken(token: String) {
                buf.append(token)
                bubble.text = "🤖 Sub $index: ${buf}▋"
                dadBotScroll.post { dadBotScroll.fullScroll(View.FOCUS_DOWN) }
            }
            override fun onCommand(type: AgentCommandType, target: String, reason: String) {
                queueCommand(type, target, reason, "subagent-$index")
            }
            override fun onDone() {
                bubble.text = "🤖 Sub $index: $buf"
                subagentCount = maxOf(0, subagentCount - 1)
                if (subagentCount == 0) subagentChip?.visibility = View.GONE
            }
            override fun onError(message: String) {
                bubble.text = "🤖 Sub $index ⚠️ $message"
                subagentCount = maxOf(0, subagentCount - 1)
                if (subagentCount == 0) subagentChip?.visibility = View.GONE
            }
        }, memCtx)
    }

    private fun showTyping() {
        typingRow.visibility = View.VISIBLE
        typingAnimators = UiAnimations.startTypingPulse(listOf(typingDot1))
        UiAnimations.fadeInSlideUp(typingDot2, delayMs = 200)
        UiAnimations.fadeInSlideUp(typingDot3, delayMs = 400)
        dadBotScroll.post { dadBotScroll.fullScroll(View.FOCUS_DOWN) }
    }

    private fun hideTyping() {
        UiAnimations.stopTypingPulse(typingAnimators)
        typingAnimators = emptyList()
        typingRow.visibility = View.GONE
        typingDot2.alpha = 0f
        typingDot3.alpha = 0f
    }

    private fun addSessionsSection(root: LinearLayout) {
        val box = card(COLOR_HERMES_TEAL, stroke = COLOR_HERMES_AMBER).apply { setPadding(dp(16), dp(16), dp(16), dp(16)) }
        val headerRow = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL; setPadding(0, 0, 0, dp(10)) }
        headerRow.addView(TextView(this).apply {
            text = "🗂 Sessions"; textSize = 17f; typeface = Typeface.DEFAULT_BOLD
            setTextColor(COLOR_HERMES_CREAM)
        }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        headerRow.addView(compactButton("New Chat", ButtonTone.SECONDARY) {
            dadBotMessages.clear()
            // Keep only greeting + typingRow; clear everything else
            while (dadBotMessageList.childCount > 2) dadBotMessageList.removeViewAt(dadBotMessageList.childCount - 2)
            renderSessionsList()
            dadBotScroll.post { dadBotScroll.fullScroll(View.FOCUS_DOWN) }
        })
        box.addView(headerRow)
        sessionsListView = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        box.addView(sessionsListView)
        sessionsSectionView = box
        addWithMargin(root, box, bottom = 12)
        renderSessionsList()
    }

    private fun renderSessionsList() {
        val list = sessionsListView ?: return
        list.removeAllViews()
        if (dadBotMessages.isEmpty()) {
            list.addView(TextView(this).apply {
                text = "No sessions yet — start chatting above"; textSize = 12f
                setTextColor(COLOR_TEXT_MUTED_DARK); setPadding(0, dp(4), 0, 0)
            })
            return
        }
        dadBotMessages.forEach { msg ->
            val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL; setPadding(0, dp(4), 0, dp(4)) }
            val badge = if (msg.role == "user") "👤" else "🤖"
            row.addView(TextView(this).apply { text = badge; textSize = 13f; setPadding(0, 0, dp(8), 0) })
            val preview = msg.content.take(60).replace("\n", " ") + if (msg.content.length > 60) "…" else ""
            row.addView(TextView(this).apply {
                text = preview; textSize = 12f; setTextColor(COLOR_TEXT_SOFT_DARK)
            }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            list.addView(row)
        }
    }

    private fun addMemorySection(root: LinearLayout) {
        val box = card(COLOR_HERMES_TEAL, stroke = COLOR_HERMES_AMBER).apply { setPadding(dp(16), dp(16), dp(16), dp(16)) }
        val headerRow = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL; setPadding(0, 0, 0, dp(10)) }
        headerRow.addView(TextView(this).apply {
            text = "🧠 Memory"; textSize = 17f; typeface = Typeface.DEFAULT_BOLD
            setTextColor(COLOR_HERMES_CREAM)
        }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        headerRow.addView(compactButton("Clear All", ButtonTone.DANGER) {
            memoryStore.clear(); renderMemoryList()
        })
        box.addView(headerRow)

        // Inline add row
        val addRow = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL; setPadding(0, 0, 0, dp(8)) }
        val addInput = EditText(this).apply {
            hint = "เพิ่มความจำ..."; textSize = 13f; maxLines = 2
            setTextColor(COLOR_TEXT_SOFT_DARK); setHintTextColor(COLOR_TEXT_MUTED_DARK)
            background = rounded(COLOR_SURFACE_DARK_2, 12, COLOR_BORDER_DARK, 1)
            setPadding(dp(10), dp(6), dp(10), dp(6))
        }
        addRow.addView(addInput, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply { marginEnd = dp(8) })
        addRow.addView(Button(this).apply {
            text = "+ Add"; textSize = 12f; isAllCaps = false
            setTextColor(Color.WHITE); background = rounded(COLOR_PRIMARY, 12)
            setOnClickListener {
                val txt = addInput.text.toString().trim()
                if (txt.isNotBlank()) { memoryStore.add(txt); addInput.setText(""); renderMemoryList() }
            }
        }, LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dp(40)))
        box.addView(addRow)

        memoryListView = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        box.addView(memoryListView)
        memorySectionView = box
        addWithMargin(root, box, bottom = 12)
        renderMemoryList()
    }

    private fun renderMemoryList() {
        val list = memoryListView ?: return
        list.removeAllViews()
        val entries = memoryStore.list()
        if (entries.isEmpty()) {
            list.addView(TextView(this).apply { text = "No memories yet"; textSize = 12f; setTextColor(COLOR_TEXT_MUTED_DARK) })
            return
        }
        entries.forEach { entry ->
            val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL; setPadding(0, dp(3), 0, dp(3)) }
            row.addView(TextView(this).apply { text = "●"; textSize = 12f; setTextColor(COLOR_HERMES_AMBER); setPadding(0, 0, dp(8), 0) })
            row.addView(TextView(this).apply {
                text = entry.content; textSize = 12f; setTextColor(COLOR_TEXT_SOFT_DARK)
            }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            row.addView(TextView(this).apply {
                text = "×"; textSize = 16f; setTextColor(COLOR_RED)
                setPadding(dp(8), 0, 0, 0)
                setOnClickListener { memoryStore.delete(entry.id); renderMemoryList() }
            })
            list.addView(row)
        }
    }

    private fun addSkillsSection(root: LinearLayout) {
        val box = card().apply { setPadding(dp(16), dp(16), dp(16), dp(16)) }
        box.addView(sectionHeader("🛠 Skills", "Built-in commands + custom learned skills"))

        // Built-in commands grid by category
        data class SkillEntry(val icon: String, val label: String, val type: AgentCommandType, val target: String)
        val categories = mapOf(
            "Navigation" to listOf(
                SkillEntry("↩️", "Back", AgentCommandType.BACK, "GLOBAL_BACK"),
                SkillEntry("🏠", "Home", AgentCommandType.HOME, "GLOBAL_HOME"),
                SkillEntry("⬇️", "Scroll", AgentCommandType.SCROLL_DOWN, "FOCUSED_OR_ROOT_NODE"),
                SkillEntry("🔗", "URL...", AgentCommandType.OPEN_URL, DsgConfig.STATUS_URL),
                SkillEntry("📱", "Settings", AgentCommandType.OPEN_SETTINGS, ""),
            ),
            "Files" to listOf(
                SkillEntry("📁", "List Files", AgentCommandType.FILE_LIST_ROOT, FullFileManager.rootPath().absolutePath),
                SkillEntry("👁", "Preview", AgentCommandType.FILE_PREVIEW, ""),
                SkillEntry("📤", "Send→Claw", AgentCommandType.FILE_SEND_TO_CLAW, "selected-files://local"),
            ),
            "System" to listOf(
                SkillEntry("📊", "Status", AgentCommandType.STATUS, ""),
                SkillEntry("🔔", "Notifs", AgentCommandType.NOTIFICATION_SUMMARY, ""),
            ),
        )
        categories.forEach { (catName, entries) ->
            box.addView(TextView(this).apply {
                text = catName; textSize = 12f; typeface = Typeface.DEFAULT_BOLD
                setTextColor(COLOR_HERMES_AMBER); setPadding(0, dp(8), 0, dp(4))
            })
            val row1 = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
            val row2 = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
            entries.forEachIndexed { i, e ->
                val targetRow = if (i < 3) row1 else row2
                val card2 = LinearLayout(this).apply {
                    orientation = LinearLayout.VERTICAL
                    background = GradientDrawable().apply {
                        setColor(COLOR_SURFACE_DARK_2); cornerRadius = dp(10).toFloat()
                        setStroke(dp(2), COLOR_HERMES_AMBER)
                    }
                    setPadding(dp(8), dp(8), dp(8), dp(8))
                }
                card2.addView(TextView(this).apply { text = "${e.icon} ${e.label}"; textSize = 11f; typeface = Typeface.DEFAULT_BOLD; setTextColor(Color.WHITE) })
                card2.addView(Button(this).apply {
                    text = "▶ Queue"; textSize = 10f; isAllCaps = false
                    setTextColor(COLOR_HERMES_AMBER); background = rounded(COLOR_CARD_ALT, 8)
                    setPadding(0, dp(2), 0, dp(2))
                    setOnClickListener {
                        UiAnimations.buttonPressScale(this)
                        val cmd = queueCommand(e.type, e.target, "Skill: ${e.label}", "skills-panel")
                        runInSessionIfAllowed(cmd)
                    }
                }, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(30)).apply { topMargin = dp(4) })
                targetRow.addView(card2, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply { setMargins(0, 0, dp(6), dp(6)) })
            }
            box.addView(row1)
            if (row2.childCount > 0) box.addView(row2)
        }

        // Custom skills
        val customHeader = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL; setPadding(0, dp(8), 0, dp(4)) }
        customHeader.addView(TextView(this).apply {
            text = "Custom Skills (${skillStore.list().size})"; textSize = 12f; typeface = Typeface.DEFAULT_BOLD
            setTextColor(COLOR_HERMES_CREAM)
        }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        box.addView(customHeader)

        val customList = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        skillStore.list().forEach { skill ->
            val cRow = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL; setPadding(0, dp(4), 0, dp(4)) }
            cRow.addView(TextView(this).apply {
                text = "📋 ${skill.name}  (${skill.steps.joinToString("+") { it.name }})"; textSize = 12f; setTextColor(COLOR_TEXT_SOFT_DARK)
            }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            cRow.addView(Button(this).apply {
                text = "▶"; textSize = 11f; isAllCaps = false
                setTextColor(COLOR_HERMES_AMBER); background = rounded(COLOR_CARD_ALT, 8)
                setOnClickListener {
                    skill.steps.forEachIndexed { i, type ->
                        val cmd = queueCommand(type, skill.targets.getOrElse(i) { "" }, "Skill: ${skill.name} step ${i + 1}", "custom-skill")
                        runInSessionIfAllowed(cmd)
                    }
                }
            }, LinearLayout.LayoutParams(dp(36), dp(36)).apply { marginStart = dp(6) })
            cRow.addView(Button(this).apply {
                text = "×"; textSize = 14f; isAllCaps = false
                setTextColor(COLOR_RED); background = rounded(COLOR_CARD_ALT, 8)
                setOnClickListener { skillStore.delete(skill.id); render() }
            }, LinearLayout.LayoutParams(dp(36), dp(36)).apply { marginStart = dp(4) })
            customList.addView(cRow)
        }
        if (skillStore.list().isEmpty()) {
            customList.addView(TextView(this).apply { text = "No custom skills yet. DadBot can create them automatically."; textSize = 12f; setTextColor(COLOR_TEXT_MUTED_DARK) })
        }
        box.addView(customList)

        // Kill switch
        addWithMargin(box, actionButton("Kill Switch: Clear All Pending", "Owner emergency stop", ButtonTone.DANGER) {
            val count = commandStore.clearPending()
            auditLogStore.append("KILL_SWITCH_CLEAR_PENDING", "local", "Owner cleared $count pending command(s)")
            refreshUi("Kill switch cleared $count pending command(s)")
        }, top = 8)

        commandListView = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(0, dp(6), 0, 0) }
        box.addView(commandListView)
        skillsSectionView = box
        addWithMargin(root, box, bottom = 12)
    }

    private fun addCronSection(root: LinearLayout) {
        val box = card(COLOR_HERMES_TEAL, stroke = COLOR_HERMES_AMBER).apply { setPadding(dp(16), dp(16), dp(16), dp(16)) }
        box.addView(TextView(this).apply {
            text = "⏰ Cron / Scheduler"; textSize = 17f; typeface = Typeface.DEFAULT_BOLD
            setTextColor(COLOR_HERMES_CREAM); setPadding(0, 0, 0, dp(10))
        })

        // Add form
        val promptInput = EditText(this).apply {
            hint = "Prompt ที่จะส่งให้ DadBot..."; textSize = 13f; maxLines = 2
            setTextColor(COLOR_TEXT_SOFT_DARK); setHintTextColor(COLOR_TEXT_MUTED_DARK)
            background = rounded(COLOR_SURFACE_DARK_2, 10, COLOR_BORDER_DARK, 1)
            setPadding(dp(10), dp(6), dp(10), dp(6))
        }
        val intervalInput = EditText(this).apply {
            hint = "นาที"; textSize = 13f; maxLines = 1
            inputType = android.text.InputType.TYPE_CLASS_NUMBER
            setTextColor(COLOR_TEXT_SOFT_DARK); setHintTextColor(COLOR_TEXT_MUTED_DARK)
            background = rounded(COLOR_SURFACE_DARK_2, 10, COLOR_BORDER_DARK, 1)
            setPadding(dp(10), dp(6), dp(10), dp(6))
        }
        addWithMargin(box, promptInput, bottom = 6)
        val addFormRow = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        addFormRow.addView(intervalInput, LinearLayout.LayoutParams(0, dp(40), 1f).apply { marginEnd = dp(8) })
        addFormRow.addView(Button(this).apply {
            text = "+ Add"; textSize = 12f; isAllCaps = false
            setTextColor(Color.WHITE); background = rounded(COLOR_PRIMARY, 12)
            setOnClickListener {
                val prompt = promptInput.text.toString().trim()
                val mins = intervalInput.text.toString().toIntOrNull() ?: 60
                if (prompt.isNotBlank()) {
                    val task = com.dsg.agent.automation.ScheduledTask(
                        id = ScheduledTaskStore.newId(), prompt = prompt,
                        intervalMinutes = mins, enabled = true,
                        nextRunAt = System.currentTimeMillis() + mins * 60_000L, lastRunAt = 0L,
                    )
                    scheduledTaskStore.add(task)
                    scheduledTaskStore.scheduleTask(task)
                    promptInput.setText(""); intervalInput.setText("")
                    renderCronList()
                }
            }
        }, LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dp(40)))
        addWithMargin(box, addFormRow, bottom = 10)

        cronListView = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        box.addView(cronListView)
        cronSectionView = box
        addWithMargin(root, box, bottom = 12)
        renderCronList()
    }

    private fun renderCronList() {
        val list = cronListView ?: return
        list.removeAllViews()
        val tasks = scheduledTaskStore.list()
        if (tasks.isEmpty()) {
            list.addView(TextView(this).apply { text = "No scheduled tasks yet"; textSize = 12f; setTextColor(COLOR_TEXT_MUTED_DARK) })
            return
        }
        tasks.forEach { task ->
            val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL; setPadding(0, dp(4), 0, dp(4)) }
            val dot = if (task.enabled) "●" else "○"
            row.addView(TextView(this).apply {
                text = "$dot \"${task.prompt.take(30)}${if (task.prompt.length > 30) "…" else ""}\" every ${task.intervalMinutes}m"
                textSize = 11f; setTextColor(if (task.enabled) COLOR_HERMES_CREAM else COLOR_TEXT_MUTED_DARK)
            }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            row.addView(Button(this).apply {
                text = if (task.enabled) "⏸" else "▶"; textSize = 13f; isAllCaps = false
                setTextColor(COLOR_HERMES_AMBER); background = rounded(COLOR_CARD_ALT, 8)
                setOnClickListener {
                    scheduledTaskStore.update(task.id) { it.copy(enabled = !it.enabled) }
                    renderCronList()
                }
            }, LinearLayout.LayoutParams(dp(36), dp(36)).apply { marginStart = dp(6) })
            row.addView(Button(this).apply {
                text = "×"; textSize = 14f; isAllCaps = false
                setTextColor(COLOR_RED); background = rounded(COLOR_CARD_ALT, 8)
                setOnClickListener { scheduledTaskStore.delete(task.id); renderCronList() }
            }, LinearLayout.LayoutParams(dp(36), dp(36)).apply { marginStart = dp(4) })
            list.addView(row)
        }
    }

    private fun addGatewaySection(root: LinearLayout) {
        val box = card(COLOR_HERMES_TEAL, stroke = COLOR_HERMES_AMBER).apply { setPadding(dp(16), dp(16), dp(16), dp(16)) }
        val headerRow = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL; setPadding(0, 0, 0, dp(10)) }
        gatewayStatusDot = TextView(this).apply { text = "● Offline"; textSize = 12f; setTextColor(COLOR_RED) }
        headerRow.addView(TextView(this).apply {
            text = "🌐 Gateway"; textSize = 17f; typeface = Typeface.DEFAULT_BOLD; setTextColor(COLOR_HERMES_CREAM)
        }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        headerRow.addView(gatewayStatusDot)
        box.addView(headerRow)

        val telegramPrefs = getSharedPreferences("dsg_telegram_prefs", MODE_PRIVATE)
        val tokenInput = EditText(this).apply {
            hint = "Telegram Bot Token"; textSize = 13f; maxLines = 1
            setText(telegramPrefs.getString("token", ""))
            setTextColor(COLOR_TEXT_SOFT_DARK); setHintTextColor(COLOR_TEXT_MUTED_DARK)
            background = rounded(COLOR_SURFACE_DARK_2, 10, COLOR_BORDER_DARK, 1)
            setPadding(dp(10), dp(6), dp(10), dp(6))
        }
        val chatIdInput = EditText(this).apply {
            hint = "Allowed Chat ID"; textSize = 13f; maxLines = 1
            inputType = android.text.InputType.TYPE_CLASS_NUMBER or android.text.InputType.TYPE_NUMBER_FLAG_SIGNED
            setText(telegramPrefs.getString("chatId", ""))
            setTextColor(COLOR_TEXT_SOFT_DARK); setHintTextColor(COLOR_TEXT_MUTED_DARK)
            background = rounded(COLOR_SURFACE_DARK_2, 10, COLOR_BORDER_DARK, 1)
            setPadding(dp(10), dp(6), dp(10), dp(6))
        }
        addWithMargin(box, tokenInput, bottom = 6)
        addWithMargin(box, chatIdInput, bottom = 10)

        val btnRow = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        btnRow.addView(compactButton("Start Telegram", ButtonTone.PRIMARY) {
            val token = tokenInput.text.toString().trim()
            val chatId = chatIdInput.text.toString().trim()
            if (token.isNotBlank()) {
                telegramPrefs.edit().putString("token", token).putString("chatId", chatId).apply()
                telegramGateway.start(token, chatId)
                gatewayStatusDot?.text = "● Live"; gatewayStatusDot?.setTextColor(COLOR_GREEN)
                auditLogStore.append("TELEGRAM_GATEWAY_START", "owner", "Telegram gateway started")
            }
        })
        btnRow.addView(compactButton("Stop", ButtonTone.SECONDARY) {
            telegramGateway.stop()
            gatewayStatusDot?.text = "● Offline"; gatewayStatusDot?.setTextColor(COLOR_RED)
        })
        box.addView(btnRow)

        // Local API subsection — OpenAI + Anthropic compatible HTTP server on port 8642
        box.addView(TextView(this).apply {
            text = "──── Local API ────"; textSize = 11f
            setTextColor(COLOR_HERMES_AMBER); setPadding(0, dp(10), 0, dp(4))
        })
        val apiStatusRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL
            setPadding(0, 0, 0, dp(6))
        }
        localApiStatusDot = TextView(this).apply { text = "● Offline"; textSize = 12f; setTextColor(COLOR_RED) }
        apiStatusRow.addView(localApiStatusDot!!, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        box.addView(apiStatusRow)
        val apiBtnRow = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        apiBtnRow.addView(compactButton("Start Local API", ButtonTone.PRIMARY) {
            localApiServer.start()
            val ip = localApiServer.getLocalIp()
            localApiStatusDot?.text = "● http://$ip:${LocalApiServer.DEFAULT_PORT}"
            localApiStatusDot?.setTextColor(COLOR_GREEN)
            auditLogStore.append("LOCAL_API_START", "owner", "Local API started on $ip:${LocalApiServer.DEFAULT_PORT}")
        })
        apiBtnRow.addView(compactButton("Stop", ButtonTone.SECONDARY) {
            localApiServer.stop()
            localApiStatusDot?.text = "● Offline"
            localApiStatusDot?.setTextColor(COLOR_RED)
        })
        box.addView(apiBtnRow)
        box.addView(TextView(this).apply {
            text = "  POST /v1/chat/completions (OpenAI)  ·  POST /v1/messages (Anthropic)"
            textSize = 10f; setTextColor(COLOR_TEXT_MUTED_DARK); setPadding(0, dp(4), 0, 0)
        })

        box.addView(TextView(this).apply {
            text = "Discord / Slack / WhatsApp — coming soon"; textSize = 11f
            setTextColor(COLOR_TEXT_MUTED_DARK); setPadding(0, dp(8), 0, 0)
        })
        gatewaySectionView = box
        addWithMargin(root, box, bottom = 12)
    }

    // ── Hermes Runtime (backend-connected) ──────────────────────────────
    // The APK is a thin client over the control-plane Hermes + Nous pipeline.
    // No on-device model. Flow: Install → Start → Connect Nous → Test reply.
    private fun addHermesRuntimeSection(root: LinearLayout) {
        val box = card(COLOR_SURFACE_DARK, stroke = COLOR_BORDER_DARK).apply {
            setPadding(dp(16), dp(16), dp(16), dp(16))
        }

        val headerRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, 0, 0, dp(12))
        }
        headerRow.addView(TextView(this).apply {
            text = "⚙"
            textSize = 18f
            gravity = Gravity.CENTER
            setTextColor(Color.WHITE)
            background = rounded(COLOR_PRIMARY, 10)
        }, LinearLayout.LayoutParams(dp(36), dp(36)))
        headerRow.addView(LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(10), 0, 0, 0)
            addView(TextView(this@MainActivity).apply {
                text = "Hermes Runtime"
                textSize = 17f
                typeface = Typeface.DEFAULT_BOLD
                setTextColor(Color.WHITE)
            })
            addView(TextView(this@MainActivity).apply {
                text = "APK + Nous + DSG · backend-connected runtime"
                textSize = 11f
                setTextColor(COLOR_TEXT_MUTED_DARK)
            })
        }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        box.addView(headerRow)

        hermesStatusView = TextView(this).apply {
            textSize = 12f
            setTextColor(COLOR_TEXT_SOFT_DARK)
            background = rounded(COLOR_SURFACE_DARK_2, 14, COLOR_BORDER_DARK, 1)
            setPadding(dp(14), dp(12), dp(14), dp(12))
        }
        box.addView(hermesStatusView)

        val row1 = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(0, dp(12), 0, 0)
        }
        row1.addView(compactButton("① Install Runtime", ButtonTone.PRIMARY) { onInstallHermes() })
        row1.addView(compactButton("② Start Hermes", ButtonTone.SECONDARY) { onStartHermes() })
        box.addView(row1)

        val row2 = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(0, dp(8), 0, 0)
        }
        row2.addView(compactButton("③ Connect Nous", ButtonTone.SECONDARY) { onConnectNous() })
        row2.addView(compactButton("④ Test reply", ButtonTone.SECONDARY) { onTestHermesReply() })
        box.addView(row2)

        hermesSectionView = box
        addWithMargin(root, box, bottom = 12)
        updateHermesStatus()
    }

    private fun hermesStatusSummary(): String {
        val h = hermesHealth
        val sb = StringBuilder()
        sb.append(if (hermesInstalled) "✅" else "○").append(" ① Install runtime")
        if (hermesInstalled && h != null) {
            sb.append("  —  ").append(h.description.ifBlank { "${h.provider} / ${h.model}" })
        }
        sb.append("\n")
        sb.append(if (hermesStarted) "✅" else "○").append(" ② Start Hermes")
        if (h != null) sb.append("  —  status=").append(h.status)
        sb.append("\n")
        sb.append(if (hermesNousConnected) "✅" else "○").append(" ③ Connect Nous")
        when {
            hermesNousConnected && h != null ->
                sb.append("  —  ").append(h.hosting ?: "nous").append(" / ").append(h.model)
            hermesStarted && h != null && h.provider != "nous-hermes" ->
                sb.append("  —  provider=").append(h.provider).append(" (Nous not set on backend)")
        }
        sb.append("\n")
        sb.append(hermesTestResult ?: "○ ④ Test reply  —  expect \"ok\"")
        return sb.toString()
    }

    private fun updateHermesStatus() {
        hermesStatusView?.text = hermesStatusSummary()
    }

    private fun hermesHint(msg: String) {
        hermesStatusView?.text = "${hermesStatusSummary()}\n\n⚠ $msg"
    }

    private fun onInstallHermes() {
        hermesStatusView?.text = "⏳ Installing Hermes runtime… (checking backend)"
        auditLogStore.append("HERMES_INSTALL", "owner", "Owner requested Hermes runtime install (backend health check)")
        hermesRuntimeClient.health { health ->
            hermesHealth = health
            hermesStarted = false
            hermesNousConnected = false
            hermesTestResult = null
            if (health.reachable) {
                hermesInstalled = true
                auditLogStore.append(
                    "HERMES_INSTALLED", "system",
                    "Backend reachable: provider=${health.provider} model=${health.model} status=${health.status}",
                )
            } else {
                hermesInstalled = false
                auditLogStore.append("HERMES_INSTALL_FAILED", "system", "Backend unreachable: ${health.error ?: "unknown"}")
            }
            updateHermesStatus()
        }
    }

    private fun onStartHermes() {
        if (!hermesInstalled) { hermesHint("Install the Hermes runtime first."); return }
        val h = hermesHealth
        hermesNousConnected = false
        hermesTestResult = null
        if (h != null && h.configured && h.status == "ready") {
            hermesStarted = true
            auditLogStore.append("HERMES_STARTED", "owner", "Hermes runtime started (status=ready, provider=${h.provider})")
            updateHermesStatus()
        } else {
            hermesStarted = false
            auditLogStore.append(
                "HERMES_START_BLOCKED", "system",
                "Backend not ready: status=${h?.status ?: "unknown"} configured=${h?.configured ?: false}",
            )
            hermesHint("Backend not ready (status=${h?.status ?: "unknown"}). Server-side keys may be missing.")
        }
    }

    private fun onConnectNous() {
        if (!hermesStarted) { hermesHint("Start Hermes first."); return }
        hermesStatusView?.text = "${hermesStatusSummary()}\n\n⏳ Connecting Nous… (re-checking provider)"
        hermesRuntimeClient.health { health ->
            hermesHealth = health
            hermesNousConnected = health.provider == "nous-hermes"
            if (hermesNousConnected) {
                auditLogStore.append("HERMES_NOUS_CONNECTED", "system", "Connected to Nous via ${health.hosting ?: "unknown"} (${health.model})")
                updateHermesStatus()
            } else {
                auditLogStore.append(
                    "HERMES_NOUS_UNAVAILABLE", "system",
                    "Backend provider=${health.provider}; Nous not configured server-side (needs TOGETHER_API_KEY/OPENROUTER_API_KEY)",
                )
                hermesHint("Nous not configured on backend (provider=${health.provider}). Test reply still works via ${health.provider}.")
            }
        }
    }

    private fun onTestHermesReply() {
        if (!hermesStarted) { hermesHint("Start Hermes first."); return }
        hermesTestResult = "⏳ ④ Test reply: sending…"
        updateHermesStatus()
        auditLogStore.append("HERMES_TEST_REPLY", "owner", "Owner ran Hermes test reply")
        hermesRuntimeClient.testReply("Reply with exactly one word: ok") { ok, reply ->
            val provider = hermesHealth?.provider ?: "backend"
            if (ok) {
                auditLogStore.append("HERMES_TEST_REPLY_OK", "system", "Reply via $provider: ${reply.take(80)}")
            } else {
                auditLogStore.append("HERMES_TEST_REPLY_FAIL", "system", "Test reply failed: ${reply.take(120)}")
            }
            hermesTestResult = "${if (ok) "✅" else "❌"} ④ Test reply: $reply"
            updateHermesStatus()
        }
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
            val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION).apply {
                data = Uri.parse("package:$packageName")
            }
            runCatching { startActivity(intent) }.getOrElse {
                startActivity(Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION))
            }
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
        fileSectionView = box
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
        skillsSectionView = box
        addWithMargin(root, box, bottom = 12)
    }

    private fun addLogsSection(root: LinearLayout) {
        val box = card(COLOR_HERMES_TEAL, stroke = COLOR_HERMES_AMBER).apply { setPadding(dp(16), dp(16), dp(16), dp(16)) }
        box.addView(TextView(this).apply {
            text = "📋 Logs"; textSize = 17f; typeface = Typeface.DEFAULT_BOLD
            setTextColor(COLOR_HERMES_CREAM); setPadding(0, 0, 0, dp(10))
        })
        val logScroll = ScrollView(this).apply {
            background = rounded(COLOR_SURFACE_DARK_2, 10, COLOR_BORDER_DARK, 1)
        }
        logsListView = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(10), dp(8), dp(10), dp(8))
        }
        logScroll.addView(logsListView)
        box.addView(logScroll, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(200)))
        // Keep auditView for backward-compat (used in renderAuditLog)
        auditView = TextView(this).apply { visibility = View.GONE }
        box.addView(auditView)
        logsSectionView = box
        addWithMargin(root, box)
    }

    private fun renderLogsList() {
        val list = logsListView ?: return
        list.removeAllViews()
        val raw = auditLogStore.tail(50)
        if (raw.isBlank()) {
            list.addView(TextView(this).apply { text = "No audit events yet"; textSize = 11f; setTextColor(COLOR_TEXT_MUTED_DARK) })
            return
        }
        raw.split("\n\n").reversed().forEach { entry ->
            if (entry.isBlank()) return@forEach
            val firstLine = entry.lines().firstOrNull() ?: return@forEach
            val color = when {
                firstLine.contains("KILL_SWITCH") || firstLine.contains("FAILED") || firstLine.contains("ERROR") -> COLOR_RED
                firstLine.contains("APPROVED") || firstLine.contains("ENABLED") || firstLine.contains("EXECUTED") || firstLine.contains("STARTED") || firstLine.contains("DONE") -> COLOR_GREEN
                firstLine.contains("BLOCKED") || firstLine.contains("REJECTED") || firstLine.contains("WAITING") -> COLOR_HERMES_AMBER
                else -> COLOR_TEXT_MUTED_DARK
            }
            val tv = TextView(this).apply {
                text = "● $firstLine"
                textSize = 10f
                setTextColor(color)
                setPadding(0, dp(2), 0, dp(2))
            }
            list.addView(tv)
        }
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
            else -> emptyList()
        }
    }

    private fun queueCommand(type: AgentCommandType, target: String, reason: String, source: String): AgentCommand {
        commandStore.pruneExpired()
        val command = AgentCommand.create(source, type, target, reason, PermissionGate.requiredPermissionFor(type), true)
        commandStore.add(command)
        auditLogStore.append(
            if (type.name.startsWith("FILE_")) "FILE_ACTION_QUEUED" else "COMMAND_QUEUED",
            command.commandId,
            "Queued ${command.type.name} digest=${command.commandDigest}",
        )
        if (autonomousModeEnabled) {
            auditLogStore.append("AUTONOMOUS_AUTO_EXEC", command.commandId, "Autonomous mode — executing ${command.type.name} without approval dialog")
            approveCommand(command)
        } else {
            refreshUi("Queued ${command.type.name}")
        }
        return command
    }

    private fun runInSessionIfAllowed(command: AgentCommand) {
        if (!workSessionEnabled && !autonomousModeEnabled) return
        if (!sessionCanRun(command)) {
            auditLogStore.append("WORK_SESSION_WAITING", command.commandId, "Manual review required for ${command.type.name}")
            refreshUi("Manual review required for ${command.type.name}")
            return
        }
        auditLogStore.append("WORK_SESSION_RUN", command.commandId, "Running ${command.type.name} in active work session")
        approveCommand(command)
    }

    private fun sessionCanRun(command: AgentCommand): Boolean {
        if (autonomousModeEnabled) return true
        val effLevel = maxOf(autonomyLevel, if (workSessionEnabled) 1 else 0)
        return AutonomyDial.decide(effLevel, AutonomyDial.tierOf(command.type)) == AutonomyDial.Decision.AUTO
    }

    private fun refreshUi(extra: String? = null) {
        statusView.text = buildStatusText(extra)
        if (::filePreviewView.isInitialized && permissionGate.isFullFileManagerEnabled() && !fileListRendered) {
            filePreviewView.text = "Full file manager permission enabled. Start Work Session, then ask: แสดงไฟล์"
        }
        renderCommands()
        renderLogsList()
        renderSessionsList()
    }

    private fun renderCommands() {
        commandListView.removeAllViews()
        val pending = commandStore.listPending()
        if (pending.isEmpty()) {
            commandListView.addView(TextView(this).apply {
                text = if (workSessionEnabled || autonomousModeEnabled) "No pending commands. Session active." else "No pending commands."
                textSize = 13f
                setTextColor(COLOR_TEXT_MUTED)
                setPadding(0, dp(8), 0, 0)
            })
            return
        }
        pending.forEach { command ->
            val item = card(COLOR_CARD_ALT, radius = 18, stroke = COLOR_BORDER).apply { setPadding(dp(14), dp(14), dp(14), dp(14)) }
            UiAnimations.fadeInSlideUp(item)
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
        // Safety floor: irreversible/destructive (Tier 2) actions always run the
        // sensitive-file block even at L3 autonomous.
        if (!autonomousModeEnabled || AutonomyDial.isFloorProtected(command.type)) {
            val blockMessage = filePolicyBlock(command)
            if (blockMessage != null) {
                commandStore.markBlocked(command.commandId, blockMessage)
                auditLogStore.append("FILE_ACTION_BLOCKED", command.commandId, blockMessage, AgentErrorCodes.FILE_SENSITIVE_REVIEW_REQUIRED)
                refreshUi(blockMessage)
                return
            }
        }
        // Safety floor: Tier-2 actions never bypass the permission gate, even at L3.
        val gate = permissionGate.evaluate(command, autonomousModeEnabled && !AutonomyDial.isFloorProtected(command.type))
        if (!gate.allowed) {
            if (gate.errorCode == AgentErrorCodes.PERMISSION_REQUIRED) {
                commandStore.markWaitingPermission(command.commandId, gate.message)
            } else {
                commandStore.markBlocked(command.commandId, gate.message)
            }
            auditLogStore.append(
                if (command.type.name.startsWith("FILE_")) "FILE_ACTION_BLOCKED" else "COMMAND_BLOCKED",
                command.commandId, gate.message, gate.errorCode,
            )
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
        auditLogStore.append(
            if (signed.type.name.startsWith("FILE_")) "FILE_ACTION_APPROVED" else "COMMAND_APPROVED",
            signed.commandId, "Owner approved signed digest=${signed.commandDigest}",
        )
        commandStore.markApproved(signed.commandId, signed.approvalSignature!!)
        val result = executeCommand(signed)
        if (result.success) {
            commandStore.markExecuted(signed.commandId)
            auditLogStore.append(
                if (signed.type.name.startsWith("FILE_")) "FILE_ACTION_EXECUTED" else "COMMAND_EXECUTED",
                signed.commandId, result.message,
            )
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
                if (launchIntent == null) {
                    CommandExecutionResult(false, "Package not launchable: ${command.target}", "PACKAGE_NOT_LAUNCHABLE")
                } else {
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
        renderLogsList()
    }

    private fun buildStatusText(extra: String? = null): String = listOfNotNull(
        "Backend: ${DsgConfig.BASE_URL}",
        if (autonomousModeEnabled) "⚡ AUTONOMOUS MODE: ON — all gates bypassed" else "Mode: no-code · work-session · signed execution · audit",
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
            setOnClickListener {
                UiAnimations.buttonPressScale(this)
                onClick()
            }
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

    private fun tab(label: String, active: Boolean, onClick: () -> Unit = {}): TextView = TextView(this).apply {
        text = label
        textSize = 13f
        typeface = Typeface.DEFAULT_BOLD
        gravity = Gravity.CENTER
        setTextColor(if (active) Color.WHITE else COLOR_TEXT_MUTED)
        background = rounded(if (active) COLOR_PRIMARY else COLOR_CARD, 22, if (active) COLOR_PRIMARY else COLOR_BORDER, 1)
        setPadding(dp(16), 0, dp(16), 0)
        layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dp(42)).apply { setMargins(0, 0, dp(8), 0) }
        setOnClickListener { onClick() }
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
        view.layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
            setMargins(0, 0, 0, dp(bottom))
        }
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
    private fun buttonBg(tone: ButtonTone): Int = when (tone) { ButtonTone.PRIMARY -> COLOR_PRIMARY; ButtonTone.SECONDARY -> COLOR_CARD_ALT; ButtonTone.WARNING -> COLOR_WARNING_SOFT; ButtonTone.DANGER -> COLOR_RED_SOFT }
    private fun buttonBorder(tone: ButtonTone): Int = when (tone) { ButtonTone.PRIMARY -> COLOR_PRIMARY; ButtonTone.SECONDARY -> COLOR_BORDER; ButtonTone.WARNING -> COLOR_WARNING_BORDER; ButtonTone.DANGER -> COLOR_RED_BORDER }
    private fun buttonIcon(tone: ButtonTone): String = when (tone) { ButtonTone.PRIMARY -> "🚀"; ButtonTone.SECONDARY -> "›"; ButtonTone.WARNING -> "⚠️"; ButtonTone.DANGER -> "⛔" }
    private enum class ButtonTone { PRIMARY, SECONDARY, WARNING, DANGER }

    companion object {
        // Kimi dark palette
        private val COLOR_BG = 0xFF0D0D0D.toInt()
        private val COLOR_CARD = 0xFF111111.toInt()
        private val COLOR_CARD_ALT = 0xFF1A1A1A.toInt()
        private val COLOR_BORDER = 0xFF2A2A2A.toInt()
        private val COLOR_TEXT = 0xFFEAEAEA.toInt()
        private val COLOR_TEXT_MUTED = 0xFF888888.toInt()
        private val COLOR_PRIMARY = 0xFFa855f7.toInt()
        private val COLOR_PRIMARY_SOFT = 0xFF7c3aed.toInt()
        @Suppress("unused") private val COLOR_ACCENT_SOFT = 0xFF1A0A2E.toInt()
        @Suppress("unused") private val COLOR_ACCENT_BORDER = 0xFF6D28D9.toInt()
        private val COLOR_WARNING_SOFT = 0xFF2A2010.toInt()
        private val COLOR_WARNING_BORDER = 0xFFFFC66D.toInt()
        private val COLOR_RED = 0xFFFF6B6B.toInt()
        private val COLOR_RED_SOFT = 0xFF2A1010.toInt()
        private val COLOR_RED_BORDER = 0xFFFF6B6B.toInt()
        private val COLOR_GREEN = 0xFF4ade80.toInt()
        private val COLOR_GREEN_SOFT = 0xFF0A2218.toInt()
        private val COLOR_GREEN_BORDER = 0xFF4ade80.toInt()
        private val COLOR_SURFACE_DARK = 0xFF111111.toInt()
        private val COLOR_SURFACE_DARK_2 = 0xFF1A1A1A.toInt()
        private val COLOR_BORDER_DARK = 0xFF2A2A2A.toInt()
        private val COLOR_TEXT_MUTED_DARK = 0xFF888888.toInt()
        private val COLOR_TEXT_SOFT_DARK = 0xFFD0D0D0.toInt()
        // Hermes Agent palette
        private val COLOR_HERMES_TEAL  = 0xFF041C1C.toInt()
        private val COLOR_HERMES_CREAM = 0xFFFFE6CB.toInt()
        private val COLOR_HERMES_AMBER = 0xFFFFBD38.toInt()
    }
}
