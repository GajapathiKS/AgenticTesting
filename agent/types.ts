import { FailureAnalysis } from '../analysis/FailureAnalyzer.js';
import { ObservedState } from '../mcp/SnapshotTypes.js';

export type StepStatus = 'PASSED' | 'FAILED' | 'SOFT_FAILED' | 'SKIPPED';

export interface ParsedTestStep {
  index: number;
  description: string;
}

export interface ParsedTest {
  id: string;
  title: string;
  url?: string;
  preconditions: string[];
  steps: ParsedTestStep[];
  assertions: string[];
  tags: string[];
}

export interface ExecutionPlanStep {
  id: string;
  label: string;
  description: string;
  expectedOutcome?: string;
  possibleLocators: string[];
  assertionHooks: string[];
}

export interface ExecutionPlan {
  test: ParsedTest;
  steps: ExecutionPlanStep[];
}

export interface PlannedAction {
  actionType: 'navigate' | 'click' | 'type' | 'select' | 'assert' | 'noop';
  targetDescription: string;
  candidateLocators: string[];
  expectedOutcome?: string;
  inputValue?: string;
}

export interface StepResult {
  step: ExecutionPlanStep;
  status: StepStatus;
  actionLogs: string[];
  observedState: ObservedState;
  failureAnalysis?: FailureAnalysis;
  selfHealingAttempts: number;
  errorMessage?: string;
}

export interface RunSummary {
  testId: string;
  title: string;
  status: StepStatus;
  steps: StepResult[];
  tags: string[];
}

export interface AgentConfig {
  baseUrl: string;
  environment: 'dev' | 'qa' | 'prod';
  timeouts: {
    navigation: number;
    element: number;
    assertion: number;
  };
  maxSelfHealAttempts: number;
  enableSelfHealing: boolean;
  enableManualLoginPause: boolean;
  enableFailureAnalysis: boolean;
  captureScreenshots: 'onFailure' | 'onStep' | 'none';
  novaLite?: NovaLiteSettings;
}

export interface Reporter {
  write(summary: RunSummary[], config: AgentConfig): Promise<void>;
}

export interface NovaLiteSettings {
  region?: string;
  modelId?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}
