import { signalRegistry, createSignalResult } from './signal-registry.js';
import type { SignalDefinition, SalubriousOptions, PackageMetadata } from '../core/types.js';
import { SIGNAL_WEIGHTS } from '../constants.js';
import { majorDiff } from '../utils/semver.js';

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