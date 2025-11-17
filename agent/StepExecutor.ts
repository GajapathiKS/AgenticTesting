import { AgentConfig, ExecutionPlanStep, PlannedAction, StepResult } from './types.js';
import { PlaywrightMcpClient } from '../mcp/PlaywrightMcpClient.js';
import { LocatorStrategy } from '../locators/LocatorStrategy.js';
import { SelfHealingLocator } from '../locators/SelfHealingLocator.js';

export interface StepExecutorOptions {
  client: PlaywrightMcpClient;
  config: AgentConfig;
  selfHealingLocator: SelfHealingLocator;
}

/**
 * Executes a single planned step by going through observe → think → act.
 * The current version keeps the logic deterministic while exercising the
 * self-healing cache to validate the architecture end-to-end.
 */
export class StepExecutor {
  constructor(private readonly options: StepExecutorOptions) {}

  async executeStep(testId: string, step: ExecutionPlanStep): Promise<StepResult> {
    const observedBefore = await this.options.client.observe();
    const plannedAction = this.planAction(step);

    let attempts = 0;
    let lastError: string | undefined;
    let usedLocator: string | undefined;

    const candidates = this.options.selfHealingLocator.getCandidates(testId, step);

    for (const candidate of candidates) {
      attempts += 1;
      usedLocator = `${candidate.strategy}=${candidate.value}`;
      const actionResult = await this.options.client.performAction({
        locator: usedLocator,
        action: plannedAction.actionType === 'navigate' ? 'navigate' : 'click',
        value: plannedAction.inputValue
      });

      if (actionResult.success) {
        this.options.selfHealingLocator.recordSuccess(testId, step, candidate);
        const observedAfter = await this.options.client.observe();
        return {
          step,
          status: 'PASSED',
          actionLogs: [
            `Observed URL: ${observedBefore.url}`,
            `Action: ${plannedAction.actionType} -> ${usedLocator}`
          ],
          observedState: observedAfter,
          selfHealingAttempts: attempts - 1
        };
      }

      lastError = actionResult.errorMessage ?? 'Unknown MCP failure';
      if (!this.options.config.enableSelfHealing || attempts > this.options.config.maxSelfHealAttempts) {
        break;
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

  private planAction(step: ExecutionPlanStep): PlannedAction {
    const description = step.description.toLowerCase();
    if (description.startsWith('navigate')) {
      return {
        actionType: 'navigate',
        targetDescription: step.description,
        candidateLocators: [],
        expectedOutcome: step.expectedOutcome
      };
    }

    return {
      actionType: 'click',
      targetDescription: step.description,
      candidateLocators: new LocatorStrategy().buildCandidateLocators(step).map((c) => `${c.strategy}:${c.value}`),
      expectedOutcome: step.expectedOutcome
    };
  }
}
