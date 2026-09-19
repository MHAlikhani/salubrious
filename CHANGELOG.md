# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.5] - 2026-09-19

### Fixed
- **Package entry points**: `main` and `exports["."].require` pointed at `./dist/index.js`, which the build never emitted. They now resolve to `./dist/index.cjs`.
- **Type declarations**: no `.d.ts` file was ever published, so TypeScript consumers got nothing. Declarations are now emitted for both entry points (`dist/index.d.ts`, `dist/cli/index.d.ts`).
- **CLI bundle overwrote the library bundle**: `src/cli/index.ts` and `src/index.ts` shared the output name `index`, so `dist/index.mjs` actually contained the CLI. The CLI now builds to `dist/cli.mjs` and the CJS bin wrapper loads it explicitly.
- **Lockfile parsing**:
  - pnpm: `pnpm-lock.yaml` v5/v6/v9 layouts now parse correctly, with peer-resolution suffixes such as `5.0.1(vitest@5.0.1)` stripped. The previous parser returned a single bogus entry named `version` and ignored every real dependency.
  - yarn: both classic v1 (`version "1.2.3"`) and Berry (`version: 1.2.3`) entries parse, including scoped names and comma-separated patterns.
  - npm: `node_modules/a/node_modules/b` resolves to `b`, and legacy `lockfileVersion: 1` trees are walked recursively.
- **Type errors**: 47 errors under `strict` + `noUncheckedIndexedAccess` fixed across `core/github`, `core/registry`, `core/reporter`, `signals/*`, `utils/http`, `utils/lockfile` and `utils/semver`.
- **HTTP client**: cache revalidation called `requestOnce()` without a `timeout` argument, so revalidated requests ran without a timeout.
- **Version reporting**: `getVersion()` returned a hardcoded string, and the SARIF report plus the HTTP `User-Agent` were pinned to `0.0.0`. All three now read the published `package.json`.

### Changed
- Build is now `tsup && tsc --emitDeclarationOnly`; tsup's declaration bundler cannot run against TypeScript 7, which no longer exposes the JS compiler API.

### Note
- Versions 0.1.2, 0.1.3 and 0.1.4 have no corresponding commits in this repository: tags `v0.1.2` and `v0.1.3` both point at the v0.1.1 commit.

## [0.1.6] - 2026-09-19

### Fixed
- **GitHub Action**: `action.yml` moved to the repository root. That is what `uses: MHAlikhani/salubrious@<ref>` (and the README) resolve to, and it is where GitHub Marketplace requires the metadata; the previous `.github/action/` location was never reachable through that reference.
- **GitHub Action**: it passed `--format=<value>`, but the CLI has one flag per format (`--json`, `--markdown`, `--sarif`, `--github-actions`) and parses arguments strictly, so the action failed on its own default input. Inputs are now mapped to the real flags.
- **GitHub Action**: removed `cache: 'npm'` from the Node setup step, which failed in repositories without a `package-lock.json`, and moved the action to Node 22.
- **Release workflow**: publishing is driven by version tags (or manual dispatch) instead of every push to `main`, and is skipped when that version already exists on the registry.
- **package.json**: removed the `publish` script, which made `pnpm publish` publish through the script and again itself, failing with `409 Conflict`.

### Added
- `version` input on the GitHub Action (defaults to `latest`).

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