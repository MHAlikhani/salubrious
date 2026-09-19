# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Complete rewrite with 9 health signals
- GitHub Action support
- Dual CJS/ESM package with proper exports map
- XDG-compliant file caching
- Parallel package analysis with configurable concurrency

## [0.1.1] - 2026-09-19

### Added
- **9 health signals**: deprecated, risky-license, no-license, abandoned, archived, typosquat-risk, bus-factor, new-maintainer, major-drift
- CLI with multiple output formats: human, JSON, Markdown, SARIF, GitHub Actions annotations
- Library API: `analyze()` and `analyzeLockfile()`
- GitHub Action (composite) at `.github/action/action.yml`
- Zero runtime dependencies — Node.js built-ins only
- XDG-compliant file caching with ETag support
- Parallel package analysis with configurable concurrency
- Lockfile support: npm (package-lock.json), pnpm (pnpm-lock.yaml), yarn (yarn.lock)
- Comprehensive test suite (18 tests passing)
- Strict TypeScript with full type exports

### Changed
- License changed to MIT (fully open source)
- Logo moved to `assets/` with light/dark theme support
- README updated with proper badges and light/dark logo support

### Fixed
- CLI cross-platform compatibility (CJS wrapper loads ESM entry)

## [0.1.0] - 2026-09-19

### Added
- Initial public release
- Core analyzer architecture
- Registry client (npm)
- GitHub client (repo archived/license checks)
- Signal registry system
- Dual CJS/ESM build with tsup
- Biome for linting/formatting
- Vitest for testing

---

## Tagging Standards

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** — Breaking API changes (e.g., removing signals, changing config schema)
- **MINOR** — New signals, new features, new CLI options (backward compatible)
- **PATCH** — Bug fixes, typo fixes, dependency updates, documentation

### Release Tags

| Tag | Description |
|-----|-------------|
| `v0.1.1` | Production ready with 9 signals, CLI, GitHub Action, MIT license |
| `v0.1.0` | Initial public release with core analyzer |

### Git Tags

```bash
# View all tags with messages
git tag -n

# Create annotated tag (maintainer only)
git tag -a v0.1.1 -m "Release v0.1.1: 9 signals, CLI, GitHub Action, MIT license"
git push origin v0.1.1
```

### Tag Message Format

```
Release vX.Y.Z: <short summary>

<detailed changes if needed>
```

Example:
```
Release v0.1.1: 9 signals, CLI, GitHub Action, MIT license

- Added 9 health signals covering abandonment, bus factor, licenses, etc.
- CLI with human/JSON/Markdown/SARIF/GitHub Actions output
- GitHub Action at .github/action/action.yml
- MIT license (fully open source)
- Light/dark mode logos
```