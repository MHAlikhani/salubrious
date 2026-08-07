import { httpGet, HttpClientOptions } from '../utils/http.js';

export interface GitHubRepoInfo {
  archived: boolean;
  license: { spdx_id: string } | null;
  owner: { login: string };
  name: string;
  full_name: string;
  html_url: string;
}

export class GitHubClient {
  private token?: string;
  private options: HttpClientOptions;

  constructor(token?: string, options: HttpClientOptions = {}) {
    this.token = token;
    this.options = options;
  }

  setToken(token: string): void {
    this.token = token;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'salubrious/0.0.0',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async getRepoInfo(owner: string, repo: string): Promise<GitHubRepoInfo | null> {
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    
    try {
      const response = await httpGet<GitHubRepoInfo>(url, {
        ...this.options,
        headers: this.getHeaders(),
      });
      if (response.statusCode === 404) return null;
      if (response.statusCode !== 200) {
        throw new Error(`GitHub API returned ${response.statusCode} for ${owner}/${repo}`);
      }
      return response.data;
    } catch (err) {
      if (err instanceof Error && err.message.includes('404')) return null;
      throw err;
    }
  }

  async isArchived(owner: string, repo: string): Promise<boolean> {
    const info = await this.getRepoInfo(owner, repo);
    return info?.archived ?? false;
  }

  async getLicense(owner: string, repo: string): Promise<string | null> {
    const info = await this.getRepoInfo(owner, repo);
    return info?.license?.spdx_id ?? null;
  }

  static parseRepoUrl(url: string): { owner: string; repo: string } | null {
    // Handle various GitHub URL formats
    const patterns = [
      /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/,
      /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/,
      /^github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return { owner: match[1], repo: match[2] };
      }
    }
    return null;
  }
}

export const githubClient = new GitHubClient();