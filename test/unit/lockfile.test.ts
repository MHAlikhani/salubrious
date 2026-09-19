import { describe, it, expect } from 'vitest';
import { parseLockfile } from '../../src/utils/lockfile.ts';

describe('lockfile parser', () => {
  describe('package-lock.json', () => {
    it('parses basic package-lock.json v2', () => {
      const content = JSON.stringify({
        name: 'test',
        version: '1.0.0',
        lockfileVersion: 2,
        packages: {
          '': { name: 'test', version: '1.0.0' },
          'node_modules/lodash': { version: '4.17.21', resolved: 'https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz', integrity: 'sha512-...' },
          'node_modules/react': { version: '18.2.0', dev: true },
        },
      });

      const result = parseLockfile('package-lock.json', content);
      expect(result.has('lodash')).toBe(true);
      expect(result.get('lodash')?.version).toBe('4.17.21');
      expect(result.get('lodash')?.dev).toBe(false);
      expect(result.has('react')).toBe(true);
      expect(result.get('react')?.dev).toBe(true);
    });
  });

  describe('yarn.lock', () => {
    it.skip('parses basic yarn.lock', () => {
      const content = `# yarn lockfile v1
"lodash@^4.17.21":
  version "4.17.21"
  resolved "https://registry.yarnpkg.com/lodash/-/lodash-4.17.21.tgz"
`;

      const result = parseLockfile('yarn.lock', content);
      expect(result.has('lodash')).toBe(true);
      expect(result.get('lodash')?.version).toBe('4.17.21');
    });
  });

  describe('pnpm-lock.yaml', () => {
    it.skip('parses basic pnpm-lock.yaml', () => {
      const content = `
dependencies:
  lodash: 4.17.21
devDependencies:
  typescript: 5.0.0
specifiers:
  lodash: ^4.17.21
  typescript: ^5.0.0
`;

      const result = parseLockfile('pnpm-lock.yaml', content);
      expect(result.has('lodash')).toBe(true);
      expect(result.get('lodash')?.version).toBe('4.17.21');
      expect(result.get('lodash')?.dev).toBe(false);
      expect(result.has('typescript')).toBe(true);
      expect(result.get('typescript')?.dev).toBe(true);
    });
  });
});