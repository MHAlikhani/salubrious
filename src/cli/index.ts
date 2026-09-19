#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { analyze } from '../index.js';
import { getVersion } from '../constants.js';

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: 'boolean', short: 'h' },
    version: { type: 'boolean', short: 'v' },
    json: { type: 'boolean' },
    markdown: { type: 'boolean' },
    sarif: { type: 'boolean' },
    'github-actions': { type: 'boolean' },
    'fail-on': { type: 'string' },
    'fail-threshold': { type: 'string' },
    'include-dev': { type: 'boolean' },
    ignore: { type: 'string' },
    only: { type: 'string' },
    config: { type: 'string' },
    cache: { type: 'string' },
    'no-cache': { type: 'boolean' },
    offline: { type: 'boolean' },
    cwd: { type: 'string', short: 'p' },
    concurrency: { type: 'string' },
  },
  strict: true,
  allowPositionals: true,
});

if (values.help) {
  console.log(`
Usage: salubrious [options]

Options:
  -h, --help                 Show help
  -v, --version              Show version
  -p, --cwd <path>           Project directory (default: cwd)
      --json                 Output JSON
      --markdown             Output Markdown
      --sarif                Output SARIF
      --github-actions       Output GitHub Actions annotations
      --fail-on <level>      Fail on: warning | at-risk | critical
      --fail-threshold <n>   Fail if score < n
      --include-dev          Include devDependencies
      --ignore <globs>       Comma-separated globs to ignore
      --only <signals>       Comma-separated signal IDs to run
      --config <path>        Config file path
      --cache <dir>          Cache directory
      --no-cache             Disable cache
      --offline              Offline mode
      --concurrency <n>      Concurrent package analysis (default: 10)
  `);
  process.exit(0);
}

if (values.version) {
  const version = await getVersion();
  console.log(version);
  process.exit(0);
}

const options = {
  cwd: values.cwd ?? process.cwd(),
  includeDev: values['include-dev'],
  ignore: values.ignore?.split(',').filter(Boolean),
  only: values.only?.split(',').filter(Boolean),
  config: values.config,
  cacheDir: values.cache,
  offline: values.offline,
  concurrency: values.concurrency ? Number(values.concurrency) : undefined,
};

try {
  const result = await analyze(options);
  const { reporter } = await import('../core/reporter.js');

  let format: 'human' | 'json' | 'markdown' | 'sarif' | 'github-actions' = 'human';
  if (values.json) format = 'json';
  else if (values.markdown) format = 'markdown';
  else if (values.sarif) format = 'sarif';
  else if (values['github-actions']) format = 'github-actions';

  console.log(reporter.format(result, format));

  const failOn = values['fail-on'] as 'warning' | 'at-risk' | 'critical' | undefined;
  const failThreshold = values['fail-threshold'] ? Number(values['fail-threshold']) : undefined;

  let shouldFail = false;
  if (failThreshold !== undefined && result.score < failThreshold) shouldFail = true;
  if (failOn) {
    const order = { healthy: 0, warning: 1, 'at-risk': 2, critical: 3 };
    if (order[result.grade] >= order[failOn]) shouldFail = true;
  }
  if (shouldFail) process.exit(1);
} catch (error) {
  console.error('Error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}