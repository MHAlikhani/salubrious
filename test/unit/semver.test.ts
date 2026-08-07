import { describe, it, expect } from 'vitest';
import { parseVersion, compareVersions, majorDiff, satisfies, getMajorVersion } from '../../src/utils/semver.js';

describe('semver utilities', () => {
  describe('parseVersion', () => {
    it('parses basic semver', () => {
      expect(parseVersion('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 });
    });

    it('parses prerelease', () => {
      expect(parseVersion('1.2.3-alpha.1')).toEqual({ major: 1, minor: 2, patch: 3, prerelease: 'alpha.1' });
    });

    it('parses build metadata', () => {
      expect(parseVersion('1.2.3+build.1')).toEqual({ major: 1, minor: 2, patch: 3, build: 'build.1' });
    });

    it('returns null for invalid', () => {
      expect(parseVersion('not-a-version')).toBeNull();
    });
  });

  describe('compareVersions', () => {
    it('compares major', () => {
      expect(compareVersions('2.0.0', '1.9.9')).toBeGreaterThan(0);
    });

    it('compares minor', () => {
      expect(compareVersions('1.2.0', '1.1.9')).toBeGreaterThan(0);
    });

    it('compares patch', () => {
      expect(compareVersions('1.2.3', '1.2.2')).toBeGreaterThan(0);
    });

    it('handles prerelease', () => {
      expect(compareVersions('1.0.0', '1.0.0-alpha')).toBeGreaterThan(0);
    });
  });

  describe('majorDiff', () => {
    it('calculates major difference', () => {
      expect(majorDiff('1.0.0', '3.0.0')).toBe(2);
    });

    it('returns 0 for same major', () => {
      expect(majorDiff('1.2.3', '1.5.0')).toBe(0);
    });
  });

  describe('satisfies', () => {
    it('handles caret ranges', () => {
      expect(satisfies('^1.2.3', '1.5.0')).toBe(true);
      expect(satisfies('^1.2.3', '2.0.0')).toBe(false);
    });

    it('handles tilde ranges', () => {
      expect(satisfies('~1.2.3', '1.2.5')).toBe(true);
      expect(satisfies('~1.2.3', '1.3.0')).toBe(false);
    });
  });

  describe('getMajorVersion', () => {
    it('extracts major version', () => {
      expect(getMajorVersion('5.10.3')).toBe(5);
    });
  });
});