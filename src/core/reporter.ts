import type { SalubriousResult, PackageResult, Grade } from './types.js';

const GRADE_COLORS: Record<Grade, string> = {
  healthy: '\x1b[32m',
  warning: '\x1b[33m',
  'at-risk': '\x1b[33m',
  critical: '\x1b[31m',
};
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

function gradeIcon(grade: Grade): string {
  switch (grade) {
    case 'healthy':
      return '🟢';
    case 'warning':
      return '🟡';
    case 'at-risk':
      return '🟠';
    case 'critical':
      return '🔴';
  }
}

function formatHuman(result: SalubriousResult): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`${BOLD}salubrious${RESET} - Dependency Health Analysis`);
  lines.push('');

  const gradeColor = GRADE_COLORS[result.grade];
  lines.push(`  Overall Score: ${gradeColor}${BOLD}${result.score}/100${RESET} (${gradeColor}${result.grade.toUpperCase()}${RESET}) ${gradeIcon(result.grade)}`);
  lines.push('');

  const { summary } = result;
  lines.push(`  ${BOLD}Summary:${RESET}`);
  lines.push(`    Total packages: ${summary.total}`);
  lines.push(`    ${GRADE_COLORS.healthy}🟢 Healthy: ${summary.healthy}${RESET}`);
  lines.push(`    ${GRADE_COLORS.warning}🟡 Warning: ${summary.warning}${RESET}`);
  lines.push(`    ${GRADE_COLORS['at-risk']}🟠 At Risk: ${summary.atRisk}${RESET}`);
  lines.push(`    ${GRADE_COLORS.critical}🔴 Critical: ${summary.critical}${RESET}`);
  lines.push('');

  if (Object.keys(summary.bySignal).length > 0) {
    lines.push(`  ${BOLD}Signals triggered:${RESET}`);
    for (const [signal, count] of Object.entries(summary.bySignal).sort((a, b) => b[1] - a[1])) {
      lines.push(`    ${signal}: ${count}`);
    }
    lines.push('');
  }

  const problemPackages = result.packages.filter((p) => p.grade !== 'healthy');
  if (problemPackages.length > 0) {
    lines.push(`  ${BOLD}Issues found:${RESET}`);
    lines.push('');

    for (const pkg of problemPackages) {
      const pkgGradeColor = GRADE_COLORS[pkg.grade];
      lines.push(`  ${pkgGradeColor}${gradeIcon(pkg.grade)} ${BOLD}${pkg.name}${RESET}@${pkg.version} (${pkgGradeColor}${pkg.score}${RESET})`);

      for (const signal of pkg.signals) {
        const severityIcon = signal.severity === 'error' ? '✗' : signal.severity === 'warning' ? '⚠' : 'ℹ';
        lines.push(`    ${DIM}${severityIcon} ${signal.name}${RESET}: ${signal.message}`);
        if (Object.keys(signal.evidence).length > 0) {
          for (const [key, value] of Object.entries(signal.evidence)) {
            lines.push(`      ${DIM}${key}: ${value}${RESET}`);
          }
        }
      }
      lines.push('');
    }
  } else {
    lines.push(`  ${GRADE_COLORS.healthy}All packages are healthy!${RESET}`);
    lines.push('');
  }

  lines.push(`  ${DIM}Analyzed ${result.metadata.packagesAnalyzed} packages in ${result.metadata.durationMs}ms${RESET}`);
  lines.push(`  ${DIM}Lockfile: ${result.metadata.lockfile}${RESET}`);
  lines.push(`  ${DIM}Registry: ${result.metadata.registry}${RESET}`);
  lines.push('');

  return lines.join('\n');
}

function formatJson(result: SalubriousResult): string {
  return JSON.stringify(result, null, 2);
}

function formatMarkdown(result: SalubriousResult): string {
  const lines: string[] = [];

  lines.push('# salubrious - Dependency Health Report');
  lines.push('');
  lines.push(`**Overall Score:** ${result.score}/100 (${result.grade.toUpperCase()}) ${gradeIcon(result.grade)}`);
  lines.push('');

  lines.push('## Summary');
  lines.push('');
  lines.push('| Grade | Count |');
  lines.push('|-------|-------|');
  lines.push(`| 🟢 Healthy | ${result.summary.healthy} |`);
  lines.push(`| 🟡 Warning | ${result.summary.warning} |`);
  lines.push(`| 🟠 At Risk | ${result.summary.atRisk} |`);
  lines.push(`| 🔴 Critical | ${result.summary.critical} |`);
  lines.push(`| **Total** | **${result.summary.total}** |`);
  lines.push('');

  if (Object.keys(result.summary.bySignal).length > 0) {
    lines.push('## Signals Triggered');
    lines.push('');
    lines.push('| Signal | Count |');
    lines.push('|--------|-------|');
    for (const [signal, count] of Object.entries(result.summary.bySignal).sort((a, b) => b[1] - a[1])) {
      lines.push(`| ${signal} | ${count} |`);
    }
    lines.push('');
  }

  const problemPackages = result.packages.filter((p) => p.grade !== 'healthy');
  if (problemPackages.length > 0) {
    lines.push('## Issues');
    lines.push('');

    for (const pkg of problemPackages) {
      lines.push(`### ${pkg.name}@${pkg.version} (Score: ${pkg.score}, Grade: ${pkg.grade})`);
      lines.push('');

      for (const signal of pkg.signals) {
        lines.push(`- **${signal.name}** (${signal.severity}): ${signal.message}`);
        if (Object.keys(signal.evidence).length > 0) {
          for (const [key, value] of Object.entries(signal.evidence)) {
            lines.push(`  - ${key}: ${value}`);
          }
        }
      }
      lines.push('');
    }
  } else {
    lines.push('## ✅ All packages are healthy!');
    lines.push('');
  }

  lines.push('---');
  lines.push(`*Analyzed ${result.metadata.packagesAnalyzed} packages in ${result.metadata.durationMs}ms*`);
  lines.push(`*Lockfile: ${result.metadata.lockfile}*`);
  lines.push(`*Registry: ${result.metadata.registry}*`);
  lines.push(`*Generated at: ${result.metadata.analyzedAt}*`);

  return lines.join('\n');
}

function formatSarif(result: SalubriousResult): string {
  const sarif = {
    version: '2.1.0',
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    runs: [
      {
        tool: {
          driver: {
            name: 'salubrious',
            version: '0.0.0',
            informationUri: 'https://github.com/MHAlikhani/salubrious',
            rules: [] as unknown[],
          },
        },
        results: [] as unknown[],
      },
    ],
  };

  const ruleMap = new Map<string, { id: string; name: string; description: string }>();

  for (const pkg of result.packages) {
    for (const signal of pkg.signals) {
      if (!ruleMap.has(signal.id)) {
        ruleMap.set(signal.id, {
          id: signal.id,
          name: signal.name,
          description: signal.message,
        });
      }

      sarif.runs[0].results.push({
        ruleId: signal.id,
        level: signal.severity === 'error' ? 'error' : signal.severity === 'warning' ? 'warning' : 'note',
        message: { text: `${pkg.name}@${pkg.version}: ${signal.message}` },
        locations: [
          {
            physicalLocation: {
              artifactLocation: { uri: result.metadata.lockfile },
              region: { startLine: 1 },
            },
          },
        ],
        properties: {
          package: pkg.name,
          version: pkg.version,
          signal: signal.id,
          penalty: signal.penalty,
          evidence: signal.evidence,
        },
      });
    }
  }

  sarif.runs[0].tool.driver.rules = Array.from(ruleMap.values()).map((r) => ({
    id: r.id,
    name: r.name,
    shortDescription: { text: r.description },
    fullDescription: { text: r.description },
    defaultConfiguration: { level: 'warning' },
  }));

  return JSON.stringify(sarif, null, 2);
}

function formatGithubActions(result: SalubriousResult): string {
  const lines: string[] = [];

  for (const pkg of result.packages) {
    for (const signal of pkg.signals) {
      const level = signal.severity === 'error' ? 'error' : 'warning';
      const file = result.metadata.lockfile;
      lines.push(`::${level} file=${file}::${pkg.name}@${pkg.version}: ${signal.name} - ${signal.message}`);
    }
  }

  return lines.join('\n');
}

export const reporter = {
  format(
    result: SalubriousResult,
    format: 'human' | 'json' | 'markdown' | 'sarif' | 'github-actions'
  ): string {
    switch (format) {
      case 'json':
        return formatJson(result);
      case 'markdown':
        return formatMarkdown(result);
      case 'sarif':
        return formatSarif(result);
      case 'github-actions':
        return formatGithubActions(result);
      default:
        return formatHuman(result);
    }
  },
};