export interface ParsedVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly prerelease?: string;
  readonly build?: string;
}

export function parseVersion(version: string): ParsedVersion | null {
  const match = version.match(
    /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/
  );
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4],
    build: match[5],
  };
}

export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa || !pb) return 0;
  if (pa.major !== pb.major) return pa.major - pb.major;
  if (pa.minor !== pb.minor) return pa.minor - pb.minor;
  if (pa.patch !== pb.patch) return pa.patch - pb.patch;
  if (pa.prerelease && !pb.prerelease) return -1;
  if (!pa.prerelease && pb.prerelease) return 1;
  if (pa.prerelease && pb.prerelease) return pa.prerelease.localeCompare(pb.prerelease);
  return 0;
}

export function majorDiff(current: string, latest: string): number {
  const pc = parseVersion(current);
  const pl = parseVersion(latest);
  if (!pc || !pl) return 0;
  return pl.major - pc.major;
}

export function satisfies(range: string, version: string): boolean {
  const parsed = parseVersion(version);
  if (!parsed) return false;

  if (range.startsWith('^')) {
    const base = parseVersion(range.slice(1));
    if (!base) return false;
    return parsed.major === base.major && compareVersions(version, range.slice(1)) >= 0;
  }
  if (range.startsWith('~')) {
    const base = parseVersion(range.slice(1));
    if (!base) return false;
    return parsed.major === base.major && parsed.minor === base.minor && parsed.patch >= base.patch;
  }
  if (range.startsWith('>=')) {
    return compareVersions(version, range.slice(2)) >= 0;
  }
  if (range.startsWith('<=')) {
    return compareVersions(version, range.slice(2)) <= 0;
  }
  if (range.startsWith('>')) {
    return compareVersions(version, range.slice(1)) > 0;
  }
  if (range.startsWith('<')) {
    return compareVersions(version, range.slice(1)) < 0;
  }
  if (range.startsWith('=')) {
    return compareVersions(version, range.slice(1)) === 0;
  }
  return compareVersions(version, range) === 0;
}

export function getMajorVersion(version: string): number {
  const parsed = parseVersion(version);
  return parsed?.major ?? 0;
}