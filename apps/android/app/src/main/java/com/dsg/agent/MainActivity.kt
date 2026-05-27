package com.dsg.agent

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.core.app.ActivityCompat
import com.dsg.agent.service.AgentForegroundService

class MainActivity : Activity() {
    private lateinit var statusView: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 10)
        render()
    }

    private fun render() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 32, 32, 32)
        }

        root.addView(TextView(this).apply {
            text = "DSG Agent"
            textSize = 28f
        })

        root.addView(TextView(this).apply {
            text = "Owner-device automation app. Use only on your own phone. Keep the foreground notification visible and review each queued action before running it."
            textSize = 16f
        })

        statusView = TextView(this).apply {
            text = buildStatusText()
            textSize = 14f
            setPadding(0, 24, 0, 24)
        }
        root.addView(statusView)

        root.addView(Button(this).apply {
            text = "Start Agent Service"
            setOnClickListener {
                startForegroundService(Intent(this@MainActivity, AgentForegroundService::class.java))
                statusView.text = buildStatusText("Foreground service start requested")
            }
        })

        root.addView(Button(this).apply {
            text = "Stop Agent Service"
            setOnClickListener {
                stopService(Intent(this@MainActivity, AgentForegroundService::class.java))
                statusView.text = buildStatusText("Foreground service stop requested")
            }
        })

        root.addView(Button(this).apply {
            text = "Open Accessibility Permission"
            setOnClickListener {
                startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
            }
        })

        root.addView(Button(this).apply {
            text = "Open Notification Listener Permission"
            setOnClickListener {
                startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
            }
        })

        root.addView(Button(this).apply {
            text = "Open DSG Status API"
            setOnClickListener {
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(DsgConfig.STATUS_URL)))
            }
        })

        root.addView(Button(this).apply {
            text = "Open Bridge Manifest"
            setOnClickListener {
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(DsgConfig.OPENCLAW_URL)))
            }
        })

        setContentView(ScrollView(this).apply { addView(root) })
    }

    private fun buildStatusText(extra: String? = null): String {
        return listOfNotNull(
            "Backend: ${DsgConfig.BASE_URL}",
            "Mode: owner-device, permission-first, audit-required",
            "Enabled actions v1: status, foreground service, open settings screens, reviewed command inbox placeholder",
            extra,
        ).joinToString("\n")
    }
}
