# CospinDSG Skill Priority

Source of truth: uploaded Agent Skills Directory - Complete List, total skills found: 285.

## Priority 1: repo safety and verification

1. systematic-debugging
2. test-driven-development
3. verification-before-completion
4. defense-in-depth
5. test-fixing
6. Trail of Bits Security Skills
7. varlock-claude-skill

## Priority 2: DSG runtime and database work

1. postgres
2. webapp-testing
3. react-best-practices
4. frontend-design
5. using-git-worktrees
6. finishing-a-development-branch
7. requesting-code-review
8. receiving-code-review

## Priority 3: packaging and documentation

1. docx
2. pdf
3. pptx
4. content-research-writer
5. internal-comms

## User-benefit gate

Every skill must help one of these outcomes:

- make CospinDSG easier to integrate into an existing customer agent
- reduce unsafe real-world actions
- improve evidence and auditability
- reduce repo regression risk
- improve deployment confidence

## Current product focus

CospinDSG is not a replacement agent. It is a deterministic runtime gate placed before real-world actions. The first sellable flow is:

Existing agent -> action plus memory packet -> DSG intent -> DSG execute -> ALLOW/STABILIZE/BLOCK -> result receipt -> audit evidence.
