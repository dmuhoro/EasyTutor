import { MemoryAccessRequest, MemoryRecord } from '../agenticContracts';
import { CognitiveCompressionEngine } from './cognitiveCompressionEngine';
import { EpisodicMemoryStore } from './episodicMemoryStore';
import { ImportanceScoringEngine } from './importanceScoringEngine';
import { ProceduralMemoryStore } from './proceduralMemoryStore';
import { ReflectionEngine } from './reflectionEngine';
import { SemanticMemoryStore } from './semanticMemoryStore';

export class MemoryConsolidationEngine {
  constructor(
    private readonly episodic = new EpisodicMemoryStore(),
    private readonly semantic = new SemanticMemoryStore(),
    private readonly procedural = new ProceduralMemoryStore(),
    private readonly importance = new ImportanceScoringEngine(),
    private readonly reflection = new ReflectionEngine(),
    private readonly compression = new CognitiveCompressionEngine(),
  ) {}

  async consolidate(request: MemoryAccessRequest, learner_id: string, keys: readonly string[]): Promise<{
    compressed_summary: string;
    semantic_count: number;
    procedural_count: number;
  }> {
    const episodicRecords = await this.episodic.list(request, keys);
    const reflections = this.reflection.reflect(episodicRecords);

    const semanticWrites = episodicRecords.map((record, index) =>
      this.semantic.put(
        { ...request, operation: 'consolidate', memory_kind: 'semantic' },
        `semantic-${index}`,
        {
          namespace: request.namespace,
          portal_type: request.portal_type,
          learner_id,
          created_at: new Date().toISOString(),
          importance: this.importance.score(record),
          content: {
            concept: reflections.themes[index] ?? 'retained_concept',
            abstraction: `Derived from episodic memory ${record.memory_id}`,
            supporting_events: [record.memory_id],
          },
          tags: record.tags,
        },
      ),
    );

    const proceduralWrites = reflections.recommendations.map((recommendation, index) =>
      this.procedural.put(
        { ...request, operation: 'consolidate', memory_kind: 'procedural' },
        `procedure-${index}`,
        {
          namespace: request.namespace,
          portal_type: request.portal_type,
          learner_id,
          created_at: new Date().toISOString(),
          importance: 0.7,
          content: {
            procedure: recommendation,
            trigger: reflections.themes[index] ?? 'governed_review',
            steps: ['review', 'practice', 'assess'],
          },
          tags: ['consolidated', ...(episodicRecords[index]?.tags ?? [])],
        },
      ),
    );

    const [semanticRecords, proceduralRecords] = await Promise.all([
      Promise.all(semanticWrites),
      Promise.all(proceduralWrites),
    ]);

    return {
      compressed_summary: this.compression.compress(episodicRecords),
      semantic_count: semanticRecords.length,
      procedural_count: proceduralRecords.length,
    };
  }
}
