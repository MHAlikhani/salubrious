import { HttpClient } from '../utils/http.js';
import type { GitHubRepoInfo } from '../core/types.js';

export class GitHubClient {
  private readonly client: HttpClient;
  private token?: string;

  constructor(token?: string, httpClient?: HttpClient) {
    this.token = token;
    this.client = httpClient ?? new HttpClient();
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
      const response = await this.client.get<GitHubRepoInfo>(url, this.getHeaders());
      if (response.statusCode === 404) return null;
      if (response.statusCode !== 200) {
        throw new Error(`GitHub API returned ${response.statusCode} for ${owner}/${repo}`);
      }
      return response.data;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) return null;
      throw error;
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
    const patterns = [
      /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/,
      /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/,
      /^github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        const owner = match[1];
        const repo = match[2];
        if (owner && repo) {
          return { owner, repo };
        }
      }
    }
    return null;
  }
}

export const githubClient = new GitHubClient();