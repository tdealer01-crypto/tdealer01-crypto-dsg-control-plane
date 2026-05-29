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

    fun riskFor(file: File, autonomousMode: Boolean = false): FileRisk {
        // Autonomous mode: owner accepts all file risks — no blocks
        if (autonomousMode) return FileRisk.NORMAL
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

    fun readFile(path: String, maxBytes: Long = 8192L): String {
        val file = File(path)
        if (!file.exists() || !file.isFile) return "File not found: $path"
        return try {
            val limit = maxBytes
                .coerceAtLeast(0L)
                .coerceAtMost(Int.MAX_VALUE.toLong())
                .toInt()
            if (limit == 0) return ""

            val buffer = ByteArray(limit)
            var totalRead = 0
            file.inputStream().use { input ->
                while (totalRead < limit) {
                    val bytesRead = input.read(buffer, totalRead, limit - totalRead)
                    if (bytesRead == -1) break
                    totalRead += bytesRead
                }
            }
            buffer.copyOf(totalRead).toString(Charsets.UTF_8)
        } catch (e: Exception) {
            "Cannot read file: ${e.message}"
        }
    }

    fun renameFile(path: String, newName: String): Boolean {
        val file = File(path)
        val dest = File(file.parent ?: return false, newName)
        return file.renameTo(dest)
    }

    fun moveFile(path: String, destDir: String): Boolean {
        val file = File(path)
        val dest = File(destDir, file.name)
        return file.renameTo(dest)
    }

    fun deleteFile(path: String): Boolean = File(path).deleteRecursively()

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
