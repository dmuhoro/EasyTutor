import { hasBundledPack, subjectsForCountry, topicsForCountry } from '../lib/curriculum/runtime';

/**
 * Builds the optional DRAFT curriculum index appended to a tutor prompt.
 * This lives in its own module so only learner-facing screens that have a
 * country context import the bundled packs; the login route does not pay for
 * them. Unknown country/subject contributes no text (fail closed), and the
 * label prevents a DRAFT topic index being presented as an official syllabus.
 */
export function buildCurriculumPrompt(country: string | null | undefined, subject?: string): string {
  if (!country || !hasBundledPack(country)) return '';
  const subjects = subjectsForCountry(country);
  if (subjects.length === 0) return '';

  const lines = subjects.map(
    (entry) => `- ${entry.name} [${entry.id}] (${entry.level})`,
  );
  const matched = subjects.find(
    (entry) => entry.id === subject || entry.name.toLowerCase() === subject?.toLowerCase(),
  );
  if (matched) {
    for (const topic of topicsForCountry(country, matched.id)) {
      lines.push(`  - topic: ${topic.title}`);
    }
  }

  return `\nCURRICULUM PACK INDEX (DRAFT — topic names only, NOT an official syllabus):\n${lines.join('\n')}\n`;
}
