import { signalRegistry, createSignalResult } from './signal-registry.js';
import type { SignalDefinition, SalubriousOptions, PackageMetadata } from '../core/types.js';
import { SIGNAL_WEIGHTS } from '../constants.js';

signalRegistry.register({
  id: 'abandoned',
  name: 'Abandoned',
  weight: SIGNAL_WEIGHTS.abandoned,
  analyze: async (pkg: PackageMetadata, options: SalubriousOptions): Promise<ReturnType<typeof createSignalResult> | null> => {
    const thresholdMonths = options.signals?.abandoned?.thresholdMonths ?? 24;
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - thresholdMonths);

    const publishDates = Object.values(pkg.time)
      .map((d) => new Date(d))
      .filter((d) => !Number.isNaN(d.getTime()));
    if (publishDates.length === 0) return null;

    const lastPublish = new Date(Math.max(...publishDates.map((d) => d.getTime())));
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