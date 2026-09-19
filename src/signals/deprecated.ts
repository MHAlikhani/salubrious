import { signalRegistry, createSignalResult } from './signal-registry.js';
import type { SignalDefinition, SalubriousOptions, PackageMetadata } from '../core/types.js';
import { SIGNAL_WEIGHTS } from '../constants.js';

signalRegistry.register({
  id: 'deprecated',
  name: 'Deprecated',
  weight: SIGNAL_WEIGHTS.deprecated,
  analyze: async (pkg: PackageMetadata, _options: SalubriousOptions): Promise<ReturnType<typeof createSignalResult> | null> => {
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