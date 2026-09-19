import { signalRegistry, createSignalResult } from './signal-registry.js';
import type { SignalDefinition, SalubriousOptions, PackageMetadata } from '../core/types.js';
import { SIGNAL_WEIGHTS } from '../constants.js';

signalRegistry.register({
  id: 'new-maintainer',
  name: 'Recent Maintainer Change',
  weight: SIGNAL_WEIGHTS['new-maintainer'],
  analyze: async (pkg: PackageMetadata, _options: SalubriousOptions): Promise<ReturnType<typeof createSignalResult> | null> => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const recentPublishes = Object.entries(pkg.time ?? {})
      .filter(([, date]) => new Date(date) > sixMonthsAgo)
      .map(([version]) => version);

    if (recentPublishes.length > 0) {
      const maintainers = pkg.maintainers?.filter((m) => m.name && m.name.trim()) ?? [];
      if (maintainers.length > 0) {
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