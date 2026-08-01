# Contributing to compliance-ising-z3

Thank you for your interest in contributing to the compliance-ising-z3 plugin! This document outlines how to contribute code, documentation, and feedback.

---

## Code of Conduct

We are committed to fostering an inclusive, respectful community. All contributors are expected to:

- Treat others with respect and dignity
- Provide constructive feedback
- Accept criticism gracefully
- Focus on what is best for the community

---

## Getting Started

### 1. Fork the Repository

```bash
git clone https://github.com/tdealer01-crypto/Compliance-ising-z3-Deterministic-.git
cd Compliance-ising-z3-Deterministic-
git remote add upstream https://github.com/tdealer01-crypto/Compliance-ising-z3-Deterministic-.git
```

### 2. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

Follow branch naming conventions:
- `feature/` for new features
- `fix/` for bug fixes
- `docs/` for documentation updates
- `refactor/` for code refactoring

### 3. Install Dependencies

```bash
# For the Kotlin/Android engine
./gradlew build

# For plugin validation (requires Claude Code)
npm install
```

---

## Development Workflow

### Making Changes

1. **Identify the area**: Determine whether your change affects:
   - The Kotlin engine (`app/src/main/java/com/example/`)
   - Plugin metadata (`.claude-plugin/`)
   - Skills (`plugins/compliance-ising-z3/skills/`)
   - Agents (`plugins/compliance-ising-z3/agents/`)
   - Documentation (`*.md` files)

2. **Write code following conventions**:
   - **Kotlin**: Follow [Kotlin style guide](https://kotlinlang.org/docs/coding-conventions.html)
   - **Markdown**: Use [GitHub Flavored Markdown](https://github.github.com/gfm/)
   - **YAML frontmatter**: Match existing `.md` skill/agent formats
   - **Comments**: Include WHY, not WHAT (code should be self-documenting)

3. **Maintain claim boundaries** (per DSG CLAUDE.md):
   - Never claim external Z3 solver invocation (the engine is native Kotlin)
   - Never claim `certified compliance` without legal backing
   - Always qualify `deterministic` with "for a fixed seed and fixed inputs"
   - Never report `UNSUPPORTED` as `PASS`

4. **Update documentation**:
   - Update `README.md` if adding features
   - Update skill `.md` files if changing behavior
   - Update `CHANGELOG.md` with all changes
   - Add comments for non-obvious logic

### Testing

#### Unit Tests

```bash
# Run all unit tests
./gradlew :app:testDebugUnitTest --no-daemon --stacktrace

# Run specific test class
./gradlew :app:testDebugUnitTest --tests com.example.data.qubo.QuboModelsTest
```

#### Plugin Validation

```bash
# Validate the bundled plugin manifest
cd plugins/compliance-ising-z3
claude plugin validate .
```

#### Manual Testing

1. Start a Claude Code session with the plugin enabled
2. Invoke the `z3-compliance-review` skill
3. Test with sample policy data (see `README.md` examples)
4. Verify constraint verification logic
5. Check SHA-256 audit chain generation

### Submitting Changes

1. **Commit with clear messages**:
   ```bash
   git commit -m "Fix: Correct QUBO matrix initialization for 3-element rule sets"
   ```
   
   Format:
   - `Feature:` for new functionality
   - `Fix:` for bug fixes
   - `Docs:` for documentation
   - `Refactor:` for code cleanup
   - `Test:` for test additions

2. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Open a Pull Request** to `main`:
   - Reference any related issues
   - Describe what changed and why
   - Include verification steps
   - Link to any affected skills/agents

---

## PR Review Checklist

Before submitting, ensure:

- [ ] Code passes `./gradlew build`
- [ ] All tests pass: `./gradlew :app:testDebugUnitTest`
- [ ] Plugin validates: `claude plugin validate ./plugins/compliance-ising-z3`
- [ ] CHANGELOG.md is updated
- [ ] README.md reflects changes (if applicable)
- [ ] No secrets are committed (API keys, credentials, etc.)
- [ ] Commit messages follow the format above
- [ ] Claim boundaries are respected (see DSG CLAUDE.md section 1)

---

## Documentation Style

### For Skills (SKILL.md)

```markdown
---
name: skill-name
description: >-
  Brief, single-line description of what this skill does.
---

# Skill Title

## Purpose
What problem does this solve?

## Usage
How to invoke this skill?

## Example
Code or workflow example.

## Boundaries
What are the limits/assumptions?
```

### For Agents (.md)

```markdown
---
name: agent-name
description: Brief description
tools: Read, Grep, Bash
---

# Agent Title

## Operating rules
- Rule 1
- Rule 2

## Output format
What does this agent output?
```

### For Regulatory Models

Use markdown tables with columns:
- Rule ID
- Legal Section
- Description
- Cost ($)
- Risk Reduction (%)
- Business Value
- Z3 Constraint

See `README.md` for examples.

---

## Adding New Regulatory Frameworks

If adding support for a new jurisdiction (e.g., Singapore PDPA, Canada PIPEDA):

1. **Define the rule model** in Kotlin:
   - Add to `app/src/main/java/com/example/data/qubo/QuboModels.kt`
   - Include cost, risk reduction, value for each rule
   - Define Z3 constraints

2. **Add regulatory documentation** in `README.md`:
   - Create a new section with a markdown table
   - Link to official legal sources
   - Include example constraints

3. **Update the skill** with examples:
   - Add a new use-case under `skills/z3-compliance-review/SKILL.md`
   - Show how to frame the problem
   - Demonstrate constraint forms

4. **Test the engine**:
   - Write unit tests for the new rule model
   - Run what-if simulations
   - Verify SHA-256 audit chain

5. **Update CHANGELOG.md** under a new version section

---

## Reporting Issues

When reporting a bug or requesting a feature:

1. **Check existing issues** to avoid duplicates
2. **Include reproduction steps** (what you did, what you expected, what happened)
3. **Provide evidence**:
   - Exact command or API call
   - Output or error message
   - System info (OS, Claude Code version, Node/Java versions)
4. **Suggest a fix** if you have one

### Issue Templates

#### Bug Report
```markdown
**Description**: What went wrong?

**Steps to Reproduce**: 
1. ...
2. ...

**Expected Behavior**: What should have happened?

**Actual Behavior**: What happened instead?

**Evidence**: Output, logs, screenshots

**Environment**: OS, versions, config
```

#### Feature Request
```markdown
**Description**: What feature would you like?

**Motivation**: Why is this needed?

**Proposed Solution**: How should it work?

**Alternatives Considered**: Any other approaches?
```

---

## Claim Boundary Reminders

This plugin wraps a native Kotlin engine and connects to external APIs. When contributing, remember:

1. **Z3 Solver**: The engine implements Z3/SMT-style constraints in Kotlin. There is **no external Z3 process**. Do not claim "external Z3 solver invocation" or "production Z3 formal verification" without running the external z3-solver-api service.

2. **Determinism**: Claims hold only for a **fixed seed and fixed inputs**. Always state assumptions.

3. **Compliance Certification**: Regulatory mappings are **engineering models, not legal certification**. Never claim "certified compliance" or "guaranteed compliance" without independent audit.

4. **UNSUPPORTED Decisions**: `UNSUPPORTED` is **never** `PASS`. Route to `REVIEW` or `BLOCK` based on risk level.

See `DSG CLAUDE.md` sections 1, 12, 13 for full guidance.

---

## Questions?

- **Email**: support@dsg.pics
- **GitHub Issues**: [Compliance-ising-z3-Deterministic-/issues](https://github.com/tdealer01-crypto/Compliance-ising-z3-Deterministic-/issues)
- **Documentation**: See README.md and inline skill/agent guides

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License (see LICENSE file).

Thank you for helping improve compliance-ising-z3!
