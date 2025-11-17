import { ExecutionPlanStep } from '../agent/types.js';
import { LocatorCandidate, LocatorStrategy } from './LocatorStrategy.js';

interface CacheKey {
  testId: string;
  stepId: string;
}

const keyToString = (key: CacheKey): string => `${key.testId}:${key.stepId}`;

/**
 * Lightweight cache that remembers the last working locator per step.
 */
export class SelfHealingLocator {
  private cache = new Map<string, LocatorCandidate>();

  constructor(private readonly strategy: LocatorStrategy) {}

  getCandidates(testId: string, step: ExecutionPlanStep): LocatorCandidate[] {
    const cached = this.cache.get(keyToString({ testId, stepId: step.id }));
    if (cached) {
      return [cached];
    }
    return this.strategy.buildCandidateLocators(step);
  }

  recordSuccess(testId: string, step: ExecutionPlanStep, locator: LocatorCandidate): void {
    this.cache.set(keyToString({ testId, stepId: step.id }), locator);
  }
}
