import { signalRegistry, createSignalResult } from '../core/signals.js';
import type { SignalDefinition, SalubriousOptions, PackageMetadata } from '../core/types.js';
import { registryClient } from '../core/registry.js';
import { githubClient } from '../core/github.js';
import { parseVersion, majorDiff } from '../utils/semver.js';
import { TOP_PACKAGES_FOR_TYPOSQUAT, RISKY_LICENSES, SIGNAL_WEIGHTS } from '../constants.js';

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () => 
    Array.from({ length: b.length + 1 }, (_, j) => j)
  );
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + 1
        );
      }
    }
  }
  return matrix[a.length][b.length];
}

// ABANDONED
signalRegistry.register({
  id: 'abandoned',
  name: 'Abandoned',
  weight: SIGNAL_WEIGHTS.abandoned,
  analyze: async (pkg: PackageMetadata, options: SalubriousOptions): Promise<ReturnType<typeof createSignalResult> | null> => {
    const thresholdMonths = options.signals?.abandoned?.thresholdMonths ?? 24;
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - thresholdMonths);
    
    const publishDates = Object.values(pkg.time).map(d => new Date(d)).filter(d => !isNaN(d.getTime()));
    if (publishDates.length === 0) return null;
    
    const lastPublish = new Date(Math.max(...publishDates.map(d => d.getTime())));
    if (lastPublish < cutoffDate) {
      const monthsAgo = Math.floor((Date.now() - lastPublish.getTime()) / (1000 * 60 * 60 * 24 * 30));
      return createSignalResult(
        'abandoned',
        'Abandoned',
        'error',
        `No publish in ${monthsAgo}+ months (last: ${lastPublish.toISOString().split('T')[0]})`,
        { lastPublish: lastPublish.toISOString(), monthsSincePublish: monthsAgo, thresholdMonths }
      );
    }
    return null;
  },
});

// BUS-FACTOR
signalRegistry.register({
  id: 'bus-factor',
  name: 'Single Maintainer',
  weight: SIGNAL_WEIGHTS['bus-factor'],
  analyze: async (pkg: PackageMetadata, options: SalubriousOptions): Promise<ReturnType<typeof createSignalResult> | null> => {
    const minMaintainers = options.signals?.['bus-factor']?.minMaintainers ?? 2;
    const maintainers = pkg.maintainers?.filter(m => m.name && m.name.trim()) ?? [];
    
    if (maintainers.length < minMaintainers) {
      return createSignalResult(
        'bus-factor',
        'Single Maintainer',
        'error',
        `Only ${maintainers.length} maintainer(s) (minimum: ${minMaintainers})`,
        { maintainerCount: maintainers.length, maintainers: maintainers.map(m => m.name), minMaintainers }
      );
    }
    return null;
  },
});

// ARCHIVED
signalRegistry.register({
  id: 'archived',
  name: 'Archived Repo',
  weight: SIGNAL_WEIGHTS.archived,
  analyze: async (pkg: PackageMetadata, options: SalubriousOptions): Promise<ReturnType<typeof createSignalResult> | null> => {
    const repoUrl = pkg.repository?.url ?? pkg.homepage;
    if (!repoUrl) return null;
    
    const parsed = githubClient.parseRepoUrl(repoUrl);
    if (!parsed) return null;
    
    const isArchived = await githubClient.isArchived(parsed.owner, parsed.repo);
    if (isArchived) {
      return createSignalResult(
        'archived',
        'Archived Repo',
        'error',
        `GitHub repository ${parsed.owner}/${parsed.repo} is archived`,
        { owner: parsed.owner, repo: parsed.repo, url: repoUrl }
      );
    }
    return null;
  },
});

// NO-LICENSE
signalRegistry.register({
  id: 'no-license',
  name: 'No License',
  weight: SIGNAL_WEIGHTS['no-license'],
  analyze: async (pkg: PackageMetadata, options: SalubriousOptions): Promise<ReturnType<typeof createSignalResult> | null> => {
    const license = pkg.license?.toLowerCase().trim();
    if (!license || license === 'unknown' || license === 'unlicense' || license === 'see license in license') {
      return createSignalResult(
        'no-license',
        'No License',
        'error',
        'Missing or unknown SPDX license identifier',
        { license: pkg.license ?? 'none' }
      );
    }
    return null;
  },
});

// RISKY-LICENSE
signalRegistry.register({
  id: 'risky-license',
  name: 'Viral License',
  weight: SIGNAL_WEIGHTS['risky-license'],
  analyze: async (pkg: PackageMetadata, options: SalubriousOptions): Promise<ReturnType<typeof createSignalResult> | null> => {
    const license = pkg.license?.toUpperCase().trim();
    if (!license) return null;
    
    for (const risky of RISKY_LICENSES) {
      if (license.includes(risky)) {
        return createSignalResult(
          'risky-license',
          'Viral License',
          'error',
          `Uses viral license ${risky} - may require source disclosure`,
          { license: pkg.license, matchedLicense: risky }
        );
      }
    }
    return null;
  },
});

// DEPRECATED
signalRegistry.register({
  id: 'deprecated',
  name: 'Deprecated',
  weight: SIGNAL_WEIGHTS.deprecated,
  analyze: async (pkg: PackageMetadata, options: SalubriousOptions): Promise<ReturnType<typeof createSignalResult> | null> => {
    if (pkg.deprecated) {
      return createSignalResult(
        'deprecated',
        'Deprecated',
        'error',
        `Package is deprecated: ${pkg.deprecated}`,
        { deprecatedMessage: pkg.deprecated }
      );
    }
    return null;
  },
});

// MAJOR-DRIFT
signalRegistry.register({
  id: 'major-drift',
  name: 'Major Version Lag',
  weight: SIGNAL_WEIGHTS['major-drift'],
  analyze: async (pkg: PackageMetadata, options: SalubriousOptions): Promise<ReturnType<typeof createSignalResult> | null> => {
    const maxMajorBehind = options.signals?.['major-drift']?.maxMajorBehind ?? 1;
    const latestVersion = pkg.distTags?.latest;
    const currentVersion = pkg.time ? Object.keys(pkg.time).pop() : undefined;
    
    if (!latestVersion || !currentVersion) return null;
    
    const diff = majorDiff(currentVersion, latestVersion);
    if (diff > maxMajorBehind) {
      return createSignalResult(
        'major-drift',
        'Major Version Lag',
        'warning',
        `${diff} major version(s) behind (current: ${currentVersion}, latest: ${latestVersion})`,
        { currentVersion, latestVersion, majorBehind: diff, maxMajorBehind }
      );
    }
    return null;
  },
});

// NEW-MAINTAINER
signalRegistry.register({
  id: 'new-maintainer',
  name: 'Recent Maintainer Change',
  weight: SIGNAL_WEIGHTS['new-maintainer'],
  analyze: async (pkg: PackageMetadata, options: SalubriousOptions): Promise<ReturnType<typeof createSignalResult> | null> => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const recentPublishes = Object.entries(pkg.time ?? {})
      .filter(([_, date]) => new Date(date) > sixMonthsAgo)
      .map(([version]) => version);
    
    if (recentPublishes.length > 0) {
      // Check if maintainer list changed - simplified check
      // In reality we'd need historical maintainer data from npm
      const maintainers = pkg.maintainers?.filter(m => m.name && m.name.trim()) ?? [];
      if (maintainers.length > 0) {
        // This is a simplified heuristic - real implementation would check
        // npm's maintainer history API
        return createSignalResult(
          'new-maintainer',
          'Recent Maintainer Change',
          'warning',
          `New publish in last 6 months (${recentPublishes.length} publishes)`,
          { recentPublishes, maintainerCount: maintainers.length }
        );
      }
    }
    return null;
  },
});

// TYPOSQUAT-RISK
signalRegistry.register({
  id: 'typosquat-risk',
  name: 'Typosquat Candidate',
  weight: SIGNAL_WEIGHTS['typosquat-risk'],
  analyze: async (pkg: PackageMetadata, options: SalubriousOptions): Promise<ReturnType<typeof createSignalResult> | null> => {
    // We don't have the package name in PackageMetadata
    // This signal needs the package name passed separately
    // For now, we'll return null and handle in analyzer
    return null;
  },
});

export { levenshtein };