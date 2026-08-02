# Changelog

All notable changes to the compliance-ising-z3 plugin are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-08-01

### Added
- Enhanced plugin.json metadata for improved discoverability
- LICENSE file (MIT)
- CHANGELOG documentation
- INSTALL.md guide for setup and integration
- CONTRIBUTING.md guidelines for community contributions
- Improved maintenance indicators and documentation
- Extended skill descriptions with regulatory framework details
- Support for Thai Criminal Law, EU GDPR/AI Act, Thai PDPA, and FinTech compliance models

### Changed
- Enhanced README with clearer component descriptions
- Improved external API documentation in references/external-apis.md
- Updated agent documentation with stricter claim boundaries
- Refined z3-compliance-review skill with better constraint form examples
- Enhanced compliance-agent.md with clearer operating rules

### Fixed
- Plugin validation compatibility with official Claude Code plugin schema
- SKILL.md format compliance (converted from custom .json format)
- Agent documentation YAML frontmatter validation

### Docs
- Added comprehensive INSTALL.md for plugin installation steps
- Enhanced plugin.json with structured metadata fields
- Added CONTRIBUTING.md for transparency and community engagement

## [2.0.0] - 2026-07-31

### Added
- Initial integration of compliance-ising-z3 plugin with DSG control plane
- Z3/SMT-style constraint verification capabilities
- QUBO/Ising policy optimization skills
- Deterministic simulated annealing with seeded PRNG
- What-if counterfactual simulation
- SHA-256 provenance audit chain
- Multi-regulatory framework support

### Documentation
- README.md with full feature overview
- skills/z3-compliance-review/SKILL.md
- agents/compliance-agent.md
- references/external-apis.md with API endpoint documentation

## [1.0.0] - 2026-07-15

### Initial Release
- Source repository: tdealer01-crypto/Compliance-ising-z3-Deterministic-
- Kotlin/Android native engine
- Deterministic QUBO & Ising model matrix engine
- Z3/SMT formal constraint logic verification
- Regulatory framework mappings for multiple jurisdictions
