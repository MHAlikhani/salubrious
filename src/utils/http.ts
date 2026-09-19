import { createHash } from 'node:crypto';
import { request, RequestOptions } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { URL } from 'node:url';
import { HTTP_TIMEOUT, HTTP_MAX_RETRIES, HTTP_RETRY_DELAY, getVersion } from '../constants.js';
import type { HttpResponse } from '../core/types.js';

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function parseJson<T>(text: string): T {
  return JSON.parse(text) as T;
}

function pickEtag(
  headers: Readonly<Record<string, string | string[] | undefined>>
): string | undefined {
  const etag = headers.etag;
  return Array.isArray(etag) ? etag[0] : etag;
}

function createCacheKey(url: string, headers: Record<string, string> = {}): string {
  const content = `${url}:${JSON.stringify(headers)}`;
  return createHash('sha256').update(content).digest('hex').slice(0, 32);
}

type HttpRequestOptions = RequestOptions & {
  headers?: Record<string, string>;
  body?: string;
};

async function makeRequestOnce<T>(
  url: string,
  options: HttpRequestOptions,
  timeout: number
): Promise<HttpResponse<T>> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === 'https:';
    const reqOptions: RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: options.method ?? 'GET',
      headers: {
        'User-Agent': `salubrious/${getVersion()}`,
        'Accept': 'application/json',
        ...options.headers,
      },
      timeout,
    };

    const client = isHttps ? httpsRequest : request;
    const req = client(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsedData = data ? parseJson<T>(data) : undefined as T;
          resolve({
            data: parsedData,
            statusCode: res.statusCode ?? 0,
            headers: res.headers,
            etag: res.headers.etag,
          });
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${e}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

export class HttpClient {
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly cache = new Map<string, HttpResponse<unknown>>();
  private readonly cacheDir?: string;

  constructor(options: {
    timeout?: number;
    maxRetries?: number;
    retryDelay?: number;
    cacheDir?: string;
    offline?: boolean;
  } = {}) {
    this.timeout = options.timeout ?? HTTP_TIMEOUT;
    this.maxRetries = options.maxRetries ?? HTTP_MAX_RETRIES;
    this.retryDelay = options.retryDelay ?? HTTP_RETRY_DELAY;
    this.cacheDir = options.cacheDir;
  }

  async get<T>(url: string, headers: Record<string, string> = {}): Promise<HttpResponse<T>> {
    const cacheKey = createCacheKey(url, headers);
    const cached = this.cache.get(cacheKey);

    if (cached) {
      const conditionalHeaders = { ...headers };
      if (cached.etag) {
        conditionalHeaders['If-None-Match'] = cached.etag;
      }

      try {
        const response = await this.requestOnce<T>(
          url,
          { method: 'GET', headers: conditionalHeaders },
          this.timeout
        );
        if (response.statusCode === 304) {
          return { ...cached, data: cached.data as T };
        }
        const etag = pickEtag(response.headers);
        if (etag) {
          this.cache.set(cacheKey, { ...response, etag });
        }
        return response;
      } catch {
        return { ...cached, data: cached.data as T };
      }
    }

    return this.requestWithRetry<T>(url, { method: 'GET', headers });
  }

  async head(url: string, headers: Record<string, string> = {}): Promise<HttpResponse<null>> {
    return this.requestWithRetry<null>(url, { method: 'HEAD', headers });
  }

  private async requestWithRetry<T>(url: string, options: HttpRequestOptions): Promise<HttpResponse<T>> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.requestOnce<T>(url, options, this.timeout);

        if (isRetryableStatus(response.statusCode) && attempt < this.maxRetries) {
          await this.sleep(this.retryDelay * (attempt + 1));
          continue;
        }

        const etag = pickEtag(response.headers);
        if (etag) {
          const cacheKey = createCacheKey(url, options.headers ?? {});
          this.cache.set(cacheKey, { ...response, etag });
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < this.maxRetries) {
          await this.sleep(this.retryDelay * (attempt + 1));
        }
      }
    }

    throw lastError ?? new Error('Request failed after retries');
  }

  private async requestOnce<T>(
    url: string,
    options: HttpRequestOptions,
    timeout: number
  ): Promise<HttpResponse<T>> {
    return makeRequestOnce<T>(url, options, timeout);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number } {
    return { size: this.cache.size };
  }
}

export const httpClient = new HttpClient();