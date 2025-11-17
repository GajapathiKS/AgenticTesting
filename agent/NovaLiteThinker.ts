import { ExecutionPlanStep, PlannedAction } from './types.js';
import { ObservedState } from '../mcp/SnapshotTypes.js';
import { LocatorStrategy } from '../locators/LocatorStrategy.js';
import { NovaLiteClient } from '../llm/NovaLiteClient.js';

export interface ThinkContext {
  step: ExecutionPlanStep;
  observedState: ObservedState;
  previousActions: string[];
}

export class NovaLiteThinker {
  constructor(private readonly novaClient = new NovaLiteClient(), private readonly locatorStrategy = new LocatorStrategy()) {}

  async plan(context: ThinkContext): Promise<PlannedAction> {
    try {
      const completion = await this.novaClient.complete(this.buildPrompt(context));
      const parsed = this.tryParseAction(completion);
      if (parsed) {
        return {
          actionType: parsed.actionType ?? 'click',
          targetDescription: parsed.targetDescription ?? context.step.description,
          candidateLocators: Array.isArray(parsed.candidateLocators) ? parsed.candidateLocators : [],
          expectedOutcome: parsed.expectedOutcome ?? context.step.expectedOutcome,
          inputValue: parsed.inputValue
        };
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(`[NovaLiteThinker] Falling back to heuristic plan: ${reason}`);
    }

    return this.buildFallbackAction(context.step);
  }

  private buildPrompt(context: ThinkContext): string {
    const { step, observedState, previousActions } = context;
    const visibleText = observedState.visibleText.slice(0, 20).join(' | ');

    return [
      'You are Nova Lite acting as the reasoning brain for an agentic web testing framework.',
      'Given the current step, observed DOM context, and previous actions, respond with a JSON object describing the next action.',
      'The JSON schema is {"actionType": "navigate|click|type|select|assert|noop", "targetDescription": string, "candidateLocators": string[], "expectedOutcome": string, "inputValue": string}.',
      `Step ID: ${step.id}`,
      `Step Label: ${step.label}`,
      `Step Description: ${step.description}`,
      `Expected Outcome: ${step.expectedOutcome ?? 'N/A'}`,
      `Possible Locators: ${step.possibleLocators.join(', ')}`,
      `Assertion Hooks: ${step.assertionHooks.join(', ')}`,
      `Current URL: ${observedState.url}`,
      `Page Title: ${observedState.title}`,
      `Visible Text Sample: ${visibleText}`,
      `Previous Actions: ${previousActions.join(' -> ') || 'none'}`,
      'Return JSON only with no additional commentary.'
    ].join('\n');
  }

  private tryParseAction(raw: string): Partial<PlannedAction> | undefined {
    try {
      return JSON.parse(raw);
    } catch (error) {
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start >= 0 && end > start) {
        try {
          return JSON.parse(raw.slice(start, end + 1));
        } catch {
          return undefined;
        }
      }
      return undefined;
    }
  }

  private buildFallbackAction(step: ExecutionPlanStep): PlannedAction {
    const locatorStrategy = this.locatorStrategy
      .buildCandidateLocators(step)
      .map((candidate) => `${candidate.strategy}:${candidate.value}`);
    const lowerDesc = step.description.toLowerCase();
    if (lowerDesc.startsWith('navigate')) {
      return {
        actionType: 'navigate',
        targetDescription: step.description,
        candidateLocators: [],
        expectedOutcome: step.expectedOutcome,
        inputValue: this.extractUrl(step.description)
      };
    }

    return {
      actionType: 'click',
      targetDescription: step.description,
      candidateLocators: locatorStrategy,
      expectedOutcome: step.expectedOutcome
    };
  }

  private extractUrl(description: string): string | undefined {
    const urlMatch = description.match(/https?:\/\/\S+/i);
    if (!urlMatch) {
      return undefined;
    }
    return urlMatch[0].replace(/[),.]+$/, '');
  }
}
