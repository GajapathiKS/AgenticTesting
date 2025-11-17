import { promises as fs } from 'fs';
import path from 'path';
import { AgentConfig, RunSummary } from '../agent/types.js';

export class HtmlReporter {
  constructor(private readonly outputDir = 'artifacts') {}

  async write(summary: RunSummary[], config: AgentConfig): Promise<void> {
    const rows = summary
      .map(
        (test) => `<tr><td>${test.testId}</td><td>${test.title}</td><td>${test.status}</td><td>${test.steps.length}</td></tr>`
      )
      .join('\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Agentic Run Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 2rem; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 0.5rem; text-align: left; }
    th { background: #f2f2f2; }
  </style>
</head>
<body>
  <h1>Agentic Run Report (${config.environment})</h1>
  <p>Total tests: ${summary.length}</p>
  <table>
    <thead><tr><th>ID</th><th>Title</th><th>Status</th><th>Steps</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

    await fs.mkdir(this.outputDir, { recursive: true });
    await fs.writeFile(path.join(this.outputDir, 'report.html'), html, 'utf-8');
  }
}
