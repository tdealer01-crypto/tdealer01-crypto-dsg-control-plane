package pics.dsg.openclaw

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(prefs: AppPrefs, onSave: () -> Unit) {
    var serverUrl by remember { mutableStateOf(prefs.serverUrl) }
    var sessionId by remember { mutableStateOf(prefs.sessionId) }
    var provider by remember { mutableStateOf(prefs.provider) }

    Scaffold(
        topBar = { TopAppBar(title = { Text("ตั้งค่า") }) }
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .padding(24.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            OutlinedTextField(
                value = serverUrl,
                onValueChange = { serverUrl = it },
                label = { Text("Server URL") },
                placeholder = { Text(AppPrefs.DEFAULT_URL) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )

            OutlinedTextField(
                value = sessionId,
                onValueChange = { sessionId = it },
                label = { Text("Session ID") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                supportingText = { Text("สร้างอัตโนมัติ — เปลี่ยนได้ถ้าต้องการ") }
            )

            Text("เลือก AI Provider", style = MaterialTheme.typography.labelLarge)
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                listOf("claude", "gemini").forEach { p ->
                    FilterChip(
                        selected = provider == p,
                        onClick = { provider = p },
                        label = { Text(p.replaceFirstChar { it.uppercase() }) }
                    )
                }
            }

            Spacer(Modifier.height(8.dp))

            Button(
                onClick = {
                    prefs.serverUrl = serverUrl.trimEnd('/')
                    prefs.sessionId = sessionId
                    prefs.provider = provider
                    onSave()
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("บันทึก → เปิดแชท")
            }
        }
    }
}
