import type { SignalDefinition, SignalConfig, SalubriousOptions, SignalResult, PackageMetadata } from '../core/types.js';
import { SIGNAL_WEIGHTS } from '../constants.js';

export class SignalRegistry {
  private readonly signals = new Map<string, SignalDefinition>();

  register(signal: SignalDefinition): void {
    this.signals.set(signal.id, signal);
  }

  get(id: string): SignalDefinition | undefined {
    return this.signals.get(id);
  }

  getAll(): ReadonlyArray<SignalDefinition> {
    return Array.from(this.signals.values());
  }

  getEnabled(options: SalubriousOptions): ReadonlyArray<SignalDefinition> {
    const only = options.only ?? [];
    return this.getAll().filter((s) => only.length === 0 || only.includes(s.id));
  }
}

export const signalRegistry = new SignalRegistry();

export function createSignalResult(
  id: string,
  name: string,
  severity: 'info' | 'warning' | 'error',
  message: string,
  evidence: Record<string, unknown>
): SignalResult {
  const weight = SIGNAL_WEIGHTS[id as keyof typeof SIGNAL_WEIGHTS] ?? 0;
  return { id, name, severity, penalty: Math.abs(weight), message, evidence };
}

export function levenshtein(a: string, b: string): number {
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array.from({ length: b.length + 1 }, (_, j) => j)
  );
  for (let i = 0; i <= a.length; i++) {
    const row = matrix[i];
    if (row) row[0] = i;
  }

  for (let i = 1; i <= a.length; i++) {
    const row = matrix[i];
    const prevRow = matrix[i - 1];
    if (!row || !prevRow) continue;
    for (let j = 1; j <= b.length; j++) {
      const diag = prevRow[j - 1] ?? 0;
      if (a[i - 1] === b[j - 1]) {
        row[j] = diag;
      } else {
        row[j] = Math.min((prevRow[j] ?? 0) + 1, (row[j - 1] ?? 0) + 1, diag + 1);
      }
    }
  }
  return matrix[a.length]?.[b.length] ?? 0;
}