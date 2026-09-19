import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { CacheEntry } from '../core/types.js';

export class FileCache {
  private readonly cacheDir: string;
  private readonly memoryCache = new Map<string, CacheEntry<unknown>>();

  constructor(cacheDir?: string) {
    this.cacheDir = cacheDir ?? this.getDefaultCacheDir();
  }

  private getDefaultCacheDir(): string {
    const xdgCache = process.env.XDG_CACHE_HOME;
    if (xdgCache) return join(xdgCache, 'salubrious');
    return join(homedir(), '.cache', 'salubrious');
  }

  private getFilePath(key: string): string {
    const hash = createHash('sha256').update(key).digest('hex').slice(0, 32);
    return join(this.cacheDir, `${hash}.json`);
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.memoryCache.has(key)) {
      const entry = this.memoryCache.get(key) as CacheEntry<T>;
      return entry.data;
    }

    try {
      const filePath = this.getFilePath(key);
      const content = await readFile(filePath, 'utf-8');
      const entry = JSON.parse(content) as CacheEntry<T>;
      this.memoryCache.set(key, entry);
      return entry.data;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, data: T, etag?: string): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      etag,
    };
    this.memoryCache.set(key, entry);

    try {
      await mkdir(this.cacheDir, { recursive: true });
      const filePath = this.getFilePath(key);
      await writeFile(filePath, JSON.stringify(entry));
    } catch {
      // Cache write failures are non-fatal
    }
  }

  async has(key: string): Promise<boolean> {
    if (this.memoryCache.has(key)) return true;
    try {
      const filePath = this.getFilePath(key);
      await readFile(filePath);
      return true;
    } catch {
      return false;
    }
  }

  clear(): void {
    this.memoryCache.clear();
  }
}

export const globalCache = new FileCache();