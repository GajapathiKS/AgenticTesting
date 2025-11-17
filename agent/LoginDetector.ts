import { ObservedState } from '../mcp/SnapshotTypes.js';

export class LoginDetector {
  isLoginPage(state: ObservedState): boolean {
    const lowercaseDom = state.domSnapshot.toLowerCase();
    return lowercaseDom.includes('password') && lowercaseDom.includes('sign in');
  }
}
