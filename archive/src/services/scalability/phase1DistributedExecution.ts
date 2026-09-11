import { Job } from './contracts';

export class DistributedJobOrchestrator {
  orchestrate(jobs: Job[]): { dispatched: number; deferred: number } {
    const dispatched = jobs.filter((job) => (job.delayMs ?? 0) === 0).length;
    return { dispatched, deferred: jobs.length - dispatched };
  }
}

export class QueueExecutionCoordinator {
  coordinate(jobs: Job[]): { order: string[] } {
    return { order: [...jobs].sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id)).map((j) => j.id) };
  }
}

export class BackgroundTaskRuntime {
  run(tasks: Array<{ id: string; asyncSafe: boolean }>): { accepted: number; rejected: number } {
    const accepted = tasks.filter((t) => t.asyncSafe).length;
    return { accepted, rejected: tasks.length - accepted };
  }
}

export class RetryRecoveryScheduler {
  schedule(jobs: Job[]): { retryQueue: Array<{ id: string; backoffMs: number }> } {
    return {
      retryQueue: jobs
        .filter((job) => job.attempts > 0)
        .map((job) => ({ id: job.id, backoffMs: Math.min(30000, 1000 * Math.pow(2, job.attempts)) })),
    };
  }
}

export class PriorityExecutionBalancer {
  balance(jobs: Job[]): { criticalShare: number } {
    if (jobs.length === 0) return { criticalShare: 0 };
    const critical = jobs.filter((j) => j.priority >= 8).length;
    return { criticalShare: critical / jobs.length };
  }
}
