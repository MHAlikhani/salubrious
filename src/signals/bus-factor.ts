import { signalRegistry, createSignalResult } from './signal-registry.js';
import type { SignalDefinition, SalubriousOptions, PackageMetadata } from '../core/types.js';
import { SIGNAL_WEIGHTS } from '../constants.js';

signalRegistry.register({
  id: 'bus-factor',
  name: 'Single Maintainer',
  weight: SIGNAL_WEIGHTS['bus-factor'],
  analyze: async (pkg: PackageMetadata, options: SalubriousOptions): Promise<ReturnType<typeof createSignalResult> | null> => {
    const minMaintainers = options.signals?.['bus-factor']?.minMaintainers ?? 2;
    const maintainers = pkg.maintainers?.filter((m) => m.name && m.name.trim()) ?? [];

    if (maintainers.length < minMaintainers) {
      return createSignalResult(
        'bus-factor',
        'Single Maintainer',
        'error',
        `Only ${maintainers.length} maintainer(s) (minimum: ${minMaintainers})`,
        { maintainerCount: maintainers.length, maintainers: maintainers.map((m) => m.name), minMaintainers }
      );
    }
    return null;
  },
});