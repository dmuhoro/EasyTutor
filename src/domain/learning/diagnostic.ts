// Diagnostic learning foundation

export interface DiagnosticItem { id: string; skillId: string; difficulty: number; }
export interface DiagnosticResponse { itemId: string; correct: boolean; confidence: number; hints: number; independent: boolean; }
export interface DiagnosticResult { strengths: string[]; gaps: string[]; missingPrereqs: string[]; startingSkills: string[]; confidence: number; }

export function coverage(items: DiagnosticItem[], responses: DiagnosticResponse[]): Record<string, number> {
  const cov: Record<string, number> = {};
  for (const r of responses) {
    const it = items.find(i=>i.id===r.itemId);
    if (!it) continue;
    cov[it.skillId] = (cov[it.skillId]||0) + 1;
  }
  return cov;
}

export function evaluateDiagnostic(items: DiagnosticItem[], responses: DiagnosticResponse[], allPrereqs: (s:string)=>string[]): DiagnosticResult {
  const strengths: string[] = []; const gaps: string[] = []; const missing: string[] = [];
  const bySkill: Record<string, DiagnosticResponse[]> = {};
  for (const r of responses) {
    const it = items.find(i=>i.id===r.itemId); if(!it) continue;
    (bySkill[it.skillId]??=[]).push(r);
  }
  for (const skill of Object.keys(bySkill)) {
    const rs = bySkill[skill];
    const correct = rs.filter(r=>r.correct && r.independent).length;
    if (correct / rs.length >= 0.7) strengths.push(skill); else gaps.push(skill);
    if (correct===0) for (const p of allPrereqs(skill)) if (!missing.includes(p)) missing.push(p);
  }
  return { strengths, gaps, missingPrereqs: missing, startingSkills: gaps.length?gaps:strengths, confidence: responses.length?responses.filter(r=>r.correct).length/responses.length:0 };
}
