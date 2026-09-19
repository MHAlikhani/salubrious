import { HttpClient } from '../utils/http.js';
import type { RegistryPackageInfo, PackageMetadata } from '../core/types.js';
import { DEFAULT_REGISTRY } from '../constants.js';

export class RegistryClient {
  private readonly client: HttpClient;
  private baseUrl: string;

  constructor(registry?: string, httpClient?: HttpClient) {
    this.baseUrl = (registry ?? DEFAULT_REGISTRY).replace(/\/+$/, '');
    this.client = httpClient ?? new HttpClient();
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
      const response = await this.client.get<RegistryPackageInfo>(url);
      if (response.statusCode === 404) return null;
      if (response.statusCode !== 200) {
        throw new Error(`Registry returned ${response.statusCode} for ${name}`);
      }
      return response.data;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) return null;
      throw error;
    }
  }

  async getPackageMetadata(name: string): Promise<PackageMetadata | null> {
    const info = await this.getPackageInfo(name);
    if (!info) return null;

    return {
      name,
      version: info.version,
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

  async getMaintainers(name: string): Promise<ReadonlyArray<{ readonly name: string; readonly email?: string }>> {
    const info = await this.getPackageInfo(name);
    return info?.maintainers ?? [];
  }

  async getTimeData(name: string): Promise<Readonly<Record<string, string>>> {
    const info = await this.getPackageInfo(name);
    return info?.time ?? {};
  }

  async getDistTags(name: string): Promise<Readonly<Record<string, string>>> {
    const info = await this.getPackageInfo(name);
    return info?.['dist-tags'] ?? {};
  }

  async getLatestVersion(name: string): Promise<string | null> {
    const info = await this.getPackageInfo(name);
    return info?.['dist-tags']?.latest ?? info?.version ?? null;
  }
}

export const registryClient = new RegistryClient();