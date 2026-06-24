# DSG ONE — User Guide

> Version: 2026.06.24 | Language: English

---

## 🚀 Getting Started

DSG ONE is an enterprise AI governance platform that enables you to:

- 🛡️ **Control AI Actions** — Define policies before execution
- 📋 **Audit Trail** — Every decision is immutably recorded
- 🔒 **Prevent Risks** — Safe DOM verification + Policy gate
- 📊 **Monitor System** — Real-time dashboard + observability

---

## 📖 Step-by-Step Guide

### 1. Login

```
URL: https://tdealer01-crypto-dsg-control-plane.vercel.app/login
```

Choose 1 of 3 methods:
1. **Password** — For existing users
2. **Recovery Link** — For forgot password
3. **SSO** — For organizations using Single Sign-On

### 2. Create New Workspace (14-day free trial)

Click **"Start workspace trial"** → Fill in:
- Organization name
- Full name
- Email

### 3. System Status (Dashboard)

After login, you will see:
- **4 status boxes** — Agents, Executions, Core Status, DB Status
- **Products** — Links to each module
- **Chat Widget** — Bottom-right for AI Agent queries

### 4. Use AI Agent

Click the chat icon in the bottom-right → Type your question → AI responds

Example questions:
- "Check system readiness"
- "List all agents"
- "Show recent audit logs"

---

## 🔧 Core Features

### Policy Engine
Define rules for AI actions:
- ALLOW — Permit
- BLOCK — Deny
- REVIEW — Requires manual review

### Audit Trail
Every decision records:
- Actor (who)
- Decision (allow/deny)
- Proof hash (evidence)
- Timestamp

### Incident Response
Emergency incident management:
- P1-P4 severity levels
- Escalation workflow
- Breach notification

---

## 🌐 API Routes

| Route | Description |
|-------|-------------|
| `/api/health` | System health |
| `/api/agents` | Agent list |
| `/api/executions` | Execution history |
| `/api/audit` | Audit logs |
| `/api/incidents` | Incident management |
| `/api/agent-chat-v2` | AI Chat |

---

## ❓ FAQ

**Q: Forgot password?**
A: Click "Send a recovery link" on the login page → Enter email → Check inbox

**Q: Can I use SSO?**
A: Yes, click "Continue with SSO" on the login page

**Q: Is my data secure?**
A: AES-256 encryption, TLS 1.3, RBAC, ISO-42001 compliant

---

## 📞 Contact

- Email: support@dsg-controlplane.com
- API Docs: `/api/docs`

---

*Last updated: 2026-06-24*
