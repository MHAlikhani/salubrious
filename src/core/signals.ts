import type { SignalDefinition, SignalConfig, SalubriousOptions, SignalResult, PackageMetadata } from './types';
import { SIGNAL_WEIGHTS } from '../constants';

export class SignalRegistry {
  private signals = new Map<string, SignalDefinition>();

  register(signal: SignalDefinition): void {
    this.signals.set(signal.id, signal);
  }

  get(id: string): SignalDefinition | undefined {
    return this.signals.get(id);
  }

  getAll(): SignalDefinition[] {
    return Array.from(this.signals.values());
  }

  getEnabled(options: SalubriousOptions): SignalDefinition[] {
    const only = options.only ?? [];
    return this.getAll().filter(s => only.length === 0 || only.includes(s.id));
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