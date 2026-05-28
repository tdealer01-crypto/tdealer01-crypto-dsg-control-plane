package pics.dsg.openclaw

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                AppRoot()
            }
        }
    }
}

@Composable
fun AppRoot() {
    val context = LocalContext.current
    val prefs = remember { AppPrefs(context) }
    var screen by remember { mutableStateOf(if (prefs.sessionId.isEmpty()) "settings" else "chat") }

    when (screen) {
        "chat" -> ChatScreen(
            prefs = prefs,
            onOpenSettings = { screen = "settings" }
        )
        "settings" -> SettingsScreen(
            prefs = prefs,
            onSave = { screen = "chat" }
        )
    }
}
