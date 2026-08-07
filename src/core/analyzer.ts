import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { registryClient } from './registry.js';
import { githubClient } from './github.js';
import { signalRegistry, createSignalResult } from './signals.js';
import { parseLockfile, readPackageJson, getAllDependencies } from '../utils/pkg.js';
import { majorDiff } from '../utils/semver.js';
import { levenshtein } from '../signals/index.js';
import { TOP_PACKAGES_FOR_TYPOSQUAT, SIGNAL_WEIGHTS, GRADE_THRESHOLDS, SCORE_BASE } from '../constants.js';
import type { SalubriousOptions, VigorResult, PackageResult, PackageMetadata, Summary, RunMetadata, Grade } from './types.js';

async function findLockfile(cwd: string): Promise<string | null> {
  const candidates = [
    'pnpm-lock.yaml',
    'package-lock.json',
    'yarn.lock',
    'npm-shrinkwrap.json',
  ];
  
  for (const candidate of candidates) {
    try {
      const path = join(cwd, candidate);
      await readFile(path);
      return path;
    } catch {
      continue;
    }
  }
  return null;
}

function calculateGrade(score: number): Grade {
  if (score >= GRADE_THRESHOLDS.healthy) return 'healthy';
  if (score >= GRADE_THRESHOLDS.warning) return 'warning';
  if (score >= GRADE_THRESHOLDS.atRisk) return 'at-risk';
  return 'critical';
}

function calculateScore(signals: ReturnType<typeof createSignalResult>[]): number {
  let score = SCORE_BASE;
  for (const signal of signals) {
    score += signal.penalty; // penalties are negative
  }
  return Math.max(0, Math.min(100, score));
}

export const analyzer = {
  async analyze(options: SalubriousOptions): Promise<VigorResult> {
    const startTime = Date.now();
    const cwd = resolve(options.cwd ?? process.cwd());
    
    // Find and parse lockfile
    const lockfilePath = options.lockfile ?? await findLockfile(cwd);
    if (!lockfilePath) {
      throw new Error('No lockfile found. Run npm/pnpm/yarn install first.');
    }
    
    return this.analyzeLockfile(lockfilePath, options);
  },

  async analyzeLockfile(lockfilePath: string, options: SalubriousOptions = {}): Promise<VigorResult> {
    const startTime = Date.now();
    const resolvedPath = resolve(lockfilePath);
    const cwd = options.cwd ?? process.cwd();
    
    const lockfileContent = await readFile(resolvedPath, 'utf-8');
    const lockfileDeps = parseLockfile(resolvedPath, lockfileContent);
    
    // Also read package.json for metadata
    const pkg = await readPackageJson(cwd);
    const includeDev = options.includeDev ?? false;
    const allDeps = pkg ? getAllDependencies(pkg, includeDev) : {};
    
    // Filter ignored packages
    const ignorePatterns = options.ignore ?? [];
    function isIgnored(name: string): boolean {
      return ignorePatterns.some(pattern => {
        if (pattern.includes('*')) {
          const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
          return regex.test(name);
        }
        return name === pattern;
      });
    }
    
    // Get unique package names from lockfile
    const packageNames = new Set<string>();
    for (const [name, info] of lockfileDeps) {
      if (!info.dev || includeDev) {
        packageNames.add(name);
      }
    }
    
    // Also add from package.json if not in lockfile
    for (const name of Object.keys(allDeps)) {
      if (!isIgnored(name)) {
        packageNames.add(name);
      }
    }
    
    const filteredNames = Array.from(packageNames).filter(name => !isIgnored(name));
    
    // Analyze each package
    const packages: PackageResult[] = [];
    const signalCounts: Record<string, number> = {};
    
    // Configure clients
    if (options.registry) registryClient.setRegistry(options.registry);
    if (options.githubToken) githubClient.setToken(options.githubToken);
    if (options.cacheDir) {
      // TODO: pass cache to clients
    }
    
    for (const name of filteredNames) {
      const lockfileInfo = lockfileDeps.get(name);
      const version = lockfileInfo?.version ?? allDeps[name] ?? 'unknown';
      
      try {
        const metadata = await registryClient.getPackageMetadata(name);
        if (!metadata) {
          // Package not found in registry
          packages.push({
            name,
            version,
            latestVersion: 'unknown',
            score: 0,
            grade: 'critical',
            signals: [createSignalResult(
              'not-found',
              'Not Found in Registry',
              'error',
              'Package not found in npm registry',
              { name }
            )],
            metadata: {
              maintainers: [],
              time: {},
              distTags: {},
            },
          });
          continue;
        }
        
        const latestVersion = metadata.distTags?.latest ?? version;
        const signalsToRun = signalRegistry.getEnabled(options);
        const signalResults: ReturnType<typeof createSignalResult>[] = [];
        
        for (const signalDef of signalsToRun) {
          let result: ReturnType<typeof createSignalResult> | null = null;
          
          if (signalDef.id === 'typosquat-risk') {
            // Special handling for typosquat
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
            result = await signalDef.analyze(metadata, options);
          }
          
          if (result) {
            signalResults.push(result);
            signalCounts[result.id] = (signalCounts[result.id] ?? 0) + 1;
          }
        }
        
        const score = calculateScore(signalResults);
        const grade = calculateGrade(score);
        
        packages.push({
          name,
          version,
          latestVersion,
          score,
          grade,
          signals: signalResults,
          metadata,
        });
      } catch (err) {
        console.error(`Error analyzing ${name}:`, err);
        packages.push({
          name,
          version,
          latestVersion: 'unknown',
          score: 0,
          grade: 'critical',
          signals: [createSignalResult(
            'error',
            'Analysis Error',
            'error',
            `Failed to analyze: ${err instanceof Error ? err.message : String(err)}`,
            { name, error: String(err) }
          )],
          metadata: {
            maintainers: [],
            time: {},
            distTags: {},
          },
        });
      }
    }
    
    // Calculate overall score (average of package scores, weighted)
    const totalScore = packages.reduce((sum, p) => sum + p.score, 0);
    const overallScore = packages.length > 0 ? Math.round(totalScore / packages.length) : 100;
    const overallGrade = calculateGrade(overallScore);
    
    const summary: Summary = {
      total: packages.length,
      healthy: packages.filter(p => p.grade === 'healthy').length,
      warning: packages.filter(p => p.grade === 'warning').length,
      atRisk: packages.filter(p => p.grade === 'at-risk').length,
      critical: packages.filter(p => p.grade === 'critical').length,
      bySignal: signalCounts,
    };
    
    const metadata: RunMetadata = {
      analyzedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      lockfile: resolvedPath,
      registry: options.registry ?? registryClient.getRegistry(),
      signalsRun: signalRegistry.getEnabled(options).map(s => s.id),
      packagesAnalyzed: packages.length,
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