import AsyncStorage from '@react-native-async-storage/async-storage';
import { PortalContextResolver } from '../infrastructure/contextResolver';
import { PortalType } from '../types/canonical';
import { CANONICAL_CURRICULUM } from './taxonomies/curriculum';
import { logError } from '../../lib/logEvent';

/**
 * GOVERNED KNOWLEDGE STORE
 * 
 * Implements strict portal isolation and canonical knowledge enforcement.
 */

export class KnowledgeStore {
  private static getPrefix(): string {
    const context = PortalContextResolver.resolve();
    return context.portal_type;
  }

  private static getKey(baseKey: string): string {
    return `${this.getPrefix()}:${baseKey}`;
  }

  /**
   * Resolves subjects based on the active portal context.
   */
  static async getSubjects(): Promise<any[]> {
    const context = PortalContextResolver.resolve();
    
    switch (context.portal_type) {
      case 'high_school':
        return CANONICAL_CURRICULUM.HIGH_SCHOOL.subjects;
      case 'university':
        return CANONICAL_CURRICULUM.UNIVERSITY.schools;
      case 'knowledge_explorer':
        return CANONICAL_CURRICULUM.KNOWLEDGE_EXPLORER.domains;
      default:
        return [];
    }
  }

  /**
   * Governed Progress Persistence
   */
  static async saveProgress(topicId: string, data: any): Promise<void> {
    const key = this.getKey('progress');
    try {
      const existing = await this.getProgress();
      const updated = { ...existing, [topicId]: { ...data, updated_at: new Date().toISOString() } };
      await AsyncStorage.setItem(key, JSON.stringify(updated));
    } catch (err) {
      logError('KNOWLEDGE_STORE_SAVE_FAILED', err);
    }
  }

  static async getProgress(): Promise<Record<string, any>> {
    const key = this.getKey('progress');
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : {};
    } catch (err) {
      return {};
    }
  }

  /**
   * Isolated Recommendation Engine
   */
  static async getRecommendations(): Promise<any[]> {
    const subjects = await this.getSubjects();
    const progress = await this.getProgress();
    
    // Isolated logic: Only recommend items within the current portal's subjects
    return subjects.filter(s => !progress[s.id]).slice(0, 3);
  }
}
