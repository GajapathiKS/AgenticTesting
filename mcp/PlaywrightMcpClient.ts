import { ObservedState } from './SnapshotTypes.js';

export interface PerformActionOptions {
  locator: string;
  action: 'click' | 'type' | 'select' | 'navigate' | 'assert';
  value?: string;
}

export interface PerformActionResult {
  success: boolean;
  errorMessage?: string;
}

/**
 * Thin wrapper around Playwright MCP tools. The real implementation would proxy
 * browser commands, but the current scaffold records intents which keeps the
 * rest of the agent stack testable inside CI.
 */
export class PlaywrightMcpClient {
  async observe(): Promise<ObservedState> {
    const now = Date.now();
    return {
      url: 'about:blank',
      title: 'Placeholder Page',
      domSnapshot: '<html></html>',
      ariaSnapshot: '{}',
      visibleText: [],
      consoleLogs: [],
      networkEvents: [],
      timestamp: now
    };
  }

  async performAction(options: PerformActionOptions): Promise<PerformActionResult> {
    // Placeholder: pretend every action works. Real implementation would call
    // the Playwright MCP toolchain and surface the result.
    if (options.action === 'navigate' && !options.value) {
      return { success: false, errorMessage: 'Navigation missing destination URL' };
    }
    return { success: true };
  }
}
