# Contributing to DSG ONE / ProofGate Control Plane

Thank you for considering contributing to DSG ONE! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [AI Agent Contributors](#ai-agent-contributors)
- [Getting Help](#getting-help)

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- A GitHub account

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/tdealer01-crypto-dsg-control-plane.git
cd tdealer01-crypto-dsg-control-plane
```

3. Add upstream remote:

```bash
git remote add upstream https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane.git
```

### Local Setup

1. Install dependencies:

```bash
npm ci
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Configure Supabase and other services (see [docs/QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md))

4. Verify setup:

```bash
npm run typecheck
npm run build
npm test
```

All checks should pass before you start making changes.

## Development Workflow

### Branch Naming

Use descriptive branch names:

- `feat/short-description` - New features
- `fix/bug-name` - Bug fixes
- `docs/what-changed` - Documentation updates
- `refactor/component-name` - Code refactoring
- `test/test-area` - Test improvements

**Examples:**
- `feat/add-webhook-support`
- `fix/sql-injection-api-execute`
- `docs/update-deployment-guide`

### Commit Messages

Write clear, descriptive commit messages:

```
<type>: <short summary>

<optional detailed description>

<optional footer>
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `style:` Formatting, no code change
- `refactor:` Code change that neither fixes a bug nor adds a feature
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

**Examples:**
```
feat: add Trinity AI multi-agent orchestration

Add 5-agent system for job discovery and execution with DSG governance gates.

Closes #123
```

```
fix: prevent SQL injection in /api/execute

Use parameterized queries instead of string interpolation.

Security issue reported by Jane Researcher.
```

### Keep Your Fork Updated

Regularly sync with upstream:

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

## Coding Standards

### TypeScript

- Use TypeScript strict mode (enabled in `tsconfig.json`)
- Prefer explicit types over `any`
- Document complex types and interfaces
- Follow existing code style

### Next.js Conventions

- Use App Router (`app/` directory)
- Server Components by default
- Client Components only when needed (interactivity)
- API routes in `app/api/*/route.ts`
- Export `dynamic = 'force-dynamic'` for non-cached API routes

### Code Quality

- Run ESLint: code should follow existing style
- Keep functions small and focused
- Add comments for complex logic
- Avoid premature optimization
- Remove console.logs and debugging code

### Security Rules

**Never commit:**
- API keys, tokens, or credentials
- `.env` files with real values
- Customer data or PII
- Secrets in code comments

**Always:**
- Use parameterized queries (no SQL injection)
- Validate and sanitize user input
- Check authorization before data access
- Use security headers (already configured)
- Test with security in mind

## Testing Requirements

### Before Submitting a PR

All PRs must pass these checks:

```bash
# 1. TypeScript compilation
npm run typecheck

# 2. Build check
npm run build

# 3. Run tests
npm test

# 4. Run targeted tests (if applicable)
npm run test:unit
npm run test:integration
```

### Writing Tests

- Place tests in `tests/` directory
- Unit tests: `tests/unit/`
- Integration tests: `tests/integration/`
- Use Vitest framework (already configured)
- Aim for meaningful coverage, not just 100%

**Example test:**

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '@/lib/myModule';

describe('myFunction', () => {
  it('should return expected result', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });
});
```

### Test Coverage

- New features should include tests
- Bug fixes should include regression tests
- API routes should have integration tests
- Critical paths must have high coverage

## Pull Request Process

### Before Opening a PR

1. ✅ Ensure all tests pass locally
2. ✅ Run typecheck and build successfully
3. ✅ Update documentation if needed
4. ✅ Add tests for new functionality
5. ✅ Check for security issues
6. ✅ Sync with latest main branch

### Opening a PR

1. Push your branch to your fork:

```bash
git push origin feat/my-feature
```

2. Go to GitHub and create a Pull Request
3. Fill out the PR template completely
4. Link related issues (e.g., "Closes #123")
5. Add appropriate labels

### PR Template

Your PR should include:

- **Description:** What changes are included
- **Motivation:** Why this change is needed
- **Testing:** What tests were added/updated
- **Screenshots:** For UI changes
- **Breaking changes:** List any breaking changes
- **Checklist:** Complete the verification checklist

### Review Process

- PRs require at least one approval
- CI checks must pass (typecheck, tests, build)
- Security scan must pass (CodeQL, Gitleaks)
- Address reviewer feedback promptly
- Keep PR scope focused and reviewable

### After Approval

- Maintainers will merge your PR
- Delete your feature branch after merge
- Thank reviewers for their time

## AI Agent Contributors

If you're an AI agent (Claude, Codex, GitHub Copilot, etc.), please read:

- [AGENTS.md](AGENTS.md) - Permanent agent operating rules
- [CLAUDE.md](CLAUDE.md) - Detailed agent guide and boundaries

**Key rules for AI agents:**

1. **Evidence-first:** Never claim something without inspecting actual files
2. **No guessing:** Use "pending" or "not verified" when uncertain
3. **Truth boundary:** Do not exaggerate readiness or capabilities
4. **Verification required:** Run commands and report exact results
5. **User benefit:** Make clear what users gain from changes

## Getting Help

### Resources

- 📚 [Documentation](docs/README.md) (when available)
- 🚀 [Quick Start](QUICKSTART.md)
- 🔧 [Troubleshooting Guide](docs/TROUBLESHOOTING_GUIDE.md)
- 📖 [API Reference](docs/API_REFERENCE_TIER2.md)

### Communication Channels

- **GitHub Issues:** Bug reports and feature requests
- **GitHub Discussions:** Questions and community discussion (when enabled)
- **GitHub Sponsors:** Support the project

### Response Times

We aim for:

- Security issues: 24-48 hours
- Bug reports: 3-5 business days
- Feature requests: Acknowledged within 1 week
- PR reviews: Initial feedback within 5 business days

**Note:** We're a small team, so please be patient. We appreciate your contribution!

## Types of Contributions

We welcome:

- 🐛 **Bug fixes** - Fix issues and edge cases
- ✨ **New features** - Add capabilities (discuss first in an issue)
- 📝 **Documentation** - Improve guides, examples, and API docs
- ✅ **Tests** - Increase coverage and test quality
- 🎨 **UI/UX** - Design improvements and accessibility
- 🔧 **DevOps** - CI/CD, deployment, and tooling improvements
- 🌐 **Translations** - Multi-language support
- 📊 **Performance** - Optimization and benchmarking

## What We Review For

When reviewing PRs, we check:

- **Correctness:** Does it solve the problem?
- **Tests:** Are there adequate tests?
- **Security:** Any vulnerabilities introduced?
- **Performance:** Does it impact performance?
- **Documentation:** Is it documented?
- **Code quality:** Is it readable and maintainable?
- **Breaking changes:** Are they necessary and documented?

## Recognition

Contributors are recognized in:

- Release notes
- Git commit history
- Future CONTRIBUTORS.md file (planned)
- Project acknowledgments

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0, the same license as this project.

---

## Questions?

If something is unclear or you need help:

1. Check existing documentation
2. Search closed issues and PRs
3. Open a new issue with your question
4. Tag with `question` label

We're here to help! Thank you for contributing to DSG ONE. 🙏

---

*Last Updated: June 2026*
