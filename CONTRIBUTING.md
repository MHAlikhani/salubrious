# Contributing to salubrious

Thank you for contributing! 🎉

## Quick Start

```bash
# Clone and install
git clone https://github.com/MHAlikhani/salubrious.git
cd salubrious
corepack enable pnpm && pnpm install

# Run tests
pnpm run test

# Run linter
pnpm run lint

# Build
pnpm run build
```

## Development Workflow

1. **Create an issue** first for significant changes
2. **Branch** from `main`: `git checkout -b feat/my-feature`
3. **Make changes** with tests
4. **Run quality checks**: `pnpm run lint && pnpm run test && pnpm run build`
5. **Open a PR** with a clear description

## Code Standards

- **TypeScript strict mode** — no `any`, prefer type inference
- **Biome** for formatting/linting — run `pnpm run lint:fix`
- **Zero runtime dependencies** — Node.js built-ins only
- **Pure functions** in `signals/`, `utils/` — no side effects
- **JSDoc** on all public exports

## Adding a Signal

1. Create `src/signals/my-signal.ts` exporting the signal
2. Register in `src/signals/signal-registry.ts`
3. Add tests in `test/unit/signals/my-signal.test.ts`
4. Update `README.md` signals table
5. Add to `CHANGELOG.md`

## Testing

```bash
# Run all tests
pnpm run test

# Watch mode
pnpm run test:watch

# Coverage
pnpm run test:coverage
```

Target: **90%+ coverage** on core logic.

## Release Process

Uses [Changesets](https://github.com/changesets/changesets):

```bash
# Create a changeset
pnpm changeset

# Follow prompts (patch/minor/major)
# Changeset publishes to npm + GitHub Release on merge to main
```

## Code of Conduct

[Contributor Covenant 2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/)

By participating, you agree to uphold this code.