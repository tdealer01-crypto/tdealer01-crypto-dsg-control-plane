# Z3 Formal Verification Framework — Installation Guide

## 🚀 Quick Installation

### macOS / Linux

```bash
# Download and run the installation script
curl -fsSL https://raw.githubusercontent.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/claude/z3-formal-verification-pt0udg/scripts/install-plugin.sh | bash

# Or clone and install manually
git clone --branch claude/z3-formal-verification-pt0udg https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane.git
cd tdealer01-crypto-dsg-control-plane
bash scripts/install-plugin.sh
```

### Windows

```batch
REM Download and run the installation script
powershell -Command "& {(New-Object System.Net.WebClient).DownloadFile('https://raw.githubusercontent.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/claude/z3-formal-verification-pt0udg/scripts/install-plugin.bat', 'install-plugin.bat'); & '.\install-plugin.bat'}"

REM Or clone and install manually
git clone --branch claude/z3-formal-verification-pt0udg https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane.git
cd tdealer01-crypto-dsg-control-plane
scripts\install-plugin.bat
```

---

## ✅ Installation Checklist

The installation script will:

- [x] Check prerequisites (Git, npm, Node.js)
- [x] Clone or update the repository
- [x] Install dependencies via `npm ci`
- [x] Run TypeScript type checking
- [x] Create configuration directories
- [x] Generate configuration templates
- [x] Verify build integrity

**Installation takes ~2-5 minutes depending on internet speed.**

---

## 📍 Installation Directories

After installation, you'll have:

```
~/.z3-framework/                          # Main installation
├── lib/deeptutor/                        # Core framework
│   ├── adapter.ts                        # DeepTutor transformation
│   ├── adversarial-injection.ts          # Attack scenarios
│   ├── proof-verification.ts             # Z3 verification
│   └── reproducibility-layer.ts          # Audit trails
├── docs/                                 # Documentation
│   ├── FRAMEWORK_DESIGN.md
│   ├── API_REFERENCE.md
│   └── PLUGIN_PUBLISHING.md
├── tests/                                # Integration tests
├── plugin-manifest.json                  # Plugin configuration
└── scripts/                              # Installation & utility scripts

~/.z3-framework-config/                   # Configuration
├── config.json                           # Plugin settings
└── env.example                           # Environment template
```

---

## 🔧 Configuration

### Environment Variables

Copy and customize the environment template:

```bash
cp ~/.z3-framework-config/env.example ~/.z3-framework-config/.env
```

**Optional settings:**

```env
# Z3 SMT Solver path (for local verification)
Z3_SOLVER_PATH=/usr/bin/z3

# DeepTutor API key (for live data)
DEEPTUTOR_API_KEY=your_api_key_here

# Enable GPU acceleration
GPU_ACCELERATION=false

# Logging level
FRAMEWORK_LOG_LEVEL=info
```

### Configuration File

Edit `~/.z3-framework-config/config.json`:

```json
{
  "plugin": {
    "name": "Z3 Formal Verification Framework",
    "version": "1.0.0"
  },
  "framework": {
    "acceleration": {
      "default_preset": "moderate"
    },
    "adversarial": {
      "enabled": true,
      "attack_categories": [
        "replay", "timing", "resource",
        "availability", "data-quality", "consensus"
      ]
    }
  }
}
```

---

## ✅ Verification

### 1. TypeScript Compilation

```bash
cd ~/.z3-framework
npm run typecheck
```

**Expected output:** No errors, clean compilation ✅

### 2. Build Verification

```bash
npm run build
```

**Expected output:** Vercel deployment successful ✅

### 3. Integration Tests

```bash
npm run test:integration
```

**Expected output:** 16/16 tests passing ✅

### 4. Framework Verification

```bash
npm run verify:policy
```

**Expected output:** Z3 formal proofs generated ✅

---

## 🎯 First Steps

### Step 1: Verify Installation

```bash
cd ~/.z3-framework
npm run typecheck
```

### Step 2: Explore Documentation

```bash
# Framework architecture
cat docs/FRAMEWORK_DESIGN.md

# API reference
cat docs/API_REFERENCE.md

# Publishing guide
cat docs/PLUGIN_PUBLISHING.md
```

### Step 3: Run a Simple Test

```bash
npm run test -- tests/integration/deeptutor-pipeline.test.ts
```

### Step 4: Start Development

```bash
npm run dev
# Server running at http://localhost:3000
```

---

## 🐛 Troubleshooting

### Git Clone Fails

**Problem:** `fatal: unable to access repository`

**Solution:**
```bash
# Check git configuration
git config --global user.name "Your Name"
git config --global user.email "your@email.com"

# Try cloning again
git clone --branch claude/z3-formal-verification-pt0udg https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane.git
```

### npm Install Fails

**Problem:** `npm ERR! code ERESOLVE`

**Solution:**
```bash
cd ~/.z3-framework
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors

**Problem:** `error TS2304: Cannot find name 'SimulationInput'`

**Solution:**
```bash
# Rebuild type definitions
npm run build
npm run typecheck
```

### Port Already in Use

**Problem:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Use a different port
PORT=3001 npm run dev

# Or kill the process using port 3000
# On macOS/Linux:
lsof -ti:3000 | xargs kill -9

# On Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

## 📚 Documentation Structure

After installation, documentation is available at:

| Document | Purpose | Location |
|----------|---------|----------|
| **FRAMEWORK_DESIGN.md** | Architecture & design decisions | `/docs/FRAMEWORK_DESIGN.md` |
| **API_REFERENCE.md** | Complete API documentation | `/docs/API_REFERENCE.md` |
| **PLUGIN_PUBLISHING.md** | How to publish to Plugin Hub | `/docs/PLUGIN_PUBLISHING.md` |
| **ADVERSARIAL_SCENARIOS.md** | Attack categories & details | `/docs/ADVERSARIAL_SCENARIOS.md` |

---

## 🚀 Using the Framework

### Basic Usage

```typescript
import { adaptDeepTutorToSimulation } from '~/.z3-framework/lib/deeptutor/adapter';
import { DeepTutorDataPipeline } from '~/.z3-framework/lib/deeptutor/data-pipeline';

// Transform real metrics to simulation
const simInput = adaptDeepTutorToSimulation(deepTutorInput);

// Run pipeline
const pipeline = new DeepTutorDataPipeline();
const result = await pipeline.execute(simInput);

// Get audit trail
const auditLog = result.auditLog;
const reproducibilityToken = result.reproducibilityToken;
```

### Advanced Features

```typescript
// Time acceleration
const accelerated = await pipeline.execute(simInput, {
  acceleration: 'aggressive', // 100x speedup
  parallelAgents: 16
});

// Adversarial testing
const withAdversarial = await pipeline.execute(simInput, {
  adversarial: {
    enabled: true,
    injectionRate: 0.05,
    attackCategories: ['replay', 'timing', 'resource']
  }
});

// Formal verification
const proofs = await pipeline.verify(simInput);
```

---

## 📦 Publishing to Plugin Hub

Once installed and verified:

```bash
cd ~/.z3-framework

# Follow the publishing guide
cat docs/PLUGIN_PUBLISHING.md

# Or use the plugin manifest directly
cat plugin-manifest.json
```

**Next:** See `docs/PLUGIN_PUBLISHING.md` for detailed publishing steps.

---

## 🔗 Support & Links

- **Repository:** https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane
- **Branch:** `claude/z3-formal-verification-pt0udg`
- **Issues:** Report via GitHub issues
- **Author:** tdealer01-crypto
- **License:** MIT

---

## ✨ Features Included

After installation, you'll have access to:

✅ **Deterministic Z3 Formal Verification**
- Mathematical proofs of governance decisions
- Constraint satisfaction verification
- Policy version hashing

✅ **Adversarial Testing**
- 6 attack categories (replay, timing, resource, availability, data-quality, consensus)
- Realistic failure scenario injection
- Agent robustness validation

✅ **Time Acceleration**
- 1x to 1000x speedup presets
- Parallel execution (1-256 agents)
- Deterministic simulation

✅ **Complete Audit Trail**
- Cryptographic hash-chain
- Deterministic replay capability
- Zero-ambiguity accountability

✅ **Multi-Agent Governance**
- Chat, Research, Quiz, Solve, Visualize, Partner, Co-Writer agents
- Unified constraint system
- Cross-domain optimization

---

**Ready to begin? Run the installation script and start building with the Z3 Framework!** 🚀
