import { signalRegistry, createSignalResult } from './signal-registry.js';
import { githubClient } from '../core/github.js';
import type { SignalDefinition, SalubriousOptions, PackageMetadata } from '../core/types.js';
import { SIGNAL_WEIGHTS } from '../constants.js';

signalRegistry.register({
  id: 'archived',
  name: 'Archived Repo',
  weight: SIGNAL_WEIGHTS.archived,
  analyze: async (pkg: PackageMetadata, options: SalubriousOptions): Promise<ReturnType<typeof createSignalResult> | null> => {
    const repoUrl = pkg.repository?.url ?? pkg.homepage;
    if (!repoUrl) return null;

    const parsed = githubClient.parseRepoUrl(repoUrl);
    if (!parsed) return null;

    const isArchived = await githubClient.isArchived(parsed.owner, parsed.repo);
    if (isArchived) {
      return createSignalResult(
        'archived',
        'Archived Repo',
        'error',
        `GitHub repository ${parsed.owner}/${parsed.repo} is archived`,
        { owner: parsed.owner, repo: parsed.repo, url: repoUrl }
      );
    }
    return null;
  },
});