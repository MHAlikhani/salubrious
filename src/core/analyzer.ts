import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { registryClient } from './registry.js';
import { githubClient } from './github.js';
import { signalRegistry, createSignalResult, levenshtein } from '../signals/index.js';
import { parseLockfile, readPackageJson, getAllDependencies, detectLockfile } from '../utils/lockfile.js';
import { majorDiff } from '../utils/semver.js';
import { TOP_PACKAGES_FOR_TYPOSQUAT, SIGNAL_WEIGHTS, GRADE_THRESHOLDS, SCORE_BASE } from '../constants.js';
import type {
  SalubriousOptions,
  SalubriousResult,
  PackageResult,
  PackageMetadata,
  Summary,
  RunMetadata,
  Grade,
} from './types.js';

async function findLockfile(cwd: string): Promise<string | null> {
  return detectLockfile(cwd);
}

function calculateGrade(score: number): Grade {
  if (score >= GRADE_THRESHOLDS.healthy) return 'healthy';
  if (score >= GRADE_THRESHOLDS.warning) return 'warning';
  if (score >= GRADE_THRESHOLDS.atRisk) return 'at-risk';
  return 'critical';
}

function calculateScore(signals: ReadonlyArray<ReturnType<typeof createSignalResult>>): number {
  let score = SCORE_BASE;
  for (const signal of signals) {
    score += signal.penalty; // penalties are negative
  }
  return Math.max(0, Math.min(100, score));
}

export const analyzer = {
  async analyze(options: SalubriousOptions): Promise<SalubriousResult> {
    const startTime = Date.now();
    const cwd = resolve(options.cwd ?? process.cwd());

    const lockfilePath = options.lockfile ?? (await findLockfile(cwd));
    if (!lockfilePath) {
      throw new Error('No lockfile found. Run npm/pnpm/yarn install first.');
    }

    return this.analyzeLockfile(lockfilePath, options);
  },

  async analyzeLockfile(lockfilePath: string, options: SalubriousOptions = {}): Promise<SalubriousResult> {
    const startTime = Date.now();
    const resolvedPath = resolve(lockfilePath);
    const cwd = options.cwd ?? process.cwd();

    const lockfileContent = await readFile(resolvedPath, 'utf-8');
    const lockfileDeps = parseLockfile(resolvedPath, lockfileContent);

    const pkg = await readPackageJson(cwd);
    const includeDev = options.includeDev ?? false;
    const allDeps = pkg ? getAllDependencies(pkg, includeDev) : {};

    const ignorePatterns = options.ignore ?? [];
    function isIgnored(name: string): boolean {
      return ignorePatterns.some((pattern) => {
        if (pattern.includes('*')) {
          const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
          return regex.test(name);
        }
        return name === pattern;
      });
    }

    const packageNames = new Set<string>();
    for (const [name, info] of lockfileDeps) {
      if (!info.dev || includeDev) {
        packageNames.add(name);
      }
    }

    for (const name of Object.keys(allDeps)) {
      if (!isIgnored(name)) {
        packageNames.add(name);
      }
    }

    const filteredNames = Array.from(packageNames).filter((name) => !isIgnored(name));

    if (options.registry) registryClient.setRegistry(options.registry);
    if (options.githubToken) githubClient.setToken(options.githubToken);

    const concurrency = options.concurrency ?? 10;
    const packages: PackageResult[] = [];
    const signalCounts: Record<string, number> = {};
    let cacheHits = 0;
    let cacheMisses = 0;

    const signalsToRun = signalRegistry.getEnabled(options);

    async function processPackage(name: string): Promise<PackageResult> {
      const lockfileInfo = lockfileDeps.get(name);
      const version = lockfileInfo?.version ?? allDeps[name] ?? 'unknown';

      try {
        const metadata = await registryClient.getPackageMetadata(name);
        if (!metadata) {
          return {
            name,
            version,
            latestVersion: 'unknown',
            score: 0,
            grade: 'critical',
            signals: [createSignalResult('not-found', 'Not Found in Registry', 'error', 'Package not found in npm registry', { name })],
            metadata: { name, version: 'unknown', maintainers: [], time: {}, distTags: {} },
          };
        }

        const latestVersion = metadata.distTags?.latest ?? version;
        const signalResults: ReturnType<typeof createSignalResult>[] = [];

        for (const signalDef of signalsToRun) {
          let result: ReturnType<typeof createSignalResult> | null = null;

          if (signalDef.id === 'typosquat-risk') {
            for (const topPkg of TOP_PACKAGES_FOR_TYPOSQUAT) {
              if (name !== topPkg) {
                const dist = levenshtein(name.toLowerCase(), topPkg.toLowerCase());
                if (dist <= 2 && name.length >= 3) {
                  result = createSignalResult(
                    'typosquat-risk',
                    'Typosquat Candidate',
                    'error',
                    `Name similar to popular package "${topPkg}" (distance: ${dist})`,
                    { name, similarTo: topPkg, distance: dist }
                  );
                  break;
                }
              }
            }
          } else {
            result = await signalDef.analyze(metadata, options, { packageName: name, registryBaseUrl: registryClient.getRegistry(), githubToken: options.githubToken });
          }

          if (result) {
            signalResults.push(result);
            signalCounts[result.id] = (signalCounts[result.id] ?? 0) + 1;
          }
        }

        const score = calculateScore(signalResults);
        const grade = calculateGrade(score);

        return {
          name,
          version,
          latestVersion,
          score,
          grade,
          signals: signalResults,
          metadata,
        };
      } catch (error) {
        console.error(`Error analyzing ${name}:`, error);
        return {
          name,
          version,
          latestVersion: 'unknown',
          score: 0,
          grade: 'critical',
          signals: [createSignalResult('error', 'Analysis Error', 'error', `Failed to analyze: ${error instanceof Error ? error.message : String(error)}`, { name, error: String(error) })],
          metadata: { name, version: 'unknown', maintainers: [], time: {}, distTags: {} },
        };
      }
    }

    for (let i = 0; i < filteredNames.length; i += concurrency) {
      const batch = filteredNames.slice(i, i + concurrency);
      const results = await Promise.all(batch.map(processPackage));
      packages.push(...results);
    }

    const totalScore = packages.reduce((sum, p) => sum + p.score, 0);
    const overallScore = packages.length > 0 ? Math.round(totalScore / packages.length) : 100;
    const overallGrade = calculateGrade(overallScore);

    const summary: Summary = {
      total: packages.length,
      healthy: packages.filter((p) => p.grade === 'healthy').length,
      warning: packages.filter((p) => p.grade === 'warning').length,
      atRisk: packages.filter((p) => p.grade === 'at-risk').length,
      critical: packages.filter((p) => p.grade === 'critical').length,
      bySignal: signalCounts,
    };

    const metadata: RunMetadata = {
      analyzedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      lockfile: resolvedPath,
      registry: options.registry ?? registryClient.getRegistry(),
      signalsRun: signalsToRun.map((s) => s.id),
      packagesAnalyzed: packages.length,
      cacheHits,
      cacheMisses,
    };

    return {
      score: overallScore,
      grade: overallGrade,
      packages,
      summary,
      metadata,
    };
  },
};