package pics.dsg.openclaw

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch

private val AllowGreen = Color(0xFF4CAF50)
private val BlockRed = Color(0xFFF44336)
private val NeutralGray = Color(0xFF607D8B)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(prefs: AppPrefs, onOpenSettings: () -> Unit) {
    val scope = rememberCoroutineScope()
    val client = remember { ApiClient() }
    val messages = remember { mutableStateListOf<ChatMessage>() }
    var input by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var lastDecision by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    fun send() {
        val text = input.trim()
        if (text.isEmpty() || loading) return
        input = ""
        messages.add(ChatMessage(role = "user", content = text))
        loading = true
        scope.launch {
            try {
                val result = client.chat(
                    serverUrl = prefs.serverUrl,
                    sessionId = prefs.sessionId,
                    message = text,
                    history = messages.dropLast(1),
                    provider = prefs.provider,
                )
                messages.add(ChatMessage(
                    role = "assistant",
                    content = result.reply,
                    decision = result.decision,
                    stamp = result.stamp,
                ))
                lastDecision = result.decision
                listState.animateScrollToItem(messages.size - 1)
            } catch (e: Exception) {
                messages.add(ChatMessage(role = "assistant", content = "⚠️ ${e.message}"))
            } finally {
                loading = false
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("DSG OpenClaw") },
                actions = {
                    // DSG decision badge
                    val (badgeText, badgeColor) = when (lastDecision.uppercase()) {
                        "ALLOW" -> "✓ ALLOW" to AllowGreen
                        "BLOCK" -> "✗ BLOCK" to BlockRed
                        else -> "DSG" to NeutralGray
                    }
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = badgeColor,
                        modifier = Modifier.padding(end = 8.dp)
                    ) {
                        Text(
                            text = badgeText,
                            color = Color.White,
                            fontSize = 11.sp,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                        )
                    }
                    IconButton(onClick = onOpenSettings) {
                        Icon(Icons.Default.Settings, contentDescription = "Settings")
                    }
                }
            )
        },
        bottomBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = input,
                    onValueChange = { input = it },
                    placeholder = { Text("พิมพ์ข้อความ...") },
                    modifier = Modifier.weight(1f),
                    enabled = !loading,
                    maxLines = 4,
                )
                Spacer(Modifier.width(8.dp))
                IconButton(
                    onClick = { send() },
                    enabled = !loading && input.isNotBlank()
                ) {
                    if (loading) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
                    } else {
                        Icon(Icons.Default.Send, contentDescription = "Send")
                    }
                }
            }
        }
    ) { padding ->
        LazyColumn(
            state = listState,
            contentPadding = PaddingValues(
                start = 12.dp, end = 12.dp,
                top = padding.calculateTopPadding() + 8.dp,
                bottom = padding.calculateBottomPadding() + 8.dp
            ),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(messages) { msg ->
                MessageBubble(msg)
            }
        }
    }
}

@Composable
private fun MessageBubble(msg: ChatMessage) {
    val isUser = msg.role == "user"
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
    ) {
        Surface(
            shape = RoundedCornerShape(
                topStart = 12.dp, topEnd = 12.dp,
                bottomStart = if (isUser) 12.dp else 2.dp,
                bottomEnd = if (isUser) 2.dp else 12.dp
            ),
            color = if (isUser)
                MaterialTheme.colorScheme.primary
            else
                MaterialTheme.colorScheme.surfaceVariant,
            modifier = Modifier.widthIn(max = 300.dp)
        ) {
            Text(
                text = msg.content,
                color = if (isUser)
                    MaterialTheme.colorScheme.onPrimary
                else
                    MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(12.dp),
                fontSize = 15.sp,
            )
        }
    }
}
