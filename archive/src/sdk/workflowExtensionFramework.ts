/**
 * WORKFLOW EXTENSION FRAMEWORK
 * 
 * Provides templates and building blocks for creating complex cognitive workflows.
 */
export interface WorkflowTemplate {
  id: string;
  steps: Array<{
    id: string;
    operation: string;
    description: string;
  }>;
}

export class WorkflowExtensionFramework {
  private static templates: Map<string, WorkflowTemplate> = new Map();

  static registerTemplate(template: WorkflowTemplate): void {
    this.templates.set(template.id, template);
  }

  static getTemplate(id: string): WorkflowTemplate | undefined {
    return this.templates.get(id);
  }
}
