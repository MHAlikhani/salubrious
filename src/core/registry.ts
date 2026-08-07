import { httpGet, HttpClientOptions } from '../utils/http.js';
import type { PackageMetadata } from '../core/types.js';
import { DEFAULT_REGISTRY } from '../constants.js';

export interface RegistryPackageInfo {
  name: string;
  version: string;
  description?: string;
  homepage?: string;
  repository?: { type: string; url: string };
  maintainers: Array<{ name: string; email?: string }>;
  license?: string;
  deprecated?: string;
  time: Record<string, string>;
  'dist-tags': Record<string, string>;
  versions: Record<string, { version: string; deprecated?: string }>;
}

export class RegistryClient {
  private baseUrl: string;
  private options: HttpClientOptions;

  constructor(registry?: string, options: HttpClientOptions = {}) {
    this.baseUrl = (registry ?? DEFAULT_REGISTRY).replace(/\/+$/, '');
    this.options = options;
  }

  setRegistry(registry: string): void {
    this.baseUrl = registry.replace(/\/+$/, '');
  }

  getRegistry(): string {
    return this.baseUrl;
  }

  async getPackageInfo(name: string): Promise<RegistryPackageInfo | null> {
    const encodedName = encodeURIComponent(name);
    const url = `${this.baseUrl}/${encodedName}`;
    
    try {
      const response = await httpGet<RegistryPackageInfo>(url, this.options);
      if (response.statusCode === 404) return null;
      if (response.statusCode !== 200) {
        throw new Error(`Registry returned ${response.statusCode} for ${name}`);
      }
      return response.data;
    } catch (err) {
      if (err instanceof Error && err.message.includes('404')) return null;
      throw err;
    }
  }

  async getPackageMetadata(name: string): Promise<PackageMetadata | null> {
    const info = await this.getPackageInfo(name);
    if (!info) return null;

    const latestVersion = info['dist-tags']?.latest ?? info.version;
    
    return {
      description: info.description,
      homepage: info.homepage,
      repository: info.repository,
      maintainers: info.maintainers ?? [],
      license: info.license,
      deprecated: info.deprecated,
      time: info.time ?? {},
      distTags: info['dist-tags'] ?? {},
    };
  }

  async getMaintainers(name: string): Promise<Array<{ name: string; email?: string }>> {
    const info = await this.getPackageInfo(name);
    return info?.maintainers ?? [];
  }

  async getTimeData(name: string): Promise<Record<string, string>> {
    const info = await this.getPackageInfo(name);
    return info?.time ?? {};
  }

  async getDistTags(name: string): Promise<Record<string, string>> {
    const info = await this.getPackageInfo(name);
    return info?.['dist-tags'] ?? {};
  }

  async getLatestVersion(name: string): Promise<string | null> {
    const info = await this.getPackageInfo(name);
    return info?.['dist-tags']?.latest ?? info?.version ?? null;
  }
}

export const registryClient = new RegistryClient();