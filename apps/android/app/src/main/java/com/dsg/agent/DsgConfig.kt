package com.dsg.agent

object DsgConfig {
    const val BASE_URL = "https://tdealer01-crypto-dsg-control-plane.vercel.app"
    const val STATUS_URL = "$BASE_URL/api/agent/status"
    const val OPENCLAW_URL = "$BASE_URL/api/agent/openclaw"
    const val DEFAULT_DEVICE_ID = "android.owner.default"
    const val NOTIFICATION_CHANNEL_ID = "dsg_agent_status"
    const val NOTIFICATION_ID = 1001
}
