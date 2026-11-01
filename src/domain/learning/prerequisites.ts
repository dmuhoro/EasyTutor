// Prerequisite / skill dependency engine (pure, deterministic)

export interface Edge { from: string; to: string; }

export function hasCycle(skills: string[], edges: Edge[]): boolean {
  const adj = new Map<string, string[]>();
  for (const s of skills) adj.set(s, []);
  for (const e of edges) { if (!adj.has(e.from) || !adj.has(e.to)) continue; adj.get(e.from)!.push(e.to); }
  const color = new Map<string, 0|1|2>(); // 0 unvisited 1 visiting 2 done
  for (const s of skills) color.set(s, 0);
  function dfs(u: string): boolean {
    color.set(u, 1);
    for (const v of adj.get(u) || []) {
      if (color.get(v) === 1) return true;
      if (color.get(v) === 0 && dfs(v)) return true;
    }
    color.set(u, 2);
    return false;
  }
  for (const s of skills) if (color.get(s) === 0 && dfs(s)) return true;
  return false;
}

export function prerequisitesOf(skill: string, edges: Edge[]): string[] {
  // edges: from prereq -> to dependent. Returns direct prereqs of skill
  return edges.filter(e => e.to === skill).map(e => e.from);
}

export function allPrerequisites(skill: string, edges: Edge[], visited = new Set<string>()): Set<string> {
  const result = new Set<string>();
  for (const p of prerequisitesOf(skill, edges)) {
    if (visited.has(p)) continue;
    visited.add(p);
    result.add(p);
    for (const r of allPrerequisites(p, edges, visited)) result.add(r);
  }
  return result;
}

export function findGaps(targetSkill: string, knownSkills: Set<string>, edges: Edge[]): string[] {
  const needed = allPrerequisites(targetSkill, edges);
  return [...needed].filter(s => !knownSkills.has(s));
}

export function paths(target: string, edges: Edge[], current: Set<string> = new Set()): string[][] {
  // all prerequisite closure chains from leaves to target
  const pres = prerequisitesOf(target, edges);
  if (pres.length === 0) return [[target]];
  const out: string[][] = [];
  for (const p of pres) {
    for (const sub of paths(p, edges)) out.push([...sub, target]);
  }
  return out;
}
