# DSG Marketplace Builder Outreach Plan

## 🎯 Objective

Recruit **50+ builders** to create agents/workflows for DSG Marketplace within 90 days.

---

## 👥 Target Builder Personas

| Persona | Description | Channels | Pain Points |
|---------|-------------|----------|-------------|
| **AI Agent Developers** | Build autonomous agents for automation | GitHub, Discord, Twitter, Dev.to | Lack of governance, deployment, monetization |
| **Workflow Automation Engineers** | Build n8n/Zapier/Make alternatives | n8n community, Reddit, Slack | No built-in approval/audit |
| **Web Automation Specialists** | Puppeteer/Playwright/Selenium experts | Browserbase Discord, r/webdev | No governance layer |
| **AI/ML Engineers** | Fine-tune, RAG, agent frameworks | HuggingFace, Discord, Twitter | Production deployment hard |
| **DevOps/Platform Engineers** | CI/CD, governance, compliance | GitHub, GitLab, CNCF Slack | Manual approval gates |

---

## 🌐 Outreach Channels & Tactics

### 1. GitHub (Primary)

| Action | Target | Template |
|--------|--------|----------|
| Star/fork relevant repos | 500+ AI agent repos | — |
| Open issues with MCP integration proposal | `langchain`, `crewAI`, `autoGen`, `browserbase` | `ISSUE_TEMPLATE.md` |
| Submit PRs adding DSG MCP examples | High-traffic agent frameworks | `PR_TEMPLATE.md` |
| Sponsor/Contribute to key maintainers | Top 20 agent framework maintainers | `SPONSORSHIP.md` |

### 2. Discord Communities

| Community | Members | Approach |
|-----------|---------|----------|
| **Browserbase** | 3,000+ | Share MCP integration, offer free credits |
| **LangChain** | 15,000+ | Post in #showcase, #integrations |
| **CrewAI** | 5,000+ | Share MCP server demo |
| **AutoGen** | 8,000+ | Propose governance layer |
| **n8n** | 12,000+ | Governance for workflow automation |
| **Zapier/Make alternatives** | 5,000+ | No-code + governance |

### 3. Twitter/X

| Format | Frequency | Content |
|--------|-----------|---------|
| Thread | 2x/week | "How DSG MCP adds governance to any agent" |
| Video demo | 1x/week | 60-sec MCP server in Cursor/Claude |
| Quote tweet | Daily | Engage with agent dev pain points |
| Space | Monthly | "Building Governed Agents" AMA |

### 4. Content Platforms

| Platform | Format | Distribution |
|----------|--------|--------------|
| **Dev.to** | 2 articles/month | "MCP + Governance" series |
| **Hashnode** | 1 article/month | Technical deep-dives |
| **YouTube** | 2 videos/month | 10-min tutorials |
| **Newsletter** | Weekly | "Governed AI Weekly" |

### 5. Direct Outreach

| Target | Method | Incentive |
|--------|--------|-----------|
| Top 50 agent framework contributors | Email + DM | $500 credit + revenue share |
| YC/A16Z portfolio AI companies | Warm intro | Early access + co-marketing |
| DevRel at Browserbase/LangChain | Partnership | Joint webinar + blog |
| Conference speakers (AI/ML) | Speaking slot | Free ticket + booth |

---

## 💰 Builder Incentive Structure

| Tier | Revenue Share | Perks | Requirements |
|------|---------------|-------|--------------|
| **Starter** | 80% to builder | Free MCP credits ($500), docs, support | 1 published agent/workflow |
| **Pro** | 85% to builder | $1,000 credits, priority support, co-marketing | 3+ agents, 100+ executions |
| **Partner** | 90% to builder | $5,000 credits, dedicated Slack, co-selling | 10+ agents, 1,000+ executions |
| **Exclusive** | 95% to builder | Custom contract, co-branded, dedicated PM | 50+ agents, enterprise deals |

---

## 📧 Outreach Templates

### Cold Email (High-value target)

```
Subject: MCP governance layer for [Framework Name] agents

Hi [Name],

Saw your work on [specific project] — impressive approach to [specific technical detail].

We're building DSG ONE: an MCP server that adds governance (approval gates, audit trails, evidence chains) to any MCP-compatible agent. Think of it as "Vanta for AI agents" — every tool call routes through policy before execution.

Would love your feedback on our MCP server. Happy to share $500 in Browserbase credits + 85% revenue share on any agents you publish to our marketplace.

Demo: 2-min video → [link]
MCP config: 3 lines to connect

Open to a 15-min call?

Best,
[Your Name]
DSG ONE
```

### Discord/Slack Message

```
🚀 Just launched: DSG MCP Server — governance layer for any MCP agent

Problem: Agents run wild in production (no approval, no audit, no evidence)
Solution: MCP server that gates every tool call through policy engine

✅ Works with Claude, Cursor, VS Code, any MCP client
✅ 14-day trial on Pro tier ($99 → free)
✅ 80% revenue share on marketplace
✅ Browserbase integration for web automation

Try in 30 seconds:
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

Looking for 50 builders to launch with — $500 credits + 85% rev share for early partners.

DM me for invite! 🚀
```

---

## 📊 Tracking & KPIs

| Metric | Target (90 days) | Weekly Check |
|--------|------------------|--------------|
| **Outreach sent** | 500+ | 50+ |
| **Responses** | 100+ | 10+ |
| **Demos booked** | 30 | 3 |
| **Builders onboarded** | 50 | 5 |
| **Agents published** | 100 | 10 |
| **Executions/month** | 10,000+ | 1,000+ |
| **Revenue (builder share)** | $5,000+ | $500+ |

---

## 📅 90-Day Timeline

### Weeks 1-2: Foundation
- [ ] Finalize incentive contracts
- [ ] Create demo videos (3 min each)
- [ ] Build outreach list (500 targets)
- [ ] Set up tracking spreadsheet

### Weeks 3-6: Launch
- [ ] GitHub issues/PRs to top 20 frameworks
- [ ] Discord posts in 10 communities
- [ ] Twitter thread series (6 threads)
- [ ] 1st Dev.to article published

### Weeks 7-12: Scale
- [ ] YouTube tutorials (4 videos)
- [ ] Partnership webinars (2)
- [ ] Newsletter launch (weekly)
- [ ] Builder showcase event (virtual)

---

## 🛠️ Tools & Resources

| Tool | Purpose |
|------|---------|
| **Apollo.io / Hunter.io** | Find emails |
| **PhantomBuster** | Discord/Twitter automation |
| **Notion** | Track outreach, templates |
| **Calendly** | Demo booking |
| **Loom** | Personalized video demos |
| **Airtable** | Builder CRM |
| **Zapier** | Auto-log responses |

---

## 📁 Deliverables

| File | Location |
|------|----------|
| Outreach spreadsheet | `/outreach/builder-tracker.airtable` |
| Email templates | `/outreach/templates/email-*.md` |
| Discord messages | `/outreach/templates/discord-*.md` |
| Twitter threads | `/outreach/templates/twitter-*.md` |
| Demo videos | `/outreach/assets/demo-*.mp4` |
| Contract templates | `/outreach/legal/builder-agreement.pdf` |

---

**Owner**: [Your Name] | **Review**: Weekly Mondays | **Budget**: $5,000 credits + $10,000 marketing