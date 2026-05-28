package pics.dsg.openclaw

import android.content.Context
import java.util.UUID

class AppPrefs(context: Context) {

    private val sp = context.getSharedPreferences("dsg_openclaw", Context.MODE_PRIVATE)

    var serverUrl: String
        get() = sp.getString("server_url", DEFAULT_URL) ?: DEFAULT_URL
        set(v) = sp.edit().putString("server_url", v).apply()

    var sessionId: String
        get() {
            val v = sp.getString("session_id", "") ?: ""
            if (v.isNotEmpty()) return v
            val generated = UUID.randomUUID().toString()
            sp.edit().putString("session_id", generated).apply()
            return generated
        }
        set(v) = sp.edit().putString("session_id", v).apply()

    var provider: String
        get() = sp.getString("provider", "claude") ?: "claude"
        set(v) = sp.edit().putString("provider", v).apply()

    companion object {
        const val DEFAULT_URL = "https://dsg-one-v1.vercel.app"
    }
}
