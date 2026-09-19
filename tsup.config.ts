import { defineConfig } from 'tsup';

export default defineConfig([
  // Library - dual CJS/ESM
  {
    entry: { index: 'src/index.ts' },
    format: ['cjs', 'esm'],
    // Declarations are emitted by the `tsc --emitDeclarationOnly` step of the build
    // script: typescript@7 does not expose the JS compiler API that tsup's dts
    // bundler (rollup-plugin-dts) needs.
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
    outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.mjs' }),
  },
  // CLI - ESM (has top-level await)
  {
    entry: { cli: 'src/cli/index.ts' },
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
  // CLI - CJS wrapper (for bin compatibility) - outputs as cli.cjs
  {
    entry: { cli: 'src/cli-wrapper.ts' },
    format: ['cjs'],
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
    outExtension: () => ({ js: '.cjs' }),
  },
]);