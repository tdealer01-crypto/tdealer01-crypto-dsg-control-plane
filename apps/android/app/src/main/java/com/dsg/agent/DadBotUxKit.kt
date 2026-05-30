package com.dsg.agent

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.HorizontalScrollView
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Native Android UX primitives inspired by modern chat assistants.
 *
 * This intentionally does not embed WebView, HTML, Tailwind, CDN fonts, or third-party branding.
 * The APK stays offline-friendly and DSG-branded while MainActivity can reuse these building blocks
 * for DadBot welcome cards, quick actions, and message actions.
 */
object DadBotUxKit {
    data class WelcomePrompt(
        val icon: String,
        val title: String,
        val prompt: String,
    )

    data class MessageAction(
        val label: String,
        val icon: String,
    )

    val defaultWelcomePrompts = listOf(
        WelcomePrompt(
            icon = "🧭",
            title = "ตรวจระบบ",
            prompt = "ตรวจระบบ DSG Agent ให้ครบ แล้วบอกสถานะที่ต้องแก้",
        ),
        WelcomePrompt(
            icon = "📁",
            title = "แสดงไฟล์",
            prompt = "แสดงไฟล์ใน storage ที่มองเห็นได้ พร้อมบอกไฟล์เสี่ยง",
        ),
        WelcomePrompt(
            icon = "⚙️",
            title = "เปิด Settings",
            prompt = "เปิด Android Settings เพื่อจัดการสิทธิ์ของ Agent",
        ),
        WelcomePrompt(
            icon = "↩️",
            title = "ย้อนกลับ",
            prompt = "กด Back หนึ่งครั้งถ้าสิทธิ์ Accessibility พร้อม",
        ),
    )

    val defaultMessageActions = listOf(
        MessageAction("คัดลอก", "⧉"),
        MessageAction("ใช้เป็นคำสั่ง", "↗"),
        MessageAction("บันทึก audit", "✓"),
    )

    fun makeWelcomeGrid(
        context: Context,
        prompts: List<WelcomePrompt> = defaultWelcomePrompts,
        onPrompt: (String) -> Unit,
    ): LinearLayout = LinearLayout(context).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(0, dp(context, 4), 0, dp(context, 8))
        prompts.chunked(2).forEach { rowPrompts ->
            val row = LinearLayout(context).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER
            }
            rowPrompts.forEach { prompt ->
                row.addView(makeWelcomeCard(context, prompt, onPrompt), LinearLayout.LayoutParams(
                    0,
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    1f,
                ).apply { setMargins(0, 0, dp(context, 8), dp(context, 8)) })
            }
            if (rowPrompts.size == 1) {
                row.addView(View(context), LinearLayout.LayoutParams(0, 1, 1f))
            }
            addView(row)
        }
    }

    fun makeQuickChipRow(
        context: Context,
        labels: List<String>,
        onClick: (String) -> Unit,
    ): HorizontalScrollView = HorizontalScrollView(context).apply {
        isHorizontalFadingEdgeEnabled = true
        val row = LinearLayout(context).apply { orientation = LinearLayout.HORIZONTAL }
        labels.forEach { label ->
            row.addView(makeChip(context, label) { onClick(label) })
        }
        addView(row)
    }

    fun makeMessageActions(
        context: Context,
        actions: List<MessageAction> = defaultMessageActions,
        onAction: (MessageAction) -> Unit,
    ): LinearLayout = LinearLayout(context).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.CENTER_VERTICAL
        setPadding(dp(context, 2), dp(context, 4), 0, 0)
        actions.forEach { action ->
            addView(makeActionButton(context, action) { onAction(action) })
        }
    }

    fun makeInputShell(context: Context): GradientDrawable = rounded(
        context = context,
        color = COLOR_SURFACE_DARK_2,
        radiusDp = 18,
        strokeColor = COLOR_PRIMARY_SOFT,
        strokeWidthDp = 1,
    )

    fun makeBotBubbleShell(context: Context): GradientDrawable = rounded(
        context = context,
        color = COLOR_SURFACE_DARK_2,
        radiusDp = 18,
        strokeColor = COLOR_BORDER_DARK,
        strokeWidthDp = 1,
    )

    fun makeUserBubbleShell(context: Context): GradientDrawable = rounded(
        context = context,
        color = COLOR_PRIMARY,
        radiusDp = 18,
    )

    fun normalizeMarkdownPreview(text: String): String {
        if (text.isBlank()) return ""
        return text
            .replace(Regex("```[a-zA-Z0-9_-]*\\n"), "▣ code\n")
            .replace("```", "")
            .replace(Regex("^#{1,3}\\s+", RegexOption.MULTILINE), "")
            .replace("**", "")
            .replace("`", "")
            .trim()
    }

    private fun makeWelcomeCard(
        context: Context,
        prompt: WelcomePrompt,
        onPrompt: (String) -> Unit,
    ): LinearLayout = LinearLayout(context).apply {
        orientation = LinearLayout.VERTICAL
        background = rounded(context, COLOR_SURFACE_DARK_2, 18, COLOR_BORDER_DARK, 1)
        setPadding(dp(context, 12), dp(context, 10), dp(context, 12), dp(context, 10))
        setOnClickListener { onPrompt(prompt.prompt) }
        addView(TextView(context).apply {
            text = prompt.icon
            textSize = 18f
            setTextColor(Color.WHITE)
        })
        addView(TextView(context).apply {
            text = prompt.title
            textSize = 13f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.WHITE)
            setPadding(0, dp(context, 5), 0, dp(context, 3))
        })
        addView(TextView(context).apply {
            text = prompt.prompt
            textSize = 11f
            setTextColor(COLOR_TEXT_MUTED_DARK)
            maxLines = 2
        })
    }

    private fun makeChip(context: Context, label: String, onClick: () -> Unit): TextView = TextView(context).apply {
        text = label
        textSize = 12f
        typeface = Typeface.DEFAULT_BOLD
        gravity = Gravity.CENTER
        setTextColor(COLOR_TEXT_SOFT_DARK)
        background = rounded(context, COLOR_SURFACE_DARK_2, 18, COLOR_BORDER_DARK, 1)
        setPadding(dp(context, 12), dp(context, 6), dp(context, 12), dp(context, 6))
        setOnClickListener { onClick() }
        layoutParams = LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
        ).apply { setMargins(0, 0, dp(context, 8), 0) }
    }

    private fun makeActionButton(
        context: Context,
        action: MessageAction,
        onClick: () -> Unit,
    ): TextView = TextView(context).apply {
        text = "${action.icon} ${action.label}"
        textSize = 11f
        gravity = Gravity.CENTER
        setTextColor(COLOR_TEXT_MUTED_DARK)
        background = rounded(context, COLOR_SURFACE_DARK, 14, COLOR_BORDER_DARK, 1)
        setPadding(dp(context, 8), dp(context, 4), dp(context, 8), dp(context, 4))
        setOnClickListener { onClick() }
        layoutParams = LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
        ).apply { setMargins(0, 0, dp(context, 6), 0) }
    }

    private fun rounded(
        context: Context,
        color: Int,
        radiusDp: Int,
        strokeColor: Int? = null,
        strokeWidthDp: Int = 0,
    ): GradientDrawable = GradientDrawable().apply {
        setColor(color)
        cornerRadius = dp(context, radiusDp).toFloat()
        if (strokeColor != null && strokeWidthDp > 0) setStroke(dp(context, strokeWidthDp), strokeColor)
    }

    private fun dp(context: Context, value: Int): Int = (value * context.resources.displayMetrics.density).toInt()

    private const val COLOR_PRIMARY = 0xFF5B5FEF.toInt()
    private const val COLOR_PRIMARY_SOFT = 0xFF8387FF.toInt()
    private const val COLOR_SURFACE_DARK = 0xFF111225.toInt()
    private const val COLOR_SURFACE_DARK_2 = 0xFF1C1E36.toInt()
    private const val COLOR_BORDER_DARK = 0xFF2F3358.toInt()
    private const val COLOR_TEXT_MUTED_DARK = 0xFFAEB2D5.toInt()
    private const val COLOR_TEXT_SOFT_DARK = 0xFFD6D8F6.toInt()
}
