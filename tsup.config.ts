import { defineConfig } from 'tsup';

export default defineConfig([
  // Library - dual CJS/ESM
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: false,
    sourcemap: true,
    clean: true,
    treeshake: true,
    minify: false,
    target: 'node18',
    platform: 'node',
    outDir: 'dist',
    shims: false,
    splitting: false,
    bundle: true,
  },
  // CLI - ESM only (has top-level await)
  {
    entry: ['src/cli.ts'],
    format: ['esm'],
    dts: false,
    sourcemap: true,
    clean: false,
    treeshake: true,
    minify: false,
    target: 'node18',
    platform: 'node',
    outDir: 'dist',
    shims: false,
    splitting: false,
    bundle: true,
    outExtension: () => ({ js: '.mjs' }),
  },
]);