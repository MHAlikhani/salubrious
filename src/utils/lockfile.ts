import { readFile } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LockfileDependency } from '../core/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface PackageJson {
  readonly name?: string;
  readonly version?: string;
  readonly description?: string;
  readonly main?: string;
  readonly types?: string;
  readonly exports?: Record<string, unknown>;
  readonly bin?: Record<string, string> | string;
  readonly scripts?: Record<string, string>;
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
  readonly peerDependencies?: Record<string, string>;
  readonly optionalDependencies?: Record<string, string>;
  readonly engines?: Record<string, string>;
  readonly license?: string;
  readonly author?: string | { readonly name: string; readonly email?: string; readonly url?: string };
  readonly repository?: { readonly type: string; readonly url: string } | string;
  readonly bugs?: { readonly url: string; readonly email?: string } | string;
  readonly homepage?: string;
  readonly keywords?: ReadonlyArray<string>;
  readonly files?: ReadonlyArray<string>;
  readonly publishConfig?: Record<string, unknown>;
  readonly workspaces?: ReadonlyArray<string>;
  readonly private?: boolean;
}

export async function readPackageJson(cwd: string): Promise<PackageJson | null> {
  try {
    const path = join(cwd, 'package.json');
    const content = await readFile(path, 'utf-8');
    return JSON.parse(content) as PackageJson;
  } catch {
    return null;
  }
}

export function getAllDependencies(pkg: PackageJson, includeDev = false): Record<string, string> {
  const deps: Record<string, string> = {};
  if (pkg.dependencies) Object.assign(deps, pkg.dependencies);
  if (includeDev && pkg.devDependencies) Object.assign(deps, pkg.devDependencies);
  if (pkg.optionalDependencies) Object.assign(deps, pkg.optionalDependencies);
  return deps;
}

export function parseLockfile(lockfilePath: string, content: string): Map<string, LockfileDependency> {
  const result = new Map<string, LockfileDependency>();

  if (lockfilePath.endsWith('package-lock.json') || lockfilePath.endsWith('npm-shrinkwrap.json')) {
    try {
      const data = JSON.parse(content);
      if (data.packages) {
        for (const [path, info] of Object.entries(data.packages)) {
          if (path === '') continue;
          const name = path.startsWith('node_modules/') ? path.slice('node_modules/'.length) : path;
          const pkgInfo = info as { readonly version: string; readonly resolved?: string; readonly integrity?: string; readonly dev?: boolean };
          result.set(name, {
            version: pkgInfo.version,
            resolved: pkgInfo.resolved,
            integrity: pkgInfo.integrity,
            dev: pkgInfo.dev ?? false,
          });
        }
      } else if (data.dependencies) {
        for (const [name, info] of Object.entries(data.dependencies)) {
          const pkgInfo = info as { readonly version: string; readonly resolved?: string; readonly integrity?: string; readonly dev?: boolean };
          result.set(name, {
            version: pkgInfo.version,
            resolved: pkgInfo.resolved,
            integrity: pkgInfo.integrity,
            dev: pkgInfo.dev ?? false,
          });
        }
      }
    } catch {
      // Ignore parse errors
    }
  } else if (lockfilePath.endsWith('pnpm-lock.yaml')) {
    try {
      const lines = content.split('\n');
      let currentName = '';
      let currentVersion = '';
      let inDependencies = false;
      let inDevDependencies = false;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === 'dependencies:') {
          inDependencies = true;
          inDevDependencies = false;
          continue;
        }
        if (trimmed === 'devDependencies:') {
          inDependencies = false;
          inDevDependencies = true;
          continue;
        }
        if (trimmed.startsWith('specifiers:')) {
          inDependencies = false;
          inDevDependencies = false;
          continue;
        }

        const depMatch = trimmed.match(/^([^:]+):\s*(.+)$/);
        if (depMatch && (inDependencies || inDevDependencies)) {
          currentName = depMatch[1].trim();
          currentVersion = depMatch[2].trim().replace(/^['"]|['"]$/g, '');
        }

        const versionMatch = trimmed.match(/^version:\s*(.+)$/);
        if (versionMatch && currentName) {
          const version = versionMatch[1].trim().replace(/^['"]|['"]$/g, '');
          result.set(currentName, {
            version,
            dev: inDevDependencies,
          });
          currentName = '';
        }
      }
    } catch {
      // Ignore
    }
  } else if (lockfilePath.endsWith('yarn.lock')) {
    try {
      const lines = content.split('\n');
      let currentName = '';
      let currentVersion = '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        if (!line.startsWith(' ') && !line.startsWith('\t')) {
          const nameMatch = trimmed.match(/^"([^"]+)"$/);
          if (nameMatch) {
            currentName = nameMatch[1];
            const atIndex = currentName.lastIndexOf('@');
            if (atIndex > 0) {
              currentVersion = currentName.slice(atIndex + 1);
              currentName = currentName.slice(0, atIndex);
            }
          }
        } else if (trimmed.startsWith('version')) {
          const versionMatch = trimmed.match(/^version\s+"([^"]+)"$/);
          if (versionMatch && currentName) {
            currentVersion = versionMatch[1];
            result.set(currentName, { version: currentVersion, dev: false });
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  return result;
}

export async function detectLockfile(cwd: string): Promise<string | null> {
  const candidates = [
    'pnpm-lock.yaml',
    'package-lock.json',
    'yarn.lock',
    'npm-shrinkwrap.json',
  ];

  for (const candidate of candidates) {
    try {
      const path = join(cwd, candidate);
      await readFile(path);
      return path;
    } catch {
      continue;
    }
  }
  return null;
}