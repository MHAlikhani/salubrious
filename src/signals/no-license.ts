import { signalRegistry, createSignalResult } from './signal-registry.js';
import type { SignalDefinition, SalubriousOptions, PackageMetadata } from '../core/types.js';
import { SIGNAL_WEIGHTS } from '../constants.js';

signalRegistry.register({
  id: 'no-license',
  name: 'No License',
  weight: SIGNAL_WEIGHTS['no-license'],
  analyze: async (pkg: PackageMetadata, _options: SalubriousOptions): Promise<ReturnType<typeof createSignalResult> | null> => {
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