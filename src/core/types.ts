export type Grade = 'healthy' | 'warning' | 'at-risk' | 'critical';

export type Severity = 'info' | 'warning' | 'error';

export interface SignalEvidence {
  readonly [key: string]: unknown;
}

export interface SignalResult {
  readonly id: string;
  readonly name: string;
  readonly severity: Severity;
  readonly penalty: number;
  readonly message: string;
  readonly evidence: SignalEvidence;
}

export interface PackageMetadata {
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly homepage?: string;
  readonly repository?: { readonly type: string; readonly url: string };
  readonly maintainers: ReadonlyArray<{ readonly name: string; readonly email?: string }>;
  readonly license?: string;
  readonly deprecated?: string;
  readonly time: Readonly<Record<string, string>>;
  readonly distTags: Readonly<Record<string, string>>;
}

export interface PackageResult {
  readonly name: string;
  readonly version: string;
  readonly latestVersion: string;
  readonly score: number;
  readonly grade: Grade;
  readonly signals: ReadonlyArray<SignalResult>;
  readonly metadata: PackageMetadata;
}

export interface Summary {
  readonly total: number;
  readonly healthy: number;
  readonly warning: number;
  readonly atRisk: number;
  readonly critical: number;
  readonly bySignal: Readonly<Record<string, number>>;
}

export interface RunMetadata {
  readonly analyzedAt: string;
  readonly durationMs: number;
  readonly lockfile: string;
  readonly registry: string;
  readonly signalsRun: ReadonlyArray<string>;
  readonly packagesAnalyzed: number;
  readonly cacheHits: number;
  readonly cacheMisses: number;
}

export interface SalubriousResult {
  readonly score: number;
  readonly grade: Grade;
  readonly packages: ReadonlyArray<PackageResult>;
  readonly summary: Summary;
  readonly metadata: RunMetadata;
}

export interface SignalConfig {
  readonly abandoned?: { readonly thresholdMonths?: number };
  readonly 'bus-factor'?: { readonly minMaintainers?: number };
  readonly 'major-drift'?: { readonly maxMajorBehind?: number };
}

export interface SalubriousOptions {
  readonly cwd?: string;
  readonly lockfile?: string;
  readonly includeDev?: boolean;
  readonly ignore?: ReadonlyArray<string>;
  readonly only?: ReadonlyArray<string>;
  readonly signals?: Partial<SignalConfig>;
  readonly registry?: string;
  readonly githubToken?: string;
  readonly cacheDir?: string;
  readonly offline?: boolean;
  readonly concurrency?: number;
}

export interface SignalDefinition {
  readonly id: string;
  readonly name: string;
  readonly weight: number;
  readonly analyze: (
    pkg: PackageMetadata,
    options: SalubriousOptions,
    context: SignalContext
  ) => Promise<SignalResult | null>;
}

export interface SignalContext {
  readonly packageName: string;
  readonly registryBaseUrl: string;
  readonly githubToken?: string;
}

export interface RegistryPackageInfo {
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly homepage?: string;
  readonly repository?: { readonly type: string; readonly url: string };
  readonly maintainers: ReadonlyArray<{ readonly name: string; readonly email?: string }>;
  readonly license?: string;
  readonly deprecated?: string;
  readonly time: Readonly<Record<string, string>>;
  readonly 'dist-tags': Readonly<Record<string, string>>;
  readonly versions: Readonly<Record<string, { readonly version: string; readonly deprecated?: string }>>;
}

export interface GitHubRepoInfo {
  readonly archived: boolean;
  readonly license: { readonly spdx_id: string } | null;
  readonly owner: { readonly login: string };
  readonly name: string;
  readonly full_name: string;
  readonly html_url: string;
}

export interface LockfileDependency {
  readonly version: string;
  readonly resolved?: string;
  readonly integrity?: string;
  readonly dev: boolean;
}

export interface CacheEntry<T> {
  readonly data: T;
  readonly timestamp: number;
  readonly etag?: string;
}

export interface HttpResponse<T> {
  readonly data: T;
  readonly statusCode: number;
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
  readonly etag?: string;
}