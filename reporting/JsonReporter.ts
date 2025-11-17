import { promises as fs } from 'fs';
import path from 'path';
import { AgentConfig, RunSummary } from '../agent/types.js';

export class JsonReporter {
  constructor(private readonly outputDir = 'artifacts') {}

  async write(summary: RunSummary[], config: AgentConfig): Promise<void> {
    const payload = {
      generatedAt: new Date().toISOString(),
      environment: config.environment,
      tests: summary
    };

    await fs.mkdir(this.outputDir, { recursive: true });
    await fs.writeFile(path.join(this.outputDir, 'report.json'), JSON.stringify(payload, null, 2), 'utf-8');
  }
}
