package com.dsg.agent.automation

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

data class CustomSkill(
    val id: String,
    val name: String,
    val description: String,
    val steps: List<AgentCommandType>,
    val targets: List<String>,
    val ts: Long,
)

class SkillStore(ctx: Context) {
    private val prefs = ctx.getSharedPreferences("dsg_skills", Context.MODE_PRIVATE)

    fun add(skill: CustomSkill) {
        val all = list().toMutableList()
        all.removeIf { it.id == skill.id }
        all.add(skill)
        save(all)
    }

    fun list(): List<CustomSkill> {
        val raw = prefs.getString(KEY, "[]") ?: "[]"
        val array = runCatching { JSONArray(raw) }.getOrDefault(JSONArray())
        return (0 until array.length()).mapNotNull { i ->
            runCatching {
                val obj = array.getJSONObject(i)
                val stepsArr = obj.getJSONArray("steps")
                val targetsArr = obj.getJSONArray("targets")
                CustomSkill(
                    id = obj.getString("id"),
                    name = obj.getString("name"),
                    description = obj.optString("description"),
                    steps = (0 until stepsArr.length()).mapNotNull { j ->
                        runCatching { AgentCommandType.valueOf(stepsArr.getString(j)) }.getOrNull()
                    },
                    targets = (0 until targetsArr.length()).map { j -> targetsArr.getString(j) },
                    ts = obj.getLong("ts"),
                )
            }.getOrNull()
        }
    }

    fun delete(id: String) = save(list().filter { it.id != id })

    // Parses [SKILL:name|DESC:desc|STEPS:CMD1:target1,CMD2:target2] from bot response
    fun parseFromBotResponse(response: String): CustomSkill? {
        val match = Regex("\\[SKILL:([^|]+)\\|DESC:([^|]+)\\|STEPS:([^]]+)]").find(response) ?: return null
        val name = match.groupValues[1].trim()
        val desc = match.groupValues[2].trim()
        val stepPairs = match.groupValues[3].trim().split(",").mapNotNull { pair ->
            val parts = pair.trim().split(":", limit = 2)
            if (parts.size < 2) return@mapNotNull null
            val type = runCatching { AgentCommandType.valueOf(parts[0].trim()) }.getOrNull() ?: return@mapNotNull null
            Pair(type, parts[1].trim())
        }
        if (stepPairs.isEmpty()) return null
        return CustomSkill(
            id = UUID.randomUUID().toString(),
            name = name, description = desc,
            steps = stepPairs.map { it.first },
            targets = stepPairs.map { it.second },
            ts = System.currentTimeMillis(),
        )
    }

    private fun save(skills: List<CustomSkill>) {
        val array = JSONArray()
        skills.forEach { skill ->
            val stepsArr = JSONArray().also { arr -> skill.steps.forEach { arr.put(it.name) } }
            val targetsArr = JSONArray().also { arr -> skill.targets.forEach { arr.put(it) } }
            array.put(JSONObject()
                .put("id", skill.id).put("name", skill.name).put("description", skill.description)
                .put("steps", stepsArr).put("targets", targetsArr).put("ts", skill.ts))
        }
        prefs.edit().putString(KEY, array.toString()).apply()
    }

    companion object {
        private const val KEY = "skills"
        fun newId(): String = UUID.randomUUID().toString()
    }
}
