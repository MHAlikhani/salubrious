import { signalRegistry, createSignalResult, levenshtein } from './signal-registry.js';
import type { SignalDefinition, SalubriousOptions, PackageMetadata } from '../core/types.js';
import { SIGNAL_WEIGHTS, TOP_PACKAGES_FOR_TYPOSQUAT } from '../constants.js';

signalRegistry.register({
  id: 'typosquat-risk',
  name: 'Typosquat Candidate',
  weight: SIGNAL_WEIGHTS['typosquat-risk'],
  analyze: async (
    _pkg: PackageMetadata,
    options: SalubriousOptions,
    context: { packageName: string }
  ): Promise<ReturnType<typeof createSignalResult> | null> => {
    const packageName = context.packageName;
    if (!packageName) return null;

    for (const topPkg of TOP_PACKAGES_FOR_TYPOSQUAT) {
      if (packageName !== topPkg) {
        const dist = levenshtein(packageName.toLowerCase(), topPkg.toLowerCase());
        if (dist <= 2 && packageName.length >= 3) {
          return createSignalResult(
            'typosquat-risk',
            'Typosquat Candidate',
            'error',
            `Name similar to popular package "${topPkg}" (distance: ${dist})`,
            { name: packageName, similarTo: topPkg, distance: dist }
          );
        }
      }
    }
    return null;
  },
});