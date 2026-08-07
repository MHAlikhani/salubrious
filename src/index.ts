export * from './core/types';
export { signalRegistry, SignalRegistry, createSignalResult } from './core/signals';

export async function analyze(options: import('./core/types').SalubriousOptions): Promise<import('./core/types').VigorResult> {
  const { analyzer } = await import('./core/analyzer');
  return analyzer.analyze(options);
}

export async function analyzeLockfile(
  lockfilePath: string,
  options?: import('./core/types').SalubriousOptions
): Promise<import('./core/types').VigorResult> {
  const { analyzer } = await import('./core/analyzer');
  return analyzer.analyzeLockfile(lockfilePath, options);
}