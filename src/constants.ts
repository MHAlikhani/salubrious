import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let cachedVersion: string | null = null;

export async function getVersion(): Promise<string> {
  if (cachedVersion) return cachedVersion;
  try {
    const pkgPath = join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
    cachedVersion = pkg.version ?? '0.0.0';
  } catch {
    cachedVersion = '0.0.0';
  }
  return cachedVersion;
}

export const DEFAULT_REGISTRY = 'https://registry.npmjs.org';
export const DEFAULT_CACHE_DIR = '.salubrious-cache';
export const SCORE_BASE = 100;
export const GRADE_THRESHOLDS = { healthy: 80, warning: 60, atRisk: 40 } as const;
export const SIGNAL_WEIGHTS = {
  abandoned: -25, 'bus-factor': -15, archived: -20, 'no-license': -30,
  'risky-license': -40, deprecated: -50, 'major-drift': -10,
  'new-maintainer': -15, 'typosquat-risk': -20
} as const;

export const RISKY_LICENSES = new Set([
  'GPL-2.0', 'GPL-3.0', 'AGPL-1.0', 'AGPL-3.0', 'SSPL-1.0',
  'GPL-2.0-only', 'GPL-3.0-only', 'AGPL-3.0-only'
]);

export const TOP_PACKAGES_FOR_TYPOSQUAT = [
  'react', 'lodash', 'axios', 'express', 'typescript', 'jest', 'webpack',
  'eslint', 'prettier', 'babel', 'vite', 'next', 'nuxt', 'svelte', 'vue',
  'angular', 'redux', 'mobx', 'rxjs', 'ramda', 'moment', 'date-fns',
  'chalk', 'commander', 'yargs', 'inquirer', 'ora', 'cli-table', 'boxen',
  'fs-extra', 'glob', 'rimraf', 'mkdirp', 'chokidar', 'fsevents',
  'semver', 'uuid', 'crypto-js', 'bcrypt', 'jsonwebtoken', 'passport',
  'socket.io', 'ws', 'http-proxy', 'helmet', 'cors', 'compression',
  'mongoose', 'sequelize', 'typeorm', 'prisma', 'knex', 'pg', 'mysql2',
  'redis', 'ioredis', 'bull', 'agenda', 'node-cron', 'pm2', 'forever',
  'nodemon', 'concurrently', 'cross-env', 'dotenv', 'config', 'nconf',
  'winston', 'pino', 'bunyan', 'morgan', 'debug', 'loglevel',
  'jest', 'mocha', 'chai', 'sinon', 'supertest', 'cypress', 'playwright',
  'puppeteer', 'testing-library', 'enzyme', 'karma', 'jasmine',
  'babel', 'babel-core', 'babel-cli', 'babel-preset-env', 'babel-preset-react',
  'eslint', 'eslint-plugin-react', 'eslint-plugin-import', 'eslint-config-airbnb',
  'prettier', 'husky', 'lint-staged', 'commitlint', 'standard',
  'typescript', 'ts-node', 'tslib', 'tsconfig-paths', 'ts-jest',
  'webpack', 'webpack-cli', 'webpack-dev-server', 'webpack-merge',
  'rollup', 'vite', 'esbuild', 'swc', 'parcel', 'snowpack',
  'react', 'react-dom', 'react-router', 'react-redux', 'react-query',
  'next', 'nuxt', 'gatsby', 'remix', 'astro', 'svelte', 'sveltekit',
  'vue', 'vue-router', 'vuex', 'pinia', 'nuxt', 'quasar',
  'angular', 'angular-cli', 'rxjs', 'ngrx', 'angular-material',
  'tailwindcss', 'postcss', 'autoprefixer', 'cssnano', 'stylelint',
  'styled-components', 'emotion', 'jss', 'aphrodite', 'linaria',
  'graphql', 'apollo-client', 'apollo-server', 'urql', 'relay',
  'prisma', 'typeorm', 'sequelize', 'mongoose', 'knex', 'objection',
  'zod', 'yup', 'joi', 'io-ts', 'runtypes', 'superstruct',
  'axios', 'ky', 'got', 'node-fetch', 'superagent', 'request',
  'socket.io', 'ws', 'http-proxy', 'helmet', 'cors', 'compression',
  'mongoose', 'sequelize', 'typeorm', 'prisma', 'knex', 'pg', 'mysql2',
  'redis', 'ioredis', 'redis-cluster', 'keyv', 'node-cache',
  'prom-client', 'opentelemetry', 'jaeger-client', 'zipkin',
  'prometheus', 'grafana', 'datadog', 'newrelic', 'elastic-apm'
];