package com.dsg.agent.automation

/**
 * Autonomy Dial — risk-proportional execution control (see docs/MASTER_AGENT_LOOP.md §3).
 *
 * Higher levels reduce human-approval friction for LOWER-risk actions so the
 * agent runs at higher throughput. The non-negotiable safety floor is enforced
 * by the caller (MainActivity.approveCommand) and is NOT bypassed at any level —
 * even L3: irreversible/destructive actions (Tier 2, e.g. FILE_DELETE) always go
 * through the permission gate, the sensitive-file block, owner-signed execution,
 * and audit logging.
 */
object AutonomyDial {
    enum class RiskTier { READ_LOW, REVERSIBLE_WRITE, IRREVERSIBLE_HIGH }
    enum class Decision { AUTO, PAUSE_FOR_HUMAN }

    data class LevelInfo(val level: Int, val name: String, val desc: String)

    val LEVELS = listOf(
        LevelInfo(0, "L0 Manual", "อนุมัติทุกคำสั่งด้วยมือ"),
        LevelInfo(1, "L1 Work Session", "auto งานอ่าน/นำทาง (Tier 0) · หยุดถามที่เขียน/ลบ"),
        LevelInfo(2, "L2 Supervised", "auto Tier 0–1 (อ่าน + เขียนที่ย้อนได้) · หยุดเฉพาะ Tier 2"),
        LevelInfo(3, "L3 Autonomous", "auto ทุกชั้น — Tier 2 ยังผ่าน gate + audit ไม่หยุดถามคน"),
    )

    fun info(level: Int): LevelInfo = LEVELS[level.coerceIn(0, 3)]

    /** Classify a device command into a risk tier. Exhaustive so new commands force a choice. */
    fun tierOf(type: AgentCommandType): RiskTier = when (type) {
        AgentCommandType.STATUS,
        AgentCommandType.OPEN_URL,
        AgentCommandType.OPEN_APP,
        AgentCommandType.BACK,
        AgentCommandType.HOME,
        AgentCommandType.SCROLL_DOWN,
        AgentCommandType.FILE_LIST_ROOT,
        AgentCommandType.FILE_PREVIEW,
        AgentCommandType.FILE_SELECT,
        AgentCommandType.NOTIFICATION_SUMMARY -> RiskTier.READ_LOW
        AgentCommandType.OPEN_SETTINGS,
        AgentCommandType.FILE_SEND_TO_CLAW,
        AgentCommandType.FILE_RENAME,
        AgentCommandType.FILE_MOVE -> RiskTier.REVERSIBLE_WRITE
        AgentCommandType.FILE_DELETE -> RiskTier.IRREVERSIBLE_HIGH
    }

    /**
     * Should this (level, tier) auto-run without a human pause?
     * The downstream safety floor still applies regardless of this decision.
     */
    fun decide(level: Int, tier: RiskTier): Decision {
        val ok = when (level.coerceIn(0, 3)) {
            0 -> false
            1 -> tier == RiskTier.READ_LOW
            2 -> tier != RiskTier.IRREVERSIBLE_HIGH
            else -> true // L3: auto all; Tier-2 still gated + audited by the caller
        }
        return if (ok) Decision.AUTO else Decision.PAUSE_FOR_HUMAN
    }

    /** True only for the irreversible/high tier that must always stay gated. */
    fun isFloorProtected(type: AgentCommandType): Boolean = tierOf(type) == RiskTier.IRREVERSIBLE_HIGH
}
