package com.dsg.agent.automation

import org.json.JSONObject
import java.security.MessageDigest
import java.util.UUID

enum class AgentCommandType {
    STATUS,
    OPEN_URL,
    OPEN_SETTINGS,
    OPEN_APP,
    BACK,
    HOME,
    SCROLL_DOWN,
    NOTIFICATION_SUMMARY,
    FILE_LIST_ROOT,
    FILE_PREVIEW,
    FILE_SELECT,
    FILE_SEND_TO_CLAW,
    FILE_RENAME,
    FILE_MOVE,
    FILE_DELETE,
}

enum class CommandState {
    PENDING,
    APPROVED,
    REJECTED,
    BLOCKED,
    WAITING_PERMISSION,
    EXECUTED,
    FAILED,
}

data class ApprovalSignature(
    val commandDigest: String,
    val signatureBase64: String,
    val algorithm: String,
    val keyAlias: String,
    val approvedAt: Long,
) {
    fun toJson(): JSONObject = JSONObject()
        .put("commandDigest", commandDigest)
        .put("signatureBase64", signatureBase64)
        .put("algorithm", algorithm)
        .put("keyAlias", keyAlias)
        .put("approvedAt", approvedAt)

    companion object {
        fun fromJson(json: JSONObject?): ApprovalSignature? {
            if (json == null) return null
            return ApprovalSignature(
                commandDigest = json.optString("commandDigest"),
                signatureBase64 = json.optString("signatureBase64"),
                algorithm = json.optString("algorithm"),
                keyAlias = json.optString("keyAlias"),
                approvedAt = json.optLong("approvedAt"),
            )
        }
    }
}

data class AgentCommand(
    val commandId: String,
    val source: String,
    val type: AgentCommandType,
    val target: String,
    val requiresPermission: String,
    val requiresUserConfirm: Boolean,
    val reason: String,
    val createdAt: Long,
    val expiresAt: Long,
    val policyVersion: String,
    val idempotencyKey: String,
    val commandDigest: String,
    val state: CommandState = CommandState.PENDING,
    val approvalSignature: ApprovalSignature? = null,
    val lastErrorCode: String? = null,
    val lastErrorMessage: String? = null,
) {
    fun isExpired(now: Long = System.currentTimeMillis()): Boolean = now > expiresAt

    fun withState(nextState: CommandState, errorCode: String? = null, errorMessage: String? = null): AgentCommand =
        copy(state = nextState, lastErrorCode = errorCode, lastErrorMessage = errorMessage)

    fun withApproval(signature: ApprovalSignature): AgentCommand =
        copy(state = CommandState.APPROVED, approvalSignature = signature, lastErrorCode = null, lastErrorMessage = null)

    fun toHumanText(): String = listOf(
        "ID: $commandId",
        "Source: $source",
        "Action: ${type.name}",
        "Target: $target",
        "State: ${state.name}",
        "Permission: $requiresPermission",
        "Digest: $commandDigest",
        "Expires: $expiresAt",
        "Reason: $reason",
        lastErrorCode?.let { "Last error: $it ${lastErrorMessage.orEmpty()}" } ?: "",
    ).filter { it.isNotBlank() }.joinToString("\n")

    fun canonicalApprovalPayload(): String = listOf(
        "version=dsg.command/1",
        "type=${type.name}",
        "target=$target",
        "requiresPermission=$requiresPermission",
        "reason=$reason",
        "expiresAt=$expiresAt",
        "policyVersion=$policyVersion",
        "idempotencyKey=$idempotencyKey",
    ).joinToString("|")

    fun toJson(): JSONObject = JSONObject()
        .put("commandId", commandId)
        .put("source", source)
        .put("type", type.name)
        .put("target", target)
        .put("requiresPermission", requiresPermission)
        .put("requiresUserConfirm", requiresUserConfirm)
        .put("reason", reason)
        .put("createdAt", createdAt)
        .put("expiresAt", expiresAt)
        .put("policyVersion", policyVersion)
        .put("idempotencyKey", idempotencyKey)
        .put("commandDigest", commandDigest)
        .put("state", state.name)
        .put("approvalSignature", approvalSignature?.toJson())
        .put("lastErrorCode", lastErrorCode)
        .put("lastErrorMessage", lastErrorMessage)

    companion object {
        private const val DEFAULT_TTL_MS = 15 * 60 * 1000L
        private const val DEFAULT_POLICY_VERSION = "2026-05-28-owner-full-file-manager"

        fun create(
            source: String,
            type: AgentCommandType,
            target: String,
            reason: String,
            requiresPermission: String,
            requiresUserConfirm: Boolean = true,
        ): AgentCommand {
            val now = System.currentTimeMillis()
            val expiresAt = now + DEFAULT_TTL_MS
            val idempotencyKey = buildIdempotencyKey(type, target)
            val seed = listOf(
                "version=dsg.command/1",
                "type=${type.name}",
                "target=$target",
                "requiresPermission=$requiresPermission",
                "reason=$reason",
                "expiresAt=$expiresAt",
                "policyVersion=$DEFAULT_POLICY_VERSION",
                "idempotencyKey=$idempotencyKey",
            ).joinToString("|")
            val digest = sha256(seed)
            return AgentCommand(
                commandId = "cmd_${UUID.randomUUID()}",
                source = source,
                type = type,
                target = target,
                requiresPermission = requiresPermission,
                requiresUserConfirm = requiresUserConfirm,
                reason = reason,
                createdAt = now,
                expiresAt = expiresAt,
                policyVersion = DEFAULT_POLICY_VERSION,
                idempotencyKey = idempotencyKey,
                commandDigest = digest,
            )
        }

        fun fromJson(json: JSONObject): AgentCommand = AgentCommand(
            commandId = json.getString("commandId"),
            source = json.optString("source"),
            type = AgentCommandType.valueOf(json.getString("type")),
            target = json.optString("target"),
            requiresPermission = json.optString("requiresPermission"),
            requiresUserConfirm = json.optBoolean("requiresUserConfirm", true),
            reason = json.optString("reason"),
            createdAt = json.optLong("createdAt"),
            expiresAt = json.optLong("expiresAt"),
            policyVersion = json.optString("policyVersion"),
            idempotencyKey = json.optString("idempotencyKey"),
            commandDigest = json.optString("commandDigest"),
            state = CommandState.valueOf(json.optString("state", CommandState.PENDING.name)),
            approvalSignature = ApprovalSignature.fromJson(json.optJSONObject("approvalSignature")),
            lastErrorCode = json.optString("lastErrorCode").ifBlank { null },
            lastErrorMessage = json.optString("lastErrorMessage").ifBlank { null },
        )

        fun sha256(value: String): String {
            val digest = MessageDigest.getInstance("SHA-256").digest(value.toByteArray(Charsets.UTF_8))
            return digest.joinToString("") { "%02x".format(it) }
        }

        private fun buildIdempotencyKey(type: AgentCommandType, target: String): String =
            "${type.name.lowercase()}:${target.trim().lowercase()}"
    }
}

data class CommandExecutionResult(
    val success: Boolean,
    val message: String,
    val errorCode: String? = null,
)
