import { promises as fs } from 'fs';
import path from 'path';
import { AgentConfig, RunSummary } from '../agent/types.js';

export class HealingInsightsReporter {
  constructor(private readonly outputDir = 'artifacts') {}

  async write(summary: RunSummary[], _config: AgentConfig): Promise<void> {
    const lines: string[] = [];
    lines.push('# Healing Insights');
    lines.push('');
    for (const test of summary) {
      const healedSteps = test.steps.filter((step) => step.selfHealingAttempts > 0);
      if (!healedSteps.length) {
        continue;
      }
      lines.push(`## ${test.testId} - ${test.title}`);
      for (const step of healedSteps) {
        lines.push(`- ${step.step.label}: ${step.selfHealingAttempts} attempt(s)`);
      }
      lines.push('');
    }

    if (lines.length === 2) {
      lines.push('No self-healing activity recorded.');
    }

    await fs.mkdir(this.outputDir, { recursive: true });
    await fs.writeFile(path.join(this.outputDir, 'healing_insights.md'), lines.join('\n'), 'utf-8');
  }
}
