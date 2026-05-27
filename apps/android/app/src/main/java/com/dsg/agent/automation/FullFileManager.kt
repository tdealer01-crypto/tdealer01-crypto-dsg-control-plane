package com.dsg.agent.automation

import android.os.Environment
import java.io.File
import java.text.DecimalFormat

object FullFileManager {
    data class FileEntry(
        val path: String,
        val name: String,
        val isDirectory: Boolean,
        val sizeBytes: Long,
        val risk: FileRisk,
    ) {
        fun toDisplayText(): String {
            val type = if (isDirectory) "DIR" else "FILE"
            return "$type • $name • ${formatBytes(sizeBytes)} • ${risk.label}\n$path"
        }
    }

    enum class FileRisk(val label: String) {
        NORMAL("normal"),
        SENSITIVE_REVIEW("sensitive-review"),
        SECRET_BLOCK("secret-block"),
        ARCHIVE_REVIEW("archive-review"),
    }

    fun isEnabled(): Boolean = Environment.isExternalStorageManager()

    fun rootPath(): File = Environment.getExternalStorageDirectory()

    fun listRoot(maxItems: Int = 20): List<FileEntry> {
        val root = rootPath()
        return root.listFiles()
            ?.sortedWith(compareByDescending<File> { it.isDirectory }.thenBy { it.name.lowercase() })
            ?.take(maxItems)
            ?.map { file ->
                FileEntry(
                    path = file.absolutePath,
                    name = file.name.ifBlank { file.absolutePath },
                    isDirectory = file.isDirectory,
                    sizeBytes = if (file.isFile) file.length() else 0L,
                    risk = riskFor(file),
                )
            }
            ?: emptyList()
    }

    fun riskFor(file: File): FileRisk {
        val name = file.name.lowercase()
        if (file.isDirectory) return FileRisk.NORMAL
        if (
            name.endsWith(".env") ||
            name.contains("api_key") ||
            name.contains("apikey") ||
            name.contains("token") ||
            name.contains("secret") ||
            name.endsWith(".pem") ||
            name.endsWith(".key")
        ) return FileRisk.SECRET_BLOCK
        if (
            name.contains("passport") ||
            name.contains("idcard") ||
            name.contains("id_card") ||
            name.contains("บัตร") ||
            name.contains("พาสปอร์ต")
        ) return FileRisk.SENSITIVE_REVIEW
        if (
            name.endsWith(".zip") ||
            name.endsWith(".7z") ||
            name.endsWith(".rar") ||
            name.endsWith(".tar") ||
            name.endsWith(".gz")
        ) return FileRisk.ARCHIVE_REVIEW
        return FileRisk.NORMAL
    }

    fun buildListSummary(): String {
        val entries = listRoot()
        if (entries.isEmpty()) return "No shared-storage files visible or permission not available."
        return entries.joinToString("\n\n") { it.toDisplayText() }
    }

    fun formatBytes(bytes: Long): String {
        if (bytes <= 0L) return "0 B"
        val units = arrayOf("B", "KB", "MB", "GB")
        var value = bytes.toDouble()
        var unitIndex = 0
        while (value >= 1024 && unitIndex < units.lastIndex) {
            value /= 1024
            unitIndex += 1
        }
        return "${DecimalFormat("#.##").format(value)} ${units[unitIndex]}"
    }
}
