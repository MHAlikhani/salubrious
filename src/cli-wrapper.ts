// CJS wrapper for CLI - loads ESM module dynamically
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load the ESM CLI module - use file:// URL for cross-platform compatibility
const cliPath = new URL('cli.mjs', import.meta.url);
import(cliPath.href).catch((err) => {
  console.error('Failed to load salubrious CLI:', err);
  process.exit(1);
});