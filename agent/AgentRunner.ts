import { promises as fs } from 'fs';
import path from 'path';
import { AgentConfig, Reporter, RunSummary, StepResult } from './types.js';
import { TestParser } from '../tests/TestParser.js';
import { TestPlanner } from './TestPlanner.js';
import { PlaywrightMcpClient } from '../mcp/PlaywrightMcpClient.js';
import { LocatorStrategy } from '../locators/LocatorStrategy.js';
import { SelfHealingLocator } from '../locators/SelfHealingLocator.js';
import { StepExecutor } from './StepExecutor.js';
import { FailureAnalyzer } from '../analysis/FailureAnalyzer.js';
import { FailureLLMClient } from '../analysis/FailureLLMClient.js';
import { HtmlReporter } from '../reporting/HtmlReporter.js';
import { JsonReporter } from '../reporting/JsonReporter.js';
import { MarkdownReporter } from '../reporting/MarkdownReporter.js';
import { HealingInsightsReporter } from '../reporting/HealingInsightsReporter.js';
import { NovaLiteClient } from '../llm/NovaLiteClient.js';
import { NovaLiteThinker } from './NovaLiteThinker.js';

export class AgentRunner {
  private readonly parser = new TestParser();
  private readonly planner = new TestPlanner();
  private readonly client = new PlaywrightMcpClient();
  private readonly selfHealingLocator = new SelfHealingLocator(new LocatorStrategy());
  private readonly novaLiteClient: NovaLiteClient;
  private readonly failureAnalyzer: FailureAnalyzer;
  private readonly stepExecutor: StepExecutor;
  private readonly reporters: Reporter[];

  constructor(private readonly config: AgentConfig, reporters?: Reporter[]) {
    this.novaLiteClient = new NovaLiteClient(this.config.novaLite);
    const thinker = new NovaLiteThinker(this.novaLiteClient);
    const failureClient = new FailureLLMClient(this.novaLiteClient);
    this.failureAnalyzer = new FailureAnalyzer(failureClient);
    this.stepExecutor = new StepExecutor({
      client: this.client,
      config: this.config,
      selfHealingLocator: this.selfHealingLocator,
      thinker
    });

    this.reporters = reporters ?? [
      new HtmlReporter(),
      new JsonReporter(),
      new MarkdownReporter(),
      new HealingInsightsReporter()
    ];
  }

  static async fromConfig(configPath: string): Promise<AgentRunner> {
    const raw = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(raw) as AgentConfig;
    return new AgentRunner(config);
  }

  async runFromDirectory(testDir = 'tests'): Promise<RunSummary[]> {
    const files = (await fs.readdir(testDir)).filter((file) => file.endsWith('.txt'));
    const summaries: RunSummary[] = [];
    for (const file of files) {
      const parsed = await this.parser.parseFile(path.join(testDir, file));
      const plan = this.planner.buildPlan(parsed);
      const stepResults: StepResult[] = [];

      for (const step of plan.steps) {
        const result = await this.stepExecutor.executeStep(parsed.id, step);
        if (result.status === 'FAILED' && this.config.enableFailureAnalysis) {
          result.failureAnalysis = await this.failureAnalyzer.analyze(step.description, result.errorMessage, result.observedState);
        }
        stepResults.push(result);
      }

      const finalStatus = stepResults.every((result) => result.status === 'PASSED') ? 'PASSED' : 'FAILED';
      summaries.push({
        testId: parsed.id,
        title: parsed.title,
        status: finalStatus,
        steps: stepResults,
        tags: parsed.tags
      });
    }

    await Promise.all(this.reporters.map((reporter) => reporter.write(summaries, this.config)));
    return summaries;
  }
}
