<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="assets/logo-light.png">
    <img alt="salubrious logo" src="assets/logo-light.png" width="300">
  </picture>
</p>

<p align="center">
  <strong>Know the health of your dependency tree before it kills your build.</strong>
</p>

<p align="center">
  <a href="https://npmjs.com/package/salubrious"><img src="https://img.shields.io/npm/v/salubrious?style=flat-square&logo=npm&logoColor=white&label=npm&color=CB3837" alt="npm version"></a>
  <a href="https://github.com/MHAlikhani/salubrious/actions"><img src="https://img.shields.io/github/actions/workflow/status/MHAlikhani/salubrious/ci.yml?style=flat-square&logo=githubactions&logoColor=white&label=CI" alt="CI"></a>
  <a href="https://github.com/MHAlikhani/salubrious/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/salubrious?style=flat-square&label=license&color=00D47E" alt="license"></a>
  <a href="https://github.com/MHAlikhani/salubrious"><img src="https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript strict"></a>
  <a href="https://github.com/MHAlikhani/salubrious"><img src="https://img.shields.io/badge/dependencies-0-00D47E?style=flat-square" alt="zero dependencies"></a>
</p>

---

## The problem with `npm audit`

`npm audit` only catches **known vulnerabilities**. But the package that takes down your build — or your production — usually has **zero CVEs**. It's just quietly rotting:

| Risk | Why it matters |
|------|----------------|
| 🟤 **Abandoned** | No updates in 2+ years. Nobody's patching the next zero-day. |
| 👤 **Bus factor of 1** | One phished account and malicious code ships to millions. |
| 📦 **Archived repo** | Abandonment is public — but the package still publishes. |
| ⚖️ **No license / viral license** | A legal time bomb for commercial projects. |
| 📉 **Major version drift** | 2+ majors behind. Breaking changes pile up silently. |

**salubrious** catches all of these — and more.

## Install

```bash
# Global (recommended)
npm install -g salubrious

# Or per-project
npm install -D salubrious
```

## Quick start

```bash
# Analyze current project (auto-detects lockfile)
salubrious

# CI-friendly: fail on any warning
salubrious --fail-on=warning

# Machine-readable output
salubrious --json

# GitHub Actions annotations
salubrious --format=github-actions
```

## Signals

Every package starts at **100** and loses points for each risk signal detected.

| Signal | Penalty | Description |
|--------|:-------:|-------------|
| `deprecated` | −50 | npm deprecated flag set |
| `risky-license` | −40 | GPL/AGPL/SSPL in production deps |
| `no-license` | −30 | Missing or unknown SPDX license |
| `abandoned` | −25 | No publish in 24+ months |
| `archived` | −20 | GitHub repo archived |
| `typosquat-risk` | −20 | Name similar to a top-1000 package |
| `bus-factor` | −15 | Only 1 npm maintainer |
| `new-maintainer` | −15 | New maintainer in the last 6 months |
| `major-drift` | −10 | 2+ major versions behind latest |

**Grading:** ≥80 🟢 healthy · 60–79 🟡 warning · 40–59 🟠 risky · <40 🔴 critical

## Configuration

Create `salubrious.config.json` in your project root:

```json
{
  "failThreshold": 60,
  "failOn": "warning",
  "includeDev": false,
  "ignore": ["@types/*", "eslint-*"],
  "signals": {
    "abandoned": { "thresholdMonths": 24 },
    "bus-factor": { "minMaintainers": 2 }
  }
}
```

## Library usage

```typescript
import { analyze } from 'salubrious';

const result = await analyze({ cwd: './my-app' });
console.log(`Health score: ${result.score}/100 (${result.grade})`);

result.packages.forEach(p => {
  if (p.grade !== 'healthy') {
    console.log(`${p.name}@${p.version}: ${p.score} — ${p.signals.map(s => s.message).join('; ')}`);
  }
});
```

## CI integration

### GitHub Actions

```yaml
- name: Check dependency health
  uses: MHAlikhani/salubrious@v0.1.6
  with:
    fail-on: warning
    format: github-actions
```

### GitLab CI

```yaml
dependency_health:
  script: npx salubrious --fail-on=warning --json > salubrious-report.json
  artifacts:
    reports:
      sast: salubrious-report.json
```

## Architecture

- **Zero runtime dependencies** — Node.js built-ins only
- **TypeScript-first** — strict mode, full type exports
- **Dual CJS/ESM** — modern exports map
- **Fast** — parallel fetching, XDG-compliant caching, <2s on 500-dep trees
- **Extensible** — plugin API coming in v0.2

## Contributing

All PRs welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

## License

MIT License © 2026 Mohammad Hossein Alikhani

See [LICENSE](LICENSE) for details.