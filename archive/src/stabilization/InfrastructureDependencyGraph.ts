import { DependencyNode, DependencyType } from './stabilizationContracts';

/**
 * INFRASTRUCTURE DEPENDENCY GRAPH
 * 
 * Manages and validates the complex web of dependencies across the entire cognitive platform.
 */
export class InfrastructureDependencyGraph {
  private nodes: Map<string, DependencyNode> = new Map();

  registerNode(node: DependencyNode): void {
    this.nodes.set(node.id, node);
  }

  validateCircularDependencies(): string[] {
    const visited = new Set<string>();
    const stack = new Set<string>();
    const circles: string[] = [];

    const visit = (id: string, path: string[]) => {
      if (stack.has(id)) {
        circles.push([...path, id].join(' -> '));
        return;
      }
      if (visited.has(id)) return;

      visited.add(id);
      stack.add(id);

      const node = this.nodes.get(id);
      node?.dependencies.forEach(dep => visit(dep.id, [...path, id]));

      stack.delete(id);
    };

    Array.from(this.nodes.keys()).forEach(id => visit(id, []));
    return circles;
  }

  getLayerDependencies(layer: string): DependencyNode[] {
    return Array.from(this.nodes.values()).filter(n => n.layer === layer);
  }
}
