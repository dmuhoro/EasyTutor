/**
 * RUNTIME FAILURE ANALYZER
 * 
 * Classifies runtime errors and determines recovery severity.
 * Mandated for all governed execution failure paths.
 */
export type FailureSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface FailureAnalysis {
  severity: FailureSeverity;
  reason: string;
  recoverable: boolean;
  strategy: 'retry' | 'fallback' | 'abort' | 'escalate';
}

export class RuntimeFailureAnalyzer {
  analyze(error: Error | string): FailureAnalysis {
    const message = typeof error === 'string' ? error : error.message;
    const stack = typeof error === 'string' ? '' : (error.stack || '');

    // Critical: Security or Governance violations
    if (message.includes('GOVERNANCE ERROR') || message.includes('RLS') || message.includes('Unauthorized')) {
      return {
        severity: 'critical',
        reason: `Security/Governance violation: ${message}`,
        recoverable: false,
        strategy: 'abort'
      };
    }

    // High: Network timeouts or Cloud provider failures
    if (message.includes('timeout') || message.includes('ETIMEDOUT') || message.includes('fetch failed')) {
      return {
        severity: 'high',
        reason: `Infrastructure failure: ${message}`,
        recoverable: true,
        strategy: 'fallback'
      };
    }

    // Medium: Logic errors or Resource constraints
    if (message.includes('budget') || message.includes('memory') || message.includes('Invalid execution transition')) {
      return {
        severity: 'medium',
        reason: `Runtime constraint: ${message}`,
        recoverable: true,
        strategy: 'retry'
      };
    }

    // Default: Low severity for unknown errors
    return {
      severity: 'low',
      reason: message,
      recoverable: true,
      strategy: 'retry'
    };
  }
}

export const runtimeFailureAnalyzer = new RuntimeFailureAnalyzer();
