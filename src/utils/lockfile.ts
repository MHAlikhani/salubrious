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

type NpmLockEntry = {
  readonly version?: string;
  readonly resolved?: string;
  readonly integrity?: string;
  readonly dev?: boolean;
  readonly dependencies?: Record<string, NpmLockEntry>;
};

interface NpmLockFile {
  readonly packages?: Record<string, NpmLockEntry>;
  readonly dependencies?: Record<string, NpmLockEntry>;
}

interface MutableLockfileDependency {
  version: string;
  resolved?: string;
  integrity?: string;
  dev: boolean;
}

interface PnpmDirectDependency {
  readonly name: string;
  dev: boolean;
  version?: string;
}

const PNPM_DEPENDENCY_SECTIONS = new Set(['dependencies', 'devDependencies', 'optionalDependencies']);

const NODE_MODULES_MARKER = 'node_modules/';

function stripQuotes(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, '');
}

/** Drops pnpm peer-resolution suffixes: `1.2.3(vitest@5.0.1)` becomes `1.2.3`. */
function normalizePnpmVersion(value: string): string {
  const cleaned = stripQuotes(value);
  const peerIndex = cleaned.indexOf('(');
  return peerIndex === -1 ? cleaned : cleaned.slice(0, peerIndex);
}

/** `node_modules/a/node_modules/b` resolves to `b`: the deepest installed copy wins. */
function npmPackageName(path: string): string {
  const index = path.lastIndexOf(NODE_MODULES_MARKER);
  return index === -1 ? path : path.slice(index + NODE_MODULES_MARKER.length);
}

function parseNpmLockfile(content: string): Map<string, LockfileDependency> {
  const result = new Map<string, LockfileDependency>();

  let data: NpmLockFile;
  try {
    data = JSON.parse(content) as NpmLockFile;
  } catch {
    return result;
  }
  if (!data || typeof data !== 'object') return result;

  if (data.packages && typeof data.packages === 'object') {
    for (const [path, info] of Object.entries(data.packages)) {
      if (path === '') continue;
      const name = npmPackageName(path);
      if (!name || result.has(name)) continue;
      result.set(name, {
        version: info?.version ?? 'unknown',
        resolved: info?.resolved,
        integrity: info?.integrity,
        dev: info?.dev ?? false,
      });
    }
    return result;
  }

  if (data.dependencies && typeof data.dependencies === 'object') {
    collectNpmV1Dependencies(data.dependencies, result);
  }
  return result;
}

function collectNpmV1Dependencies(
  dependencies: Record<string, NpmLockEntry>,
  result: Map<string, LockfileDependency>
): void {
  for (const [name, info] of Object.entries(dependencies)) {
    if (!result.has(name)) {
      result.set(name, {
        version: info?.version ?? 'unknown',
        resolved: info?.resolved,
        integrity: info?.integrity,
        dev: info?.dev ?? false,
      });
    }
    if (info?.dependencies) collectNpmV1Dependencies(info.dependencies, result);
  }
}

/**
 * Reads direct dependencies from the root importer. pnpm writes one `importers`
 * section per workspace member; only `.` (the project itself) is authoritative.
 */
function collectPnpmDirectDependencies(content: string): Map<string, PnpmDirectDependency> {
  const direct = new Map<string, PnpmDirectDependency>();

  let section = '';
  let importerIndent = -1;
  let inRootImporter = false;
  let inDependencyBlock = false;
  let blockIsDev = false;
  let entryIndent = -1;
  let pending: PnpmDirectDependency | null = null;

  const flush = (): void => {
    if (pending) {
      direct.set(pending.name, pending);
      pending = null;
    }
  };

  for (const line of content.split(/\r?\n/)) {
    const text = line.trim();
    if (!text || text === '---' || text.startsWith('#')) continue;
    const indent = line.length - line.trimStart().length;
    const key = text.endsWith(':') ? stripQuotes(text.slice(0, -1)) : null;

    if (indent === 0) {
      flush();
      section = key ?? '';
      importerIndent = -1;
      inRootImporter = false;
      inDependencyBlock = false;
      entryIndent = -1;
      if (key && PNPM_DEPENDENCY_SECTIONS.has(key)) {
        // lockfileVersion 5.x/6.x keeps dependency sections at the top level
        inDependencyBlock = true;
        blockIsDev = key === 'devDependencies';
      }
      continue;
    }

    if (section === 'importers') {
      if (importerIndent === -1 && key !== null && !PNPM_DEPENDENCY_SECTIONS.has(key)) {
        importerIndent = indent;
      }
      if (key !== null && indent === importerIndent) {
        flush();
        inRootImporter = key === '.';
        inDependencyBlock = false;
        entryIndent = -1;
        continue;
      }
      if (key !== null && PNPM_DEPENDENCY_SECTIONS.has(key) && inRootImporter) {
        flush();
        inDependencyBlock = true;
        blockIsDev = key === 'devDependencies';
        entryIndent = -1;
        continue;
      }
      if (!inDependencyBlock) continue;
    } else if (!inDependencyBlock) {
      continue;
    }

    if (key !== null && PNPM_DEPENDENCY_SECTIONS.has(key)) {
      flush();
      blockIsDev = key === 'devDependencies';
      entryIndent = -1;
      continue;
    }

    const entry = text.match(/^([^:]+):\s*(.*)$/);
    if (!entry) continue;
    const name = stripQuotes(entry[1] ?? '');
    const value = entry[2]?.trim() ?? '';
    if (!name) continue;

    if (entryIndent === -1) entryIndent = indent;

    if (indent === entryIndent) {
      flush();
      if (value) {
        direct.set(name, { name, dev: blockIsDev, version: normalizePnpmVersion(value) });
      } else {
        pending = { name, dev: blockIsDev };
      }
      continue;
    }

    if (pending && indent > entryIndent && text.startsWith('version:')) {
      pending.version = normalizePnpmVersion(text.slice('version:'.length));
    }
  }

  flush();
  return direct;
}

/** `name@1.2.3` / `@scope/name@1.2.3` (v7+) and `/name/1.2.3` / `/@scope/name/1.2.3` (v5/6). */
function parsePnpmPackageKey(text: string): { name: string; version: string } | null {
  const withoutColon = text.endsWith(':') ? text.slice(0, -1) : text;
  const key = stripQuotes(withoutColon.startsWith('/') ? withoutColon.slice(1) : withoutColon);
  if (!key) return null;

  const atIndex = key.lastIndexOf('@');
  const slashIndex = key.lastIndexOf('/');

  if (atIndex > slashIndex) {
    return { name: key.slice(0, atIndex), version: normalizePnpmVersion(key.slice(atIndex + 1)) };
  }
  if (slashIndex > 0) {
    return {
      name: key.slice(0, slashIndex),
      version: normalizePnpmVersion(key.slice(slashIndex + 1)),
    };
  }
  return null;
}

/** Integrity/tarball metadata per `name@version`, used to enrich the direct dependencies. */
function collectPnpmPackageMetadata(
  content: string
): Map<string, { resolved?: string; integrity?: string }> {
  const packages = new Map<string, { resolved?: string; integrity?: string }>();

  let section = '';
  let entryIndent = -1;
  let currentKey: string | null = null;
  let inResolutionBlock = false;

  for (const line of content.split(/\r?\n/)) {
    const text = line.trim();
    if (!text || text === '---' || text.startsWith('#')) continue;
    const indent = line.length - line.trimStart().length;

    if (indent === 0) {
      section = text.endsWith(':') ? text.slice(0, -1) : '';
      entryIndent = -1;
      currentKey = null;
      inResolutionBlock = false;
      continue;
    }

    if (section !== 'packages') continue;

    if (entryIndent === -1 || indent === entryIndent) {
      entryIndent = indent;
      inResolutionBlock = false;
      const parsed = parsePnpmPackageKey(text);
      currentKey = parsed ? `${parsed.name}@${parsed.version}` : null;
      if (currentKey && !packages.has(currentKey)) packages.set(currentKey, {});
      continue;
    }

    if (!currentKey) continue;
    const target = packages.get(currentKey);
    if (!target) continue;

    if (text === 'resolution:') {
      inResolutionBlock = true;
      continue;
    }

    if (text.startsWith('resolution:')) {
      const integrity = text.match(/integrity:\s*([^,}]+)/);
      const tarball = text.match(/tarball:\s*([^,}]+)/);
      const integrityValue = integrity?.[1];
      const tarballValue = tarball?.[1];
      if (integrityValue) target.integrity = stripQuotes(integrityValue);
      if (tarballValue) target.resolved = stripQuotes(tarballValue);
      continue;
    }

    if (!inResolutionBlock) continue;

    const integrity = text.match(/^integrity:\s*(.+)$/);
    const tarball = text.match(/^tarball:\s*(.+)$/);
    const integrityValue = integrity?.[1];
    const tarballValue = tarball?.[1];
    if (integrityValue) {
      target.integrity = stripQuotes(integrityValue);
    } else if (tarballValue) {
      target.resolved = stripQuotes(tarballValue);
    } else {
      inResolutionBlock = false;
    }
  }

  return packages;
}

function parsePnpmLockfile(content: string): Map<string, LockfileDependency> {
  const direct = collectPnpmDirectDependencies(content);
  const metadata = collectPnpmPackageMetadata(content);
  const result = new Map<string, LockfileDependency>();

  for (const [name, dependency] of direct) {
    const version = dependency.version ?? 'unknown';
    const info = metadata.get(`${name}@${version}`);
    result.set(name, {
      version,
      resolved: info?.resolved,
      integrity: info?.integrity,
      dev: dependency.dev,
    });
  }

  return result;
}

/** Derives package names from a yarn entry header such as `"a@^1, a@~1.2":`. */
function yarnEntryNames(text: string): string[] {
  if (!text.endsWith(':')) return [];
  const header = text.slice(0, -1);
  const names: string[] = [];

  for (const pattern of header.split(',')) {
    const cleaned = stripQuotes(pattern.trim());
    const atIndex = cleaned.lastIndexOf('@');
    if (atIndex <= 0) continue;
    const name = cleaned.slice(0, atIndex);
    if (name && !names.includes(name)) names.push(name);
  }

  return names;
}

/** Handles classic yarn.lock v1 (`version "1.2.3"`) and Berry (`version: 1.2.3`). */
function parseYarnLockfile(content: string): Map<string, LockfileDependency> {
  const result = new Map<string, LockfileDependency>();

  let names: string[] = [];
  let current: MutableLockfileDependency | null = null;

  for (const line of content.split(/\r?\n/)) {
    const text = line.trim();
    if (!text || text.startsWith('#')) continue;

    if (!/^[ \t]/.test(line)) {
      names = yarnEntryNames(text);
      current = null;
      continue;
    }

    if (names.length === 0) continue;

    const version = text.match(/^version:?\s+(.+)$/);
    const versionValue = version?.[1];
    if (versionValue) {
      current = { version: stripQuotes(versionValue), dev: false };
      for (const name of names) {
        if (!result.has(name)) result.set(name, current);
      }
      continue;
    }

    const resolved = text.match(/^resolution:?\s+(.+)$/) ?? text.match(/^resolved:?\s+(.+)$/);
    const resolvedValue = resolved?.[1];
    if (resolvedValue && current) {
      current.resolved = stripQuotes(resolvedValue);
      continue;
    }

    const integrity = text.match(/^integrity\s+(.+)$/);
    const integrityValue = integrity?.[1];
    if (integrityValue && current) {
      current.integrity = stripQuotes(integrityValue);
    }
  }

  return result;
}

export function parseLockfile(lockfilePath: string, content: string): Map<string, LockfileDependency> {
  if (lockfilePath.endsWith('package-lock.json') || lockfilePath.endsWith('npm-shrinkwrap.json')) {
    return parseNpmLockfile(content);
  }
  if (lockfilePath.endsWith('pnpm-lock.yaml')) {
    return parsePnpmLockfile(content);
  }
  if (lockfilePath.endsWith('yarn.lock')) {
    return parseYarnLockfile(content);
  }
  return new Map();
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