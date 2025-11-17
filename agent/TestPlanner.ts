import { ExecutionPlan, ExecutionPlanStep, ParsedTest } from './types.js';

let stepIdCounter = 0;

const nextStepId = (): string => `step-${++stepIdCounter}`;

export class TestPlanner {
  buildPlan(test: ParsedTest): ExecutionPlan {
    const steps: ExecutionPlanStep[] = test.steps.map((step) => ({
      id: nextStepId(),
      label: `Step ${step.index}`,
      description: step.description.trim(),
      expectedOutcome: this.deriveExpectedOutcome(step.description),
      possibleLocators: [],
      assertionHooks: this.deriveAssertionHooks(step.description)
    }));

    return { test, steps };
  }

  private deriveExpectedOutcome(description: string): string | undefined {
    if (description.toLowerCase().startsWith('verify')) {
      return description;
    }
    return undefined;
  }

  private deriveAssertionHooks(description: string): string[] {
    if (description.toLowerCase().includes('toast')) {
      return ['toast'];
    }
    if (description.toLowerCase().includes('grid')) {
      return ['grid'];
    }
    return [];
  }
}
