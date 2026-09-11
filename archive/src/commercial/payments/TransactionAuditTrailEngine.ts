/**
 * TRANSACTION AUDIT TRAIL ENGINE
 *
 * Maintains immutable audit trail for all transactions:
 * - Action logging
 * - Change tracking
 * - Cryptographic signing
 * - Regulatory compliance
 */

import { AuditTrailEntry } from './paymentContracts';
import * as crypto from 'crypto';

export interface AuditQueryResult {
  entries: AuditTrailEntry[];
  total_count: number;
  query_timestamp: string;
}

export class TransactionAuditTrailEngine {
  private auditLog: AuditTrailEntry[] = [];
  private signingKey: string;
  private entityIndex: Map<string, AuditTrailEntry[]> = new Map(); // For fast lookups

  constructor(signingKey: string) {
    this.signingKey = signingKey;
  }

  async logAction(
    entityType: 'transaction' | 'settlement' | 'wallet' | 'invoice',
    entityId: string,
    action: string,
    actor: string,
    changes: Record<string, unknown>
  ): Promise<AuditTrailEntry> {
    const entry: AuditTrailEntry = {
      entry_id: `AUDIT-${Date.now()}`,
      entity_type: entityType,
      entity_id: entityId,
      action,
      actor,
      timestamp: new Date().toISOString(),
      changes,
      signature: this.signEntry({
        entity_type: entityType,
        entity_id: entityId,
        action,
        actor,
        timestamp: new Date().toISOString(),
        changes,
      }),
    };

    this.auditLog.push(entry);

    // Index by entity
    const key = `${entityType}:${entityId}`;
    const existing = this.entityIndex.get(key) || [];
    existing.push(entry);
    this.entityIndex.set(key, existing);

    return entry;
  }

  async queryAuditTrail(
    entityType: string,
    entityId: string,
    limit: number = 100
  ): Promise<AuditQueryResult> {
    const key = `${entityType}:${entityId}`;
    const entries = this.entityIndex.get(key) || [];

    return {
      entries: entries.slice(-limit),
      total_count: entries.length,
      query_timestamp: new Date().toISOString(),
    };
  }

  async verifyIntegrity(entry_id: string): Promise<{ valid: boolean; reason?: string }> {
    const entry = this.auditLog.find(e => e.entry_id === entry_id);
    if (!entry || !entry.signature) {
      return { valid: false, reason: 'Entry not found or not signed' };
    }

    const expectedSignature = this.signEntry({
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      action: entry.action,
      actor: entry.actor,
      timestamp: entry.timestamp,
      changes: entry.changes,
    });

    return {
      valid: entry.signature === expectedSignature,
      reason: entry.signature === expectedSignature ? undefined : 'Signature mismatch',
    };
  }

  private signEntry(data: Record<string, unknown>): string {
    const payload = JSON.stringify(data);
    return crypto
      .createHmac('sha256', this.signingKey)
      .update(payload)
      .digest('hex');
  }

  async exportAuditLog(
    startDate: string,
    endDate: string
  ): Promise<{ entries: AuditTrailEntry[]; hash: string }> {
    const filtered = this.auditLog.filter(
      e =>
        new Date(e.timestamp) >= new Date(startDate) &&
        new Date(e.timestamp) <= new Date(endDate)
    );

    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(filtered))
      .digest('hex');

    return { entries: filtered, hash };
  }

  getAuditEntry(entry_id: string): AuditTrailEntry | undefined {
    return this.auditLog.find(e => e.entry_id === entry_id);
  }

  getEntityHistory(entityType: string, entityId: string): AuditTrailEntry[] {
    const key = `${entityType}:${entityId}`;
    return this.entityIndex.get(key) || [];
  }
}
