export type Grade = 'healthy' | 'warning' | 'at-risk' | 'critical';

export interface SignalResult {
  id: string;
  name: string;
  severity: 'info' | 'warning' | 'error';
  penalty: number;
  message: string;
  evidence: Record<string, unknown>;
}

export interface PackageResult {
  name: string;
  version: string;
  latestVersion: string;
  score: number;
  grade: Grade;
  signals: SignalResult[];
  metadata: PackageMetadata;
}

export interface PackageMetadata {
  description?: string;
  homepage?: string;
  repository?: { type: string; url: string };
  maintainers: Array<{ name: string; email?: string }>;
  license?: string;
  deprecated?: string;
  time: Record<string, string>;
  distTags: Record<string, string>;
}

export interface Summary {
  total: number;
  healthy: number;
  warning: number;
  atRisk: number;
  critical: number;
  bySignal: Record<string, number>;
}

export interface RunMetadata {
  analyzedAt: string;
  durationMs: number;
  lockfile: string;
  registry: string;
  signalsRun: string[];
  packagesAnalyzed: number;
}

export interface VigorResult {
  score: number;
  grade: Grade;
  packages: PackageResult[];
  summary: Summary;
  metadata: RunMetadata;
}

export interface SalubriousOptions {
  cwd?: string;
  lockfile?: string;
  includeDev?: boolean;
  ignore?: string[];
  only?: string[];
  signals?: Partial<SignalConfig>;
  registry?: string;
  githubToken?: string;
  cacheDir?: string;
  offline?: boolean;
}

export interface SignalConfig {
  abandoned?: { thresholdMonths?: number };
  'bus-factor'?: { minMaintainers?: number };
  'major-drift'?: { maxMajorBehind?: number };
}

export interface SignalDefinition {
  id: string;
  name: string;
  weight: number;
  analyze: (pkg: PackageMetadata, options: SalubriousOptions) => Promise<SignalResult | null>;
}