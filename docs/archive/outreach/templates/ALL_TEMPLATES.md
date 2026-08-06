# Outreach Templates

## 1. Cold Email — High-Value Builder

**Subject:** MCP governance layer for [Framework] agents — $500 credits + 85% rev share

---

Hi [Name],

Saw your work on [specific project/repo] — impressive approach to [specific technical detail, e.g., "how you handle tool calling in AutoGen"].

We're building **DSG ONE**: an MCP server that adds governance (approval gates, audit trails, cryptographic evidence chains) to any MCP-compatible agent. Think of it as "Vanta for AI agents" — every tool call routes through a policy engine before execution.

**What we offer early builders:**
- $500 Browserbase credits (for web automation)
- 85% revenue share on marketplace (standard is 20%)
- Co-marketing: joint blog post, Twitter thread, newsletter feature
- Direct Slack access to our team
- Free Pro tier ($99/mo) for 14 days, then 80% rev share forever

**Integration is 3 lines:**
```json
{
  "mcpServers": {
    "dsg-gate": {
      "command": "npx",
      "args": ["-y", "@dsg/mcp-server"],
      "env": { "DSG_API_KEY": "your-key" }
    }
  }
}
```

Works with: Claude Desktop, Cursor, VS Code, Continue, any MCP client.

**Demo:** 2-min video → [Loom link]
**MCP Server:** `npx -y @dsg/mcp-server`

Open to a 15-min call this week? I'll share screen and walk through a live agent deployment with governance gates.

Best,
[Your Name]
Founder, DSG ONE
[Calendly link]
[Twitter] [GitHub] [Website]

---

## 2. Discord/Slack Community Post

---

🚀 **Just launched: DSG MCP Server — governance layer for any MCP agent**

**Problem:** Agents run wild in production (no approval gates, no audit trail, no evidence chain)

**Solution:** MCP server that gates every tool call through a policy engine before execution

✅ Works with **Claude Desktop, Cursor, VS Code, Continue**, any MCP client
✅ **14-day free trial** on Pro tier ($99/mo → free)
✅ **80% revenue share** on marketplace (standard is 20%)
✅ **Browserbase integration** for web automation (1k free sessions/mo)
✅ **Governance built-in:** approval gates, audit trail, evidence chain, SLA monitoring

**Try in 30 seconds:**
```json
{
  "mcpServers": {
    "dsg-gate": {
      "command": "npx",
      "args": ["-y", "@dsg/mcp-server"],
      "env": { "DSG_API_KEY": "your-key" }
    }
  }
}
```

**Looking for 50 builders to launch with** — $500 Browserbase credits + 85% rev share for early partners.

👉 DM me for invite link + $500 credits code!

#MCP #AIAgents #Governance #Browserbase #Claude #Cursor

---

## 3. Twitter/X Thread

---

**Thread: How to add governance to any AI agent in 30 seconds**

1/7 🧵 Agents are going to production. But who approves their actions? Who audits their decisions? Where's the evidence chain?

Enter **DSG MCP Server** — a governance layer that sits between ANY MCP agent and your production systems.

2/7 🔧 **How it works:**

Your AI agent → DSG MCP Server (policy gate) → Production systems

Every `tool_call` routes through:
✅ Approval workflow (human-in-the-loop)
✅ Audit trail (immutable, Merkle-hashed)
✅ Evidence chain (cryptographic proof)
✅ SLA monitoring (4h response SLA)

3/7 🎯 **What gets gated:**
- Browser automation (click, scrape, navigate)
- Code execution (deploy, test, migrate)
- Database operations (read/write/migrate)
- API calls (payments, emails, webhooks)
- File operations (read/write/delete)

4/7 ⚡ **Integration = 3 lines:**

```json
{
  "mcpServers": {
    "dsg-gate": {
      "command": "npx",
      "args": ["-y", "@dsg/mcp-server"],
      "env": { "DSG_API_KEY": "sk-..." }
    }
  }
}
```

Works with: **Claude Desktop, Cursor, VS Code, Continue, Continue, any MCP client.**

5/7 💰 **Builder economics:**
- 80% revenue share (marketplace standard: 20%)
- $500 Browserbase credits free
- 14-day Pro trial free ($99 value)
- Co-marketing: we promote your agents

6/7 🛡️ **Security & Compliance:**
- SOC 2 Type II infra
- Cryptographic evidence chain (SHA-256 + Merkle)
- No raw API keys exposed to agents
- SOC 2 Type II, GDPR, CCPA ready

7/7 🚀 **We're recruiting 50 builders for launch:**

- $500 Browserbase credits
- 85% revenue share (first year)
- Co-marketing (blog, Twitter, newsletter)
- Direct Slack access to team

👉 **DM me for invite + credits code**

#MCP #AIAgents #Governance #Claude #Cursor #Browserbase

---

## 4. GitHub Issue Template

---

**Title:** `feat: Add DSG MCP Server governance example to [Framework]`

**Body:**

## Summary
Add DSG MCP Server as a governance layer example for [Framework] agents. This enables any agent built with [Framework] to have production-grade governance (approval gates, audit trails, evidence chains) with 3 lines of config.

## What is DSG MCP Server?
An MCP server that acts as a policy gate for all tool calls. Every agent action routes through:
- Approval workflow (human-in-the-loop)
- Audit trail (immutable, Merkle-hashed)
- Cryptographic evidence chain
- SLA monitoring (4h SLA)

## Integration
```json
{
  "mcpServers": {
    "dsg-gate": {
      "command": "npx",
      "args": ["-y", "@dsg/mcp-server"],
      "env": { "DSG_API_KEY": "your-key" }
    }
  }
}
```

## Benefits for [Framework] Users
- ✅ Production-ready governance out of the box
- ✅ Works with any MCP-compatible agent
- ✅ Browser automation via Browserbase (1k free sessions/mo)
- ✅ 14-day free Pro trial + 80% revenue share

## Files to Add
- `examples/dsg-mcp-governance/` — Complete example agent
- `docs/integrations/dsg-mcp.md` — Integration guide
- `.github/workflows/dsg-mcp-demo.yml` — CI demo

## Resources
- MCP Server: `npx -y @dsg/mcp-server`
- Demo: [Loom link]
- Docs: https://docs.dsg.one/mcp
- Discord: [invite link]

---

## 5. LinkedIn Cold Message

---

Hi [Name],

Saw your post about [specific topic] — great insights on [specific detail].

We're launching **DSG MCP Server**: a governance layer that sits between ANY MCP-compatible AI agent (Claude, Cursor, VS Code) and production systems. Every tool call routes through policy gates — approval workflow, audit trail, cryptographic evidence chain.

Looking for **50 builders** to launch with. Offering:
- $500 Browserbase credits
- 85% revenue share (vs 20% standard)
- 14-day free Pro trial ($99 value)
- Co-marketing support

Integration is 3 lines of JSON. Works with any MCP client.

Open to a quick 15-min call to demo? Happy to share $500 credits upfront.

Best,
[Name] | DSG ONE
[Calendly]

---

## 6. Follow-up Email (No response after 3 days)

---

**Subject:** Re: MCP governance for [Framework] — $500 credits still available

Hi [Name],

Following up — the $500 Browserbase credits for early builders expire Friday.

Quick recap: DSG MCP Server adds governance (approval, audit, evidence) to any MCP agent in 3 lines. We're partnering with 50 builders for launch — $500 credits + 85% rev share.

Still have 12 spots open. Happy to send credits code today — just need your email.

No pressure — just didn't want you to miss the credits window.

Best,
[Name]

---

## 7. Partnership Proposal (Browserbase/LangChain/CrewAI DevRel)

---

**Subject:** Partnership: DSG MCP Server + [Company] — Joint builder program

Hi [Name],

[Company] developers are building agents that need governance. DSG MCP Server provides that layer — and we want to partner on a joint builder program.

**Proposal:**
- **Joint webinar:** "Building Governed Agents with [Company] + DSG"
- **Co-branded landing page:** Builder signup with both logos
- **Shared credits pool:** $5,000 Browserbase + [Company] credits
- **Revenue share:** 50/50 on jointly acquired enterprise deals
- **Content:** 2 blog posts, 4 tweets, 1 newsletter feature each

**DSG brings:**
- MCP server (governance, audit, evidence)
- Marketplace (80/20 split)
- 50+ builders in pipeline
- Enterprise sales team

**[Company] brings:**
- Developer audience
- Framework expertise
- DevRel channels

Open to a 30-min call to scope? Happy to draft joint announcement.

Best,
[Name]
DSG ONE

---

## 8. Thank You / Onboarding Email (After builder signs up)

---

**Subject:** 🎉 Welcome to DSG Builder Program — Your $500 credits are ready!

Hi [Name],

Welcome to the DSG Builder Program! 🎉

**Your perks are active:**
- ✅ $500 Browserbase credits: [CODE_HERE] (apply at browserbase.com/billing)
- ✅ 85% revenue share (first year)
- ✅ 14-day free Pro tier
- ✅ Direct Slack invite: [SLACK_LINK]

**Next steps:**
1. **Join Slack** — #builders channel for peer support
2. **Try MCP Server** — `npx -y @dsg/mcp-server` (add to your MCP client)
3. **Build your first agent** — See examples: https://github.com/dsg/mcp-examples
4. **Publish to Marketplace** — 85% rev share, we handle billing

**Resources:**
- 📚 Docs: https://docs.dsg.one/mcp
- 🎥 Demo: [LOOM_LINK]
- 💬 Support: #builder-support in Slack
- 📧 Direct: [YOUR_EMAIL]

**Your Builder ID:** `bld_abc123` (use for support)

Excited to see what you build! 🚀

— The DSG Team

---

## 9. Newsletter Template (Weekly "Governed AI Weekly")

---

**Subject:** Governed AI Weekly #{{week}} — MCP governance, Browserbase updates, Builder spotlight

---

## 🎯 This Week's Focus: {{topic}}

### 🚀 MCP Updates
- DSG MCP Server v{{version}} released: {{changelog}}
- New tool: `{{tool_name}}` — {{description}}

### 👷 Builder Spotlight: {{Builder Name}}
{{Builder}} built {{Agent Name}} — {{description}}
- Executions: {{count}}
- Revenue: ${{amount}}
- [Read full story]

### 🔧 Browserbase News
- {{update}}
- Free tier: 1,000 sessions/mo

### 💡 Tip of the Week
{{tip}}

### 📅 Upcoming Events
- {{date}}: Webinar — {{topic}}
- {{date}}: Builder Office Hours

---

**Reply to this email** — we read every response.

— The DSG Team

---

## 10. Re-engagement Email (Inactive builder)

---

**Subject:** Still building? Your credits expire soon ⏰

Hi [Name],

Noticed you haven't used your $500 Browserbase credits yet — they expire in 7 days.

**Apply now:** browserbase.com/billing → enter `{{CODE}}`

**Quick start if stuck:**
1. `npx -y @dsg/mcp-server` → adds to your MCP client
2. Build agent → `npx tsx examples/basic-navigate.ts`
3. Publish → 85% rev share

**Need help?** Reply to this email or join Slack: [LINK]

We want you to succeed — just let us know what's blocking you.

— [Name], DSG Team

---

---

## Template Variables Reference

| Variable | Description | Source |
|----------|-------------|--------|
| `{{NAME}}` | Builder first name | Airtable/CRM |
| `{{FRAMEWORK}}` | Target framework | Research |
| `{{SPECIFIC_DETAIL}}` | Technical detail from their work | GitHub/Twitter |
| `{{CODE}}` | Browserbase credits code | Generated per builder |
| `{{LOOM_LINK}}` | Demo video URL | Assets |
| `{{CAL_LINK}}` | Calendly booking URL | Calendly |
| `{{SLACK_LINK}}` | Slack invite | Generated |
| `{{BUILDER_ID}}` | Unique builder ID | Airtable |
| `{{VERSION}}` | MCP server version | package.json |

---

## Usage Checklist

- [ ] Personalize `{{NAME}}`, `{{FRAMEWORK}}`, `{{SPECIFIC_DETAIL}}`
- [ ] Generate unique `{{CODE}}` per builder
- [ ] Attach Loom demo link
- [ ] Include Calendly link
- [ ] Track in Airtable (Outreach Log)
- [ ] Set 3-day follow-up reminder
- [ ] Log response in CRM