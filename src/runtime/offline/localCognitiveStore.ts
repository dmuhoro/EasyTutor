/**
 * LOCAL COGNITIVE STORE
 *
 * Stores cognitive state and execution results locally.
 * Enables offline recovery and state synchronization.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { RuntimeExecution } from '../types';
import { PortalType } from '../../types/canonical';

export interface CognitiveState {
  portal_type: PortalType;
  learner_id: string;
  cognitive_data: Record<string, unknown>;
  last_updated: string;
  sync_pending: boolean;
}

export interface ExecutionRecord {
  execution_id: string;
  canonical_id: string;
  portal_type: PortalType;
  operation: string;
  result: unknown;
  executed_at: string;
  offline: boolean;
}

export class LocalCognitiveStore {
  private readonly STATE_PREFIX = 'cognitive_state';
  private readonly EXECUTION_PREFIX = 'execution_record';

  async getCognitiveState(portalType: PortalType, learnerId: string): Promise<CognitiveState | null> {
    try {
      const key = `${this.STATE_PREFIX}:${portalType}:${learnerId}`;
      const stored = await AsyncStorage.getItem(key);

      if (!stored) return null;

      return JSON.parse(stored);
    } catch (error) {
      console.warn('Failed to get cognitive state:', error);
      return null;
    }
  }

  async updateCognitiveState(
    portalType: PortalType,
    learnerId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    try {
      const existing = await this.getCognitiveState(portalType, learnerId);

      const state: CognitiveState = {
        portal_type: portalType,
        learner_id: learnerId,
        cognitive_data: { ...existing?.cognitive_data, ...data },
        last_updated: new Date().toISOString(),
        sync_pending: true,
      };

      const key = `${this.STATE_PREFIX}:${portalType}:${learnerId}`;
      await AsyncStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to update cognitive state:', error);
    }
  }

  async recordExecution(execution: RuntimeExecution, result: unknown): Promise<void> {
    try {
      const record: ExecutionRecord = {
        execution_id: execution.runtime_id,
        canonical_id: execution.canonical_id,
        portal_type: execution.portal_type,
        operation: 'unknown', // Would be passed in real implementation
        result,
        executed_at: execution.runtime_timestamp,
        offline: execution.execution_mode === 'offline',
      };

      const key = `${this.EXECUTION_PREFIX}:${execution.runtime_id}`;
      await AsyncStorage.setItem(key, JSON.stringify(record));
    } catch (error) {
      console.warn('Failed to record execution:', error);
    }
  }

  async getExecutionHistory(portalType: PortalType, limit = 50): Promise<ExecutionRecord[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const executionKeys = keys
        .filter(key => key.startsWith(this.EXECUTION_PREFIX))
        .sort()
        .reverse()
        .slice(0, limit);

      const records: ExecutionRecord[] = [];

      for (const key of executionKeys) {
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const record: ExecutionRecord = JSON.parse(stored);
          if (record.portal_type === portalType) {
            records.push(record);
          }
        }
      }

      return records;
    } catch (error) {
      console.warn('Failed to get execution history:', error);
      return [];
    }
  }

  async executeGeneric(execution: RuntimeExecution): Promise<unknown> {
    // Generic offline execution fallback
    const state = await this.getCognitiveState(execution.portal_type, 'default');

    return {
      type: 'generic_offline',
      execution_id: execution.runtime_id,
      canonical_id: execution.canonical_id,
      cognitive_context: state?.cognitive_data || {},
      fallback: true,
    };
  }

  async getPendingSync(): Promise<CognitiveState[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const stateKeys = keys.filter(key => key.startsWith(this.STATE_PREFIX));

      const pendingStates: CognitiveState[] = [];

      for (const key of stateKeys) {
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const state: CognitiveState = JSON.parse(stored);
          if (state.sync_pending) {
            pendingStates.push(state);
          }
        }
      }

      return pendingStates;
    } catch (error) {
      console.warn('Failed to get pending sync:', error);
      return [];
    }
  }

  async markSynced(portalType: PortalType, learnerId: string): Promise<void> {
    try {
      const state = await this.getCognitiveState(portalType, learnerId);
      if (state) {
        state.sync_pending = false;
        const key = `${this.STATE_PREFIX}:${portalType}:${learnerId}`;
        await AsyncStorage.setItem(key, JSON.stringify(state));
      }
    } catch (error) {
      console.warn('Failed to mark as synced:', error);
    }
  }
}