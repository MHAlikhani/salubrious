import { createHash } from 'node:crypto';
import { request, RequestOptions } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { URL } from 'node:url';
import { FileCache, globalCache } from './cache.js';

export interface HttpResponse<T> {
  data: T;
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  etag?: string;
}

export interface HttpClientOptions {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  cache?: FileCache;
  offline?: boolean;
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function parseJson<T>(text: string): T {
  return JSON.parse(text) as T;
}

async function makeRequest<T>(
  url: string,
  options: RequestOptions & { headers?: Record<string, string> },
  clientOptions: HttpClientOptions
): Promise<HttpResponse<T>> {
  const { timeout = 10000, maxRetries = 3, retryDelay = 1000, cache, offline } = clientOptions;
  const cacheKey = `${url}:${JSON.stringify(options.headers ?? {})}`;
  const cacheInstance = cache ?? globalCache;

  if (!offline) {
    const cached = await cacheInstance.get<HttpResponse<T>>(cacheKey);
    if (cached && cached.etag) {
      const conditionalOptions = { ...options, headers: { ...options.headers, 'If-None-Match': cached.etag } };
      try {
        const response = await makeRequestOnce<T>(url, conditionalOptions, timeout);
        if (response.statusCode === 304) {
          return cached;
        }
        return response;
      } catch {
        return cached;
      }
    }
    if (cached) return cached;
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await makeRequestOnce<T>(url, options, timeout);
      if (response.statusCode === 304 && attempt > 0) continue;
      if (isRetryableStatus(response.statusCode) && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, retryDelay * (attempt + 1)));
        continue;
      }
      if (!offline && response.headers.etag) {
        await cacheInstance.set(cacheKey, response, response.headers.etag as string);
      }
      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, retryDelay * (attempt + 1)));
      }
    }
  }
  throw lastError ?? new Error('Request failed after retries');
}

function makeRequestOnce<T>(
  url: string,
  options: RequestOptions & { headers?: Record<string, string> },
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
        'User-Agent': 'salubrious/0.0.0',
        'Accept': 'application/json',
        ...options.headers,
      },
      timeout,
    };

    const client = isHttps ? httpsRequest : request;
    const req = client(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
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

export async function httpGet<T>(
  url: string,
  options: HttpClientOptions = {}
): Promise<HttpResponse<T>> {
  return makeRequest<T>(url, { method: 'GET' }, options);
}

export async function httpHead(
  url: string,
  options: HttpClientOptions = {}
): Promise<HttpResponse<null>> {
  return makeRequest<null>(url, { method: 'HEAD' }, options);
}