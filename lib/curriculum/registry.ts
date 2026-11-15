import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';
import {
  CurriculumPack,
  safeValidateCurriculumPack,
  packSubjectIds,
  packTopicSubjectIds,
} from './schema';

/**
 * LoadedCurriculumPack = validated pack + load metadata.
 */
export interface LoadedCurriculumPack {
  pack: CurriculumPack;
  sourceFile: string;
  loadedAt: string;
}

/**
 * CurriculumPackRegistry loads and validates all curriculum packs in a
 * directory. Packs that fail validation are reported but do not crash the
 * app — the registry returns both valid packs and load errors so the UI can
 * surface them honestly.
 */
export class CurriculumPackRegistry {
  private packs: Map<string, LoadedCurriculumPack> = new Map();
  private errors: Array<{ file: string; errors: z.ZodIssue[] }> = [];
  private packDir: string;

  constructor(packDir: string) {
    this.packDir = packDir;
  }

  /**
   * Load every *.json pack in the directory. Invalid packs are recorded as
   * errors and skipped — the app never ships malformed curriculum data.
   */
  loadAll(): { packs: Map<string, LoadedCurriculumPack>; errors: Array<{ file: string; errors: z.ZodIssue[] }> } {
    if (!existsSync(this.packDir)) {
      return { packs: new Map(), errors: [] };
    }

    const files = readdirSync(this.packDir).filter((f) => f.endsWith('.json')).sort();

    for (const file of files) {
      const filePath = join(this.packDir, file);
      try {
        const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
        const validated = safeValidateCurriculumPack(raw);
        if (validated.ok) {
          // Cross-reference validation: every topic.subject_id must reference
          // a declared subject. Packs that violate this are rejected.
          const subjectIds = packSubjectIds(validated.pack);
          const topicSubjectIds = packTopicSubjectIds(validated.pack);
          const orphanSubjectIds = [...topicSubjectIds].filter((sid) => !subjectIds.has(sid));
          if (orphanSubjectIds.length > 0) {
            this.errors.push({
              file,
              errors: [
                {
                  code: 'custom',
                  path: ['topics'],
                  message: `topic(s) reference undeclared subject_id(s): ${orphanSubjectIds.join(', ')}`,
                } as z.ZodIssue,
              ],
            });
            continue;
          }
          this.packs.set(validated.pack.country, {
            pack: validated.pack,
            sourceFile: file,
            loadedAt: new Date().toISOString(),
          });
        } else {
          this.errors.push({ file, errors: validated.errors });
        }
      } catch (err) {
        this.errors.push({
          file,
          errors: [
            {
              code: 'custom',
              path: [],
              message: `failed to parse pack: ${err instanceof Error ? err.message : String(err)}`,
            } as z.ZodIssue,
          ],
        });
      }
    }

    return { packs: this.packs, errors: this.errors };
  }

  /** Get a pack by country code. */
  get(country: string): LoadedCurriculumPack | undefined {
    return this.packs.get(country.toUpperCase());
  }

  /** Get all valid packs. */
  getAll(): CurriculumPack[] {
    return [...this.packs.values()].map((e) => e.pack);
  }

  /** Get all load errors (for UI surfacing). */
  getErrors(): Array<{ file: string; errors: z.ZodIssue[] }> {
    return this.errors;
  }

  /** Check if a country pack is loaded. */
  has(country: string): boolean {
    return this.packs.has(country.toUpperCase());
  }
}

/**
 * Singleton registry instance for the app. Packs are loaded once at startup.
 */
export const curriculumPackRegistry = new CurriculumPackRegistry(
  join(process.cwd(), 'lib', 'curriculum', 'packs')
);

/**
 * Convenience: load all packs from the default directory and return results.
 */
export const loadCurriculumPacks = () => curriculumPackRegistry.loadAll();
