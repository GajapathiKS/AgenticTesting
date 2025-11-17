import { ObservedState } from '../mcp/SnapshotTypes.js';
import { NovaLiteClient } from '../llm/NovaLiteClient.js';

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
  constructor(private readonly novaClient = new NovaLiteClient()) {}

  async analyze(request: FailureAnalysisRequest): Promise<FailureAnalysisResponse> {
    try {
      const completion = await this.novaClient.complete(this.buildPrompt(request));
      const parsed = this.tryParse(completion);
      if (parsed) {
        return parsed;
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(`[FailureLLMClient] Falling back to heuristics: ${reason}`);
    }

    return this.fallbackResponse(request);
  }

  private buildPrompt(request: FailureAnalysisRequest): string {
    const visibleText = request.observedState.visibleText.slice(0, 20).join(' | ');
    const consoleErrors = request.observedState.consoleLogs
      .filter((log) => log.type === 'error')
      .map((log) => log.message)
      .join(' | ');
    const networkErrors = request.observedState.networkEvents
      .filter((event) => event.status >= 400)
      .map((event) => `${event.method} ${event.url} -> ${event.status}`)
      .join(' | ');

    return [
      'You are Nova Lite performing failure analysis for an agentic test runner.',
      'Return JSON with keys rootCauseClass, confidence, shortReason, detailedAnalysis (array), suggestedNextActions (array).',
      `Step Description: ${request.stepDescription}`,
      `Error Message: ${request.errorMessage ?? 'Unknown'}`,
      `Observed URL: ${request.observedState.url}`,
      `Console Errors: ${consoleErrors || 'none'}`,
      `Network Errors: ${networkErrors || 'none'}`,
      `Visible Text Sample: ${visibleText}`,
      'Only output valid JSON.'
    ].join('\n');
  }

  private tryParse(raw: string): FailureAnalysisResponse | undefined {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.rootCauseClass && parsed.confidence !== undefined) {
        return parsed;
      }
      return undefined;
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

  private fallbackResponse(request: FailureAnalysisRequest): FailureAnalysisResponse {
    const reason = request.errorMessage ?? 'Unknown failure';
    return {
      rootCauseClass: reason.toLowerCase().includes('locator') ? 'Locator/UI change' : 'Timing/Flakiness',
      confidence: 0.35,
      shortReason: reason,
      detailedAnalysis: [
        `Step: ${request.stepDescription}`,
        `URL: ${request.observedState.url}`
      ],
      suggestedNextActions: ['Inspect DOM snapshot', 'Capture console logs']
    };
  }
}
