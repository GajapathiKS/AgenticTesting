import { promises as fs } from 'fs';
import path from 'path';
import { AgentConfig, RunSummary } from '../agent/types.js';

export class MarkdownReporter {
  constructor(private readonly outputDir = 'artifacts') {}

  async write(summary: RunSummary[], config: AgentConfig): Promise<void> {
    const lines: string[] = [];
    lines.push(`# Agentic Test Report (${config.environment})`);
    lines.push('');
    lines.push(`Total tests: ${summary.length}`);
    lines.push('');
    lines.push('| Test ID | Title | Status | Steps |');
    lines.push('| --- | --- | --- | --- |');
    for (const test of summary) {
      lines.push(`| ${test.testId} | ${test.title} | ${test.status} | ${test.steps.length} |`);
    }

    await fs.mkdir(this.outputDir, { recursive: true });
    await fs.writeFile(path.join(this.outputDir, 'report.md'), lines.join('\n'), 'utf-8');
  }
}
