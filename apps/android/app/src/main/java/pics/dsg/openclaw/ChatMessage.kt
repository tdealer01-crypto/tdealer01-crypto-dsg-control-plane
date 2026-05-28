package pics.dsg.openclaw

data class ChatMessage(
    val role: String,   // "user" | "assistant"
    val content: String,
    val decision: String = "",
    val stamp: String = "",
)
