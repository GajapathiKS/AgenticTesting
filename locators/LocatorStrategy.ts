import { ExecutionPlanStep } from '../agent/types.js';

export interface LocatorCandidate {
  strategy: string;
  value: string;
}

/**
 * Produces candidate locators derived from a step description. The goal is to
 * keep the logic deterministic so unit tests can assert against the planning
 * layer without needing Playwright.
 */
export class LocatorStrategy {
  buildCandidateLocators(step: ExecutionPlanStep): LocatorCandidate[] {
    const tokens = step.description.split(/\s+/).filter(Boolean);
    const label = step.label.replace(/[^a-z0-9]+/gi, '-').toLowerCase();

    const candidates: LocatorCandidate[] = [
      { strategy: 'text', value: step.description },
      { strategy: 'role+text', value: step.label },
      { strategy: 'data-testid', value: label }
    ];

    if (tokens.length) {
      candidates.push({ strategy: 'text-contains', value: tokens.slice(0, 3).join(' ') });
    }

    return candidates;
  }
}
