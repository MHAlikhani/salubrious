import { signalRegistry, createSignalResult } from './signal-registry.js';
import type { SignalDefinition, SalubriousOptions, PackageMetadata } from '../core/types.js';
import { SIGNAL_WEIGHTS, RISKY_LICENSES } from '../constants.js';

signalRegistry.register({
  id: 'risky-license',
  name: 'Viral License',
  weight: SIGNAL_WEIGHTS['risky-license'],
  analyze: async (pkg: PackageMetadata, _options: SalubriousOptions): Promise<ReturnType<typeof createSignalResult> | null> => {
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