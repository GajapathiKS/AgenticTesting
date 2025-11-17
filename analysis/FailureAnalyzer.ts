import { FailureLLMClient } from './FailureLLMClient.js';
import { ObservedState } from '../mcp/SnapshotTypes.js';

export interface FailureAnalysis {
  rootCauseClass: string;
  confidence: number;
  shortReason: string;
  detailedAnalysis: string[];
  suggestedNextActions: string[];
}

export class FailureAnalyzer {
  constructor(private readonly client = new FailureLLMClient()) {}

  async analyze(stepDescription: string, errorMessage: string | undefined, observedState: ObservedState): Promise<FailureAnalysis> {
    const response = await this.client.analyze({
      stepDescription,
      errorMessage,
      observedState
    });

    return {
      rootCauseClass: response.rootCauseClass,
      confidence: response.confidence,
      shortReason: response.shortReason,
      detailedAnalysis: response.detailedAnalysis,
      suggestedNextActions: response.suggestedNextActions
    };
  }
}
