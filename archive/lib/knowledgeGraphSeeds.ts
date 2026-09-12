import { KnowledgeNode } from './knowledgeGraphEngine';
import { supabase } from './supabase';
import { logSupabaseError } from './supabaseOps';

/** Standard knowledge graph for mathematics progression */
const MATHEMATICS_GRAPH: KnowledgeNode[] = [
  {
    id: 'math-arithmetic',
    title: 'Arithmetic',
    description: 'Foundations: numbers, operations, basic calculations',
    difficulty_level: 10,
    category: 'topic',
    prerequisites: [],
    estimated_mastery_time_mins: 240,
  },
  {
    id: 'math-fractions',
    title: 'Fractions & Decimals',
    description: 'Understanding parts, ratios, and decimal representation',
    difficulty_level: 20,
    category: 'topic',
    prerequisites: ['math-arithmetic'],
    estimated_mastery_time_mins: 300,
  },
  {
    id: 'math-percentages',
    title: 'Percentages & Ratios',
    description: 'Percent calculations, proportions, and scaling',
    difficulty_level: 25,
    category: 'topic',
    prerequisites: ['math-fractions'],
    estimated_mastery_time_mins: 240,
  },
  {
    id: 'math-algebra-intro',
    title: 'Algebra Fundamentals',
    description: 'Variables, expressions, linear equations, solving for unknowns',
    difficulty_level: 35,
    category: 'topic',
    prerequisites: ['math-arithmetic', 'math-percentages'],
    estimated_mastery_time_mins: 420,
  },
  {
    id: 'math-geometry',
    title: 'Geometry Basics',
    description: 'Shapes, angles, area, perimeter, volume',
    difficulty_level: 30,
    category: 'topic',
    prerequisites: ['math-arithmetic'],
    estimated_mastery_time_mins: 360,
  },
  {
    id: 'math-algebra-advanced',
    title: 'Advanced Algebra',
    description: 'Quadratic equations, polynomials, factoring, exponents',
    difficulty_level: 50,
    category: 'topic',
    prerequisites: ['math-algebra-intro'],
    estimated_mastery_time_mins: 480,
  },
  {
    id: 'math-trigonometry',
    title: 'Trigonometry',
    description: 'Sine, cosine, tangent, angles in triangles, identities',
    difficulty_level: 55,
    category: 'topic',
    prerequisites: ['math-geometry', 'math-algebra-advanced'],
    estimated_mastery_time_mins: 480,
  },
  {
    id: 'math-calculus-intro',
    title: 'Calculus Fundamentals',
    description: 'Limits, continuity, derivatives, rates of change',
    difficulty_level: 70,
    category: 'topic',
    prerequisites: ['math-algebra-advanced', 'math-trigonometry'],
    estimated_mastery_time_mins: 600,
  },
  {
    id: 'math-calculus-advanced',
    title: 'Advanced Calculus',
    description: 'Integrals, differential equations, applications',
    difficulty_level: 80,
    category: 'topic',
    prerequisites: ['math-calculus-intro'],
    estimated_mastery_time_mins: 720,
  },
  {
    id: 'math-linear-algebra',
    title: 'Linear Algebra',
    description: 'Matrices, vectors, systems of equations, eigenvalues',
    difficulty_level: 75,
    category: 'topic',
    prerequisites: ['math-algebra-advanced'],
    estimated_mastery_time_mins: 600,
  },
];

/** Standard knowledge graph for sciences */
const SCIENCE_GRAPH: KnowledgeNode[] = [
  {
    id: 'science-physics-mechanics',
    title: 'Mechanics Fundamentals',
    description: 'Motion, forces, energy, work, power',
    difficulty_level: 35,
    category: 'topic',
    prerequisites: ['math-algebra-intro', 'math-geometry'],
    estimated_mastery_time_mins: 420,
  },
  {
    id: 'science-chemistry-atomic',
    title: 'Atomic Structure & Bonding',
    description: 'Atoms, electrons, periodic table, chemical bonding',
    difficulty_level: 40,
    category: 'topic',
    prerequisites: ['math-arithmetic'],
    estimated_mastery_time_mins: 360,
  },
  {
    id: 'science-chemistry-reactions',
    title: 'Chemical Reactions & Equations',
    description: 'Reaction types, balancing, stoichiometry, rates',
    difficulty_level: 50,
    category: 'topic',
    prerequisites: ['science-chemistry-atomic'],
    estimated_mastery_time_mins: 420,
  },
  {
    id: 'science-biology-cells',
    title: 'Cell Biology',
    description: 'Cell structure, function, photosynthesis, respiration',
    difficulty_level: 35,
    category: 'topic',
    prerequisites: [],
    estimated_mastery_time_mins: 360,
  },
  {
    id: 'science-biology-genetics',
    title: 'Genetics & Evolution',
    description: 'DNA, inheritance, natural selection, adaptation',
    difficulty_level: 50,
    category: 'topic',
    prerequisites: ['science-biology-cells'],
    estimated_mastery_time_mins: 480,
  },
];

/** Programming & Computer Science progression */
const CS_GRAPH: KnowledgeNode[] = [
  {
    id: 'cs-logic',
    title: 'Logic & Boolean Algebra',
    description: 'Truth tables, logical operators, Boolean logic',
    difficulty_level: 25,
    category: 'topic',
    prerequisites: [],
    estimated_mastery_time_mins: 180,
  },
  {
    id: 'cs-programming-basics',
    title: 'Programming Fundamentals',
    description: 'Variables, data types, loops, conditionals, functions',
    difficulty_level: 30,
    category: 'topic',
    prerequisites: ['cs-logic'],
    estimated_mastery_time_mins: 360,
  },
  {
    id: 'cs-data-structures',
    title: 'Data Structures',
    description: 'Arrays, linked lists, stacks, queues, trees, graphs',
    difficulty_level: 50,
    category: 'topic',
    prerequisites: ['cs-programming-basics'],
    estimated_mastery_time_mins: 480,
  },
  {
    id: 'cs-algorithms',
    title: 'Algorithms & Complexity',
    description: 'Sorting, searching, Big O notation, optimization',
    difficulty_level: 60,
    category: 'topic',
    prerequisites: ['cs-data-structures', 'math-algebra-advanced'],
    estimated_mastery_time_mins: 540,
  },
  {
    id: 'cs-oop',
    title: 'Object-Oriented Programming',
    description: 'Classes, inheritance, polymorphism, encapsulation',
    difficulty_level: 45,
    category: 'topic',
    prerequisites: ['cs-programming-basics'],
    estimated_mastery_time_mins: 360,
  },
  {
    id: 'cs-databases',
    title: 'Databases & SQL',
    description: 'Relational databases, queries, indexes, normalization',
    difficulty_level: 50,
    category: 'topic',
    prerequisites: ['cs-programming-basics'],
    estimated_mastery_time_mins: 420,
  },
  {
    id: 'cs-ai-ml',
    title: 'AI & Machine Learning',
    description: 'Supervised learning, neural networks, classification',
    difficulty_level: 75,
    category: 'topic',
    prerequisites: ['cs-algorithms', 'math-linear-algebra', 'math-calculus-intro'],
    estimated_mastery_time_mins: 720,
  },
];

/** Seed a graph into the database */
export async function seedKnowledgeGraph(graph: KnowledgeNode[]): Promise<void> {
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('knowledge_nodes')
      .upsert(graph, { onConflict: 'id' });

    if (error) {
      logSupabaseError('knowledge_nodes', 'seed', error);
      throw error;
    }
  } catch (err) {
    logSupabaseError('knowledge_nodes', 'seed', err);
    throw err;
  }
}

/** Initialize all standard graphs */
export async function initializeAllGraphs(): Promise<void> {
  await seedKnowledgeGraph([...MATHEMATICS_GRAPH, ...SCIENCE_GRAPH, ...CS_GRAPH]);
}

/** Get graph by subject */
export function getGraphBySubject(subject: string): KnowledgeNode[] {
  switch (subject.toLowerCase()) {
    case 'mathematics':
    case 'math':
      return MATHEMATICS_GRAPH;
    case 'science':
    case 'physics':
    case 'chemistry':
    case 'biology':
      return SCIENCE_GRAPH;
    case 'computer science':
    case 'cs':
    case 'programming':
      return CS_GRAPH;
    default:
      return [];
  }
}
