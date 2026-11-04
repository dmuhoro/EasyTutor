import { MemoryAccessRequest } from '../../agents/agenticContracts';
import { RuntimeRequest } from '../types';

export class AgentExecutionGovernor {
  validateRuntimeRequest(request: RuntimeRequest): void {
    if (!request.portal_type || !request.canonical_id) {
      throw new Error('Governed runtime request missing portal isolation fields');
    }
  }

  validateMemoryAccess(request: MemoryAccessRequest): void {
    if (!request.namespace.startsWith(request.portal_type)) {
      throw new Error('Memory namespace must remain portal-scoped');
    }
  }
}
