export * from './core/types.js';
export { signalRegistry, SignalRegistry, createSignalResult, levenshtein } from './signals/signal-registry.js';

export async function analyze(options: import('./core/types.js').SalubriousOptions): Promise<import('./core/types.js').SalubriousResult> {
  const { analyzer } = await import('./core/analyzer.js');
  return analyzer.analyze(options);
}

export async function analyzeLockfile(
  lockfilePath: string,
  options?: import('./core/types.js').SalubriousOptions
): Promise<import('./core/types.js').SalubriousResult> {
  const { analyzer } = await import('./core/analyzer.js');
  return analyzer.analyzeLockfile(lockfilePath, options);
}