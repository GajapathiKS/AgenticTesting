import { ObservedState } from '../mcp/SnapshotTypes.js';

export interface FailureAnalysisRequest {
  stepDescription: string;
  errorMessage?: string;
  observedState: ObservedState;
}

export interface FailureAnalysisResponse {
  rootCauseClass:
    | 'Locator/UI change'
    | 'Timing/Flakiness'
    | 'Data/Test setup'
    | 'Business rule'
    | 'Environment/Backend'
    | 'Permissions/Auth'
    | 'Blocking UI';
  confidence: number;
  shortReason: string;
  detailedAnalysis: string[];
  suggestedNextActions: string[];
}

export class FailureLLMClient {
  async analyze(request: FailureAnalysisRequest): Promise<FailureAnalysisResponse> {
    // Placeholder heuristics to keep the API deterministic until Nova Lite is wired
    // in via MCP.
    const reason = request.errorMessage ?? 'Unknown failure';
    return {
      rootCauseClass: reason.includes('locator') ? 'Locator/UI change' : 'Timing/Flakiness',
      confidence: 0.42,
      shortReason: reason,
      detailedAnalysis: [
        `Step: ${request.stepDescription}`,
        `URL: ${request.observedState.url}`
      ],
      suggestedNextActions: ['Inspect DOM snapshot', 'Capture console logs']
    };
  }
}
