# Installation & Setup Guide

## Quick Start

The `compliance-ising-z3` plugin is bundled as part of the DSG ONE / ProofGate control plane. It provides:

- **Z3/SMT-style constraint verification** skills
- **Deterministic QUBO/Ising policy optimization** agent
- **Multi-regulatory framework** support (EU GDPR, Thai PDPA, Thai Criminal Law, FinTech)
- **What-if counterfactual simulation** capabilities
- **SHA-256 provenance audit chain** for compliance proof

---

## Prerequisites

1. **Claude Code** environment (web, desktop, or IDE extension)
2. **Node.js** 18+ and npm (if running locally)
3. Access to the **DSG control plane repository**

---

## Installation Steps

### Step 1: Clone or Access the Repository

If you don't have the DSG control plane cloned:

```bash
git clone https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane.git
cd tdealer01-crypto-dsg-control-plane
```

### Step 2: Install Plugin via Claude Code

#### Option A: Via Web (claude.ai/code)

1. Open [Claude Code](https://claude.ai/code)
2. Open the DSG control plane repository
3. Go to **Plugins** → **Browse Local Plugins**
4. The `compliance-ising-z3` plugin should appear in the list
5. Click **Install** to enable it

#### Option B: Via CLI

```bash
claude plugin install ./plugins/compliance-ising-z3
```

#### Option C: Manual Registration

Edit your `.claude/settings.json` and add:

```json
{
  "plugins": {
    "compliance-ising-z3": {
      "enabled": true,
      "path": "./plugins/compliance-ising-z3"
    }
  }
}
```

### Step 3: Verify Installation

```bash
claude plugin list
# Should show "compliance-ising-z3" as installed and enabled
```

---

## Accessing the Plugin Resources

### Skills

Once installed, you can invoke:

- **z3-compliance-review** — For deterministic policy optimization and constraint verification
- **qubo-optimization-run** — For calling the external DSG QUBO Policy Optimizer API

Usage:

```
claude /z3-compliance-review

# Or within a conversation:
@claude: "Can you review this policy for compliance with EU GDPR?"
```

### Agents

Access the compliance agent:

```
claude @compliance-agent

# Or in a conversation:
@compliance-agent: "Optimize this 5-rule compliance set under a $2000 budget."
```

---

## Environment Variables

If you plan to use the external **QUBO Policy Optimizer API**, set:

```bash
export DSG_QUBO_API_BASE="https://dsg-qubo-api.vercel.app"
export DSG_QUBO_API_KEY="<your-api-key>"
```

Obtain an API key by visiting:

```
GET https://dsg-qubo-api.vercel.app/api/v1/auth/register
POST https://dsg-qubo-api.vercel.app/login
```

See `references/external-apis.md` for full API documentation.

---

## Running the Source Engine (Advanced)

The plugin references the native Kotlin/Android engine in:

```
tdealer01-crypto/Compliance-ising-z3-Deterministic-
```

To build and test the engine locally:

```bash
cd ../Compliance-ising-z3-Deterministic-

# Build the app
./gradlew :app:build --no-daemon

# Run unit tests
./gradlew :app:testDebugUnitTest --no-daemon --stacktrace

# Run the pre-build and post-test helper scripts
bash ${CLAUDE_PLUGIN_ROOT}/scripts/preBuild.sh
bash ${CLAUDE_PLUGIN_ROOT}/scripts/postTest.sh
```

---

## Troubleshooting

### Plugin not appearing in list

1. Verify the repository is cloned: `ls plugins/compliance-ising-z3`
2. Check `.claude-plugin/plugin.json` exists and is valid JSON
3. Reload Claude Code or restart your IDE

### Skills/agents not available

1. Ensure the plugin is **enabled** in `.claude/settings.json`
2. Check that `SKILL.md` and agent `.md` files have proper YAML frontmatter
3. Run `claude plugin validate ./plugins/compliance-ising-z3` to check format

### External API errors

1. Verify `DSG_QUBO_API_BASE` is set correctly
2. Test connectivity: `curl https://dsg-qubo-api.vercel.app/health`
3. Check that `DSG_QUBO_API_KEY` is valid
4. See `references/external-apis.md` for endpoint schemas

---

## Validation

To validate the plugin conforms to the official schema:

```bash
claude plugin validate ./plugins/compliance-ising-z3
```

Expected output:
```
✓ Plugin validated successfully
- 2 skills found
- 1 agent found
- Metadata complete
```

---

## Next Steps

1. **Read CONTRIBUTING.md** for contribution guidelines
2. **Review README.md** for full feature overview
3. **Check references/external-apis.md** for API details
4. **Explore skills/** for deterministic policy optimization examples

---

## Support & Feedback

- **Repository**: [Compliance-ising-z3-Deterministic-](https://github.com/tdealer01-crypto/Compliance-ising-z3-Deterministic-)
- **Issues**: Report via GitHub Issues
- **Documentation**: See README.md and skill/agent guides
- **Email**: support@dsg.pics

---

## License

MIT License — See LICENSE file for details.
