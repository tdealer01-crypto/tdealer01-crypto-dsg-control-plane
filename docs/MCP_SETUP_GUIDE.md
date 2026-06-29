# MCP Setup Guide — DSG Control Plane

**Model Context Protocol (MCP) Configuration** — Complete setup for Z.AI Vision and Web Reader servers.

---

## Quick Start (1 minute)

```bash
# 1. Set your API key
export Z_AI_API_KEY="<your-glm-coding-plan-key>"

# 2. Run complete setup
scripts/setup-mcp-complete.sh

# 3. Verify
claude mcp list
```

---

## What is MCP?

**Model Context Protocol** allows Claude Code to integrate external tools and services. This repository uses two Z.AI MCP servers:

| Server | Type | Purpose |
|--------|------|---------|
| **zai-vision** | Local stdio | Screenshot/image analysis, OCR, diagram understanding, video inspection |
| **web-reader** | Remote HTTP | Fetch and structure webpage content without a browser |

---

## Full Setup Instructions

### Prerequisites

- **Node.js ≥ 22.0.0**  
  Check: `node -v` → should show v22.x.x or higher
  
- **GLM Coding Plan API key** (from Z.AI platform)  
  ← Set as `Z_AI_API_KEY` environment variable

### Step 1: Export Your API Key

```bash
export Z_AI_API_KEY="<your-glm-coding-plan-key>"
```

**Do NOT commit this key.** It stays in your shell environment only.

### Step 2: Run Setup Script

```bash
scripts/setup-mcp-complete.sh
```

The script will:
- ✓ Validate Node.js >= 22
- ✓ Validate npx is available
- ✓ Check `.claude/settings.json` is valid JSON
- ✓ Add `zai-vision` and `web-reader` configurations
- ✓ Pre-warm the npx cache for faster first use
- ✓ Show you next steps

### Step 3: Verify Installation

```bash
# List configured MCP servers
claude mcp list

# Should show:
# ✓ zai-vision (stdio)
# ✓ web-reader (http)
# ✓ dsg-one-v1 (http)
# ✓ dsg-control-plane (http)
```

### Step 4: Test the Tools

**Test Z.AI Vision:**
```bash
# Put a screenshot in your project directory
# Then ask Claude:
# "What does screenshot.png show?"
```

**Test Web Reader:**
```bash
# Ask Claude:
# "Read https://example.com and summarize the main content"
```

---

## Configuration Details

### Current Configuration (`.claude/settings.json`)

```json
{
  "language": "thai",
  "mcpServers": {
    "zai-vision": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@z_ai/mcp-server@latest"],
      "env": {
        "Z_AI_API_KEY": "${Z_AI_API_KEY}",
        "Z_AI_MODE": "ZAI"
      }
    },
    "web-reader": {
      "type": "http",
      "url": "https://api.z.ai/api/mcp/web_reader/mcp",
      "headers": {
        "Authorization": "Bearer ${Z_AI_API_KEY}"
      }
    }
  }
}
```

### Environment Variables (`.env.example`)

```bash
# Z.AI MCP Servers (Vision + Web Reader)
Z_AI_API_KEY=<your-glm-coding-plan-api-key>
Z_AI_MODE=ZAI
```

---

## Troubleshooting

### "Connection Closed" error

**Cause:** Stale npx cache, old @z_ai/mcp-server version, or missing Z_AI_API_KEY

**Fix:**
```bash
# 1. Confirm Node >= 22
node -v

# 2. Confirm Z_AI_API_KEY is exported
echo $Z_AI_API_KEY  # Should not be empty

# 3. Clear npx cache and re-run setup
npm cache clean --force
scripts/setup-mcp-complete.sh
```

### "Invalid API Key" error

**Cause:** Z_AI_API_KEY is incorrect, expired, or not set

**Fix:**
```bash
# 1. Verify key is correct
echo $Z_AI_API_KEY

# 2. Check key has balance in GLM Coding Plan
# 3. Confirm key is for the ZAI platform (not another service)
# 4. Re-export and retry
export Z_AI_API_KEY="<correct-key>"
```

### "web-reader returned empty" error

**Cause:** Target URL is behind anti-scraping or not public

**Fix:**
- Verify the URL is publicly accessible
- Try a different URL (e.g., `https://example.com`)
- Some sites block automated fetches — this is expected

### `.claude/settings.json` not found

**Cause:** Setup script can't locate the file

**Fix:**
```bash
# Run setup from the repo root
cd /path/to/tdealer01-crypto-dsg-control-plane
scripts/setup-mcp-complete.sh
```

---

## Advanced Usage

### Check Prerequisites Only

```bash
scripts/setup-mcp-complete.sh --check
```

This validates Node.js, npx, and .claude/settings.json without making changes.

### Update Settings Only

```bash
scripts/setup-mcp-complete.sh --add-servers
```

This updates `.claude/settings.json` without pre-warming the cache.

### Show Help

```bash
scripts/setup-mcp-complete.sh --help
```

---

## Z.AI Vision Tools

Once configured, you have access to these vision tools:

| Tool | Use Case |
|------|----------|
| `ui_to_artifact` | Turn UI screenshots into code, prompts, specs |
| `extract_text_from_screenshot` | OCR for code, terminals, docs, text |
| `diagnose_error_screenshot` | Analyze error snapshots and suggest fixes |
| `understand_technical_diagram` | Read architecture, flow, UML, ER diagrams |
| `analyze_data_visualization` | Read charts and dashboards |
| `ui_diff_check` | Compare two UI shots for visual drift |
| `image_analysis` | General-purpose image understanding |
| `video_analysis` | Inspect videos (≤ 8 MB, MP4/MOV/M4V) |

**Usage:**  
Place the file in your working directory and ask Claude about it:
```
"What does this screenshot show?"
"Analyze this error and suggest fixes"
"Read this diagram and explain it"
```

---

## Web Reader Tool

Once configured, you can fetch and analyze web content:

```
"Read https://example.com and summarize"
"Fetch https://docs.example.com/api and explain the main API endpoints"
```

Returns:
- Page title
- Main content (cleaned)
- Metadata
- Links on page

---

## Quota & Limits

Z.AI services share a monthly quota:

| Plan Level | Web Search + Web Reader | Vision (5-hour rolling) |
|------------|------------------------|------------------------|
| Lite       | 100 calls/month        | 5 hours rolling pool   |
| Pro        | 1,000 calls/month      | 5 hours rolling pool   |
| Max        | 4,000 calls/month      | 5 hours rolling pool   |

Monitor your usage in your GLM Coding Plan dashboard.

---

## Security Notes

- **Never commit `Z_AI_API_KEY`.** It's in `.env` and your shell environment only.
- **Environment variables are not printed** in logs or responses.
- **Each request uses an Authorization header**, not the key in the URL.
- **Variable substitution (`${Z_AI_API_KEY}`) happens at runtime**, not when the file is saved.

---

## Related Documentation

- **Full Z.AI Documentation:**  
  [docs/mcp-server/ZAI_VISION_WEB_READER.md](./mcp-server/ZAI_VISION_WEB_READER.md)

- **Setup Script Details:**  
  [scripts/setup-mcp-complete.sh](../scripts/setup-mcp-complete.sh)

- **Environment Configuration:**  
  [.env.example](../.env.example)

- **Claude Code Documentation:**  
  https://claude.ai/code

---

## Next Steps

1. ✓ Run `scripts/setup-mcp-complete.sh`
2. ✓ Verify with `claude mcp list`
3. ✓ Test with a screenshot or webpage
4. Use vision/web-reader tools in your Claude Code sessions

---

**Last Updated:** 2026-06-29  
**Status:** ✓ Setup Guide Complete
