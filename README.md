# salubrious

<p align="center">
  <strong>Know the health of your dependency tree before it kills your build.</strong>
</p>

<p align="center">
  <a href="https://npmjs.com/package/salubrious"><img src="https://img.shields.io/npm/v/salubrious?label=salubrious&color=00D47E" alt="npm version"></a>
  <a href="https://github.com/salubrious/salubrious/actions"><img src="https://github.com/salubrious/salubrious/workflows/CI/badge.svg" alt="CI"></a>
  <a href="https://npmjs.com/package/salubrious"><img src="https://img.shields.io/npm/dm/salubrious?color=00D47E" alt="downloads"></a>
  <a href="https://github.com/salubrious/salubrious/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/salubrious?color=00D47E" alt="license"></a>
</p>

---

## Why salubrious?

`npm audit` only checks for **known vulnerabilities**. But the most dangerous package in your tree might have **zero CVEs** — it might simply be:

- 🟤 **Abandoned** — no updates in 2+ years (no one will patch the next zero-day)
- 👤 **Single maintainer** — if that account is phished, malicious code ships
- 📦 **Archived on GitHub** — publicly signaled abandonment, but still publishes
- ⚖️ **No license / viral license** — legal time bomb for commercial projects
- 📉 **Major version drift** — 2+ majors behind, breaking changes accumulate

**salubrious** catches all of these. And more.

## Install

```bash
# Global (recommended)
npm install -g salubrious

# Or per-project
npm install -D salubrious
```

## Quick Start

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

## Signals (v0.0.1)

| Signal | Penalty | Description |
|--------|---------|-------------|
| `abandoned` | -25 | No publish in 24+ months |
| `bus-factor` | -15 | Only 1 npm maintainer |
| `archived` | -20 | GitHub repo archived |
| `no-license` | -30 | Missing or unknown SPDX license |
| `risky-license` | -40 | GPL/AGPL/SSPL in production deps |
| `deprecated` | -50 | npm deprecated flag set |
| `major-drift` | -10 | 2+ major versions behind latest |
| `new-maintainer` | -15 | New maintainer in last 6 months |
| `typosquat-risk` | -20 | Name similar to top-1000 package |

**Scoring:** Base 100. Sum penalties. ≥80 🟢 | 60-79 🟡 | 40-59 🟠 | <40 🔴

## Configuration

Create `salubrious.config.json`:

```json
{
  "failThreshold": 60,
  "failOn": "warning",
  "includeDev": false,
  "ignore": ["@types/*", "eslint-*"],
  "signals": {
    "abandoned": { "thresholdMonths": 24 },
    "busFactor": { "minMaintainers": 2 }
  }
}
```

## Library Usage

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

## CI Integration

### GitHub Actions

```yaml
- name: Check dependency health
  run: npx salubrious --fail-on=warning --format=github-actions
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

- **Zero runtime dependencies** — only Node.js built-ins
- **TypeScript-first** — strict mode, full type exports
- **Dual CJS/ESM** — modern exports map
- **Fast** — parallel fetching, XDG-compliant caching, <2s on 500-dep trees
- **Extensible** — plugin API coming in v0.2

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). All PRs welcome!

## License

MIT © 2026 salubrious contributors