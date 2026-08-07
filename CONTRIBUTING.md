# Contributing to salubrious

Thank you!

## Development

```bash
pnpm install
pnpm run dev        # Watch mode
pnpm run test       # Run tests
pnpm run lint       # Check format + lint
pnpm run typecheck  # TypeScript check
```

## Code Style

- Biome handles formatting & linting (`pnpm run format`, `pnpm run lint:fix`)
- Strict TypeScript (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- Zero runtime dependencies — use Node.js built-ins only
- Pure functions in `signals/`, `utils/` — no side effects
- JSDoc on all public exports

## Adding a Signal

1. Create `src/signals/my-signal.ts` exporting `analyze(pkg, options)`
2. Register in `src/signals/index.ts`
3. Add tests in `test/unit/signals/my-signal.test.ts`
4. Update `README.md` signals table

## Release Process

Uses Changesets:

```bash
changeset add  # Follow prompts
git add . && git commit -m "chore: version bump"
git push origin main
# GitHub Action publishes to npm
```

## License & Contributions

By contributing, you agree that your contributions will be licensed under the [Salubrious License v1.0](LICENSE), which protects the project's brand and novelty while remaining free for all uses.

## Code of Conduct

[Contributor Covenant 2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/)