import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: ['**/*.d.ts', '**/test/**', '**/dist/**', '**/node_modules/**'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
    include: ['test/**/*.test.ts'],
    globals: true,
    testTimeout: 30_000,
    hookTimeout: 10_000,
  },
});