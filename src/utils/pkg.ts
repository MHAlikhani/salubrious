import { readFile } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface PackageJson {
  name?: string;
  version?: string;
  description?: string;
  main?: string;
  types?: string;
  exports?: Record<string, unknown>;
  bin?: Record<string, string> | string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  engines?: Record<string, string>;
  license?: string;
  author?: string | { name: string; email?: string; url?: string };
  repository?: { type: string; url: string } | string;
  bugs?: { url: string; email?: string } | string;
  homepage?: string;
  keywords?: string[];
  files?: string[];
  publishConfig?: Record<string, unknown>;
  workspaces?: string[];
  private?: boolean;
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

export function parseLockfile(lockfilePath: string, content: string): Map<string, { version: string; resolved?: string; integrity?: string; dev?: boolean }> {
  const result = new Map<string, { version: string; resolved?: string; integrity?: string; dev?: boolean }>();
  
  if (lockfilePath.endsWith('package-lock.json') || lockfilePath.endsWith('npm-shrinkwrap.json')) {
    try {
      const data = JSON.parse(content);
      if (data.packages) {
        for (const [path, info] of Object.entries(data.packages)) {
          if (path === '') continue;
          const name = path.startsWith('node_modules/') ? path.slice('node_modules/'.length) : path;
          const pkgInfo = info as { version: string; resolved?: string; integrity?: string; dev?: boolean };
          result.set(name, {
            version: pkgInfo.version,
            resolved: pkgInfo.resolved,
            integrity: pkgInfo.integrity,
            dev: pkgInfo.dev ?? false,
          });
        }
      } else if (data.dependencies) {
        for (const [name, info] of Object.entries(data.dependencies)) {
          const pkgInfo = info as { version: string; resolved?: string; integrity?: string; dev?: boolean };
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
    // pnpm lockfile parsing - simplified
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
    // yarn v1 lockfile parsing - simplified
    try {
      const lines = content.split('\n');
      let currentName = '';
      let currentVersion = '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        if (!line.startsWith(' ') && !line.startsWith('\t')) {
          // Package name line
          const nameMatch = trimmed.match(/^"([^"]+)"$/);
          if (nameMatch) {
            currentName = nameMatch[1];
            // Extract version from "name@version" format
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

export function detectLockfile(cwd: string): string | null {
  const candidates = [
    'pnpm-lock.yaml',
    'package-lock.json',
    'yarn.lock',
    'npm-shrinkwrap.json',
  ];
  
  for (const candidate of candidates) {
    try {
      const path = join(cwd, candidate);
      // Just check if file exists by trying to read it
      // We'll do this synchronously in the analyzer
    } catch {
      continue;
    }
  }
  return null;
}