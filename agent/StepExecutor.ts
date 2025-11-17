import { AgentConfig, ExecutionPlanStep, PlannedAction, StepResult } from './types.js';
import { PlaywrightMcpClient } from '../mcp/PlaywrightMcpClient.js';
import { SelfHealingLocator } from '../locators/SelfHealingLocator.js';
import { LocatorCandidate } from '../locators/LocatorStrategy.js';
import { NovaLiteThinker } from './NovaLiteThinker.js';

export interface StepExecutorOptions {
  client: PlaywrightMcpClient;
  config: AgentConfig;
  selfHealingLocator: SelfHealingLocator;
  thinker?: NovaLiteThinker;
}

/**
 * Executes a single planned step by going through observe → think → act.
 * The current version keeps the logic deterministic while exercising the
 * self-healing cache to validate the architecture end-to-end.
 */
export class StepExecutor {
  private readonly thinker: NovaLiteThinker;
  private readonly actionHistory: string[] = [];

  constructor(private readonly options: StepExecutorOptions) {
    this.thinker = options.thinker ?? new NovaLiteThinker();
  }

  async executeStep(testId: string, step: ExecutionPlanStep): Promise<StepResult> {
    const observedBefore = await this.options.client.observe();
    const plannedAction = await this.thinker.plan({
      step,
      observedState: observedBefore,
      previousActions: [...this.actionHistory]
    });

    let attempts = 0;
    let lastError: string | undefined;
    let usedLocator: string | undefined;

    if (plannedAction.actionType === 'noop') {
      const observedAfter = await this.options.client.observe();
      this.actionHistory.push('noop');
      return {
        step,
        status: 'PASSED',
        actionLogs: ['Action: noop (Nova Lite determined no interaction was required)'],
        observedState: observedAfter,
        selfHealingAttempts: 0
      };
    }

    if (plannedAction.actionType === 'navigate') {
      const navigationTarget = plannedAction.inputValue ?? this.options.config.baseUrl;
      const navResult = await this.options.client.performAction({
        locator: plannedAction.targetDescription,
        action: 'navigate',
        value: navigationTarget
      });

      if (navResult.success) {
        const observedAfter = await this.options.client.observe();
        this.actionHistory.push(`${plannedAction.actionType}:${navigationTarget}`);
        return {
          step,
          status: 'PASSED',
          actionLogs: [`Action: ${plannedAction.actionType} -> ${navigationTarget}`],
          observedState: observedAfter,
          selfHealingAttempts: 0
        };
      }

      lastError = navResult.errorMessage ?? 'Navigation failed';
    } else {
      const candidates = this.mergeLocatorCandidates(testId, step, plannedAction);
      for (const candidate of candidates) {
        if (!this.options.config.enableSelfHealing && attempts > 0) {
          break;
        }

        attempts += 1;
        usedLocator = `${candidate.strategy}=${candidate.value}`;
        const actionResult = await this.options.client.performAction({
          locator: usedLocator,
          action: plannedAction.actionType,
          value: plannedAction.inputValue
        });

        if (actionResult.success) {
          this.options.selfHealingLocator.recordSuccess(testId, step, candidate);
          const observedAfter = await this.options.client.observe();
          this.actionHistory.push(`${plannedAction.actionType}:${usedLocator}`);
          return {
            step,
            status: 'PASSED',
            actionLogs: [
              `Observed URL: ${observedBefore.url}`,
              `Planned Action: ${plannedAction.actionType} -> ${plannedAction.targetDescription}`,
              `Resolved Locator: ${usedLocator}`
            ],
            observedState: observedAfter,
            selfHealingAttempts: attempts - 1
          };
        }

        lastError = actionResult.errorMessage ?? 'Unknown MCP failure';
        if (attempts > this.options.config.maxSelfHealAttempts) {
          break;
        }
      }
    }

    const observedAfter = await this.options.client.observe();
    return {
      step,
      status: 'FAILED',
      actionLogs: [`Action failed for ${step.label}`, lastError ?? 'Unknown error'],
      observedState: observedAfter,
      selfHealingAttempts: attempts,
      errorMessage: lastError
    };
  }

  private mergeLocatorCandidates(
    testId: string,
    step: ExecutionPlanStep,
    plannedAction: PlannedAction
  ): LocatorCandidate[] {
    const llmCandidates = plannedAction.candidateLocators
      .map((token) => this.parseCandidateToken(token))
      .filter((candidate): candidate is LocatorCandidate => Boolean(candidate));
    const strategyCandidates = this.options.selfHealingLocator.getCandidates(testId, step);

    const merged = new Map<string, LocatorCandidate>();
    for (const candidate of [...llmCandidates, ...strategyCandidates]) {
      const key = `${candidate.strategy}:${candidate.value}`;
      if (!merged.has(key)) {
        merged.set(key, candidate);
      }
    }

    return Array.from(merged.values());
  }

  private parseCandidateToken(token: string): LocatorCandidate | undefined {
    const [strategy, ...rest] = token.split(':');
    if (!strategy || rest.length === 0) {
      return undefined;
    }
    const value = rest.join(':');
    return { strategy, value };
  }
}
