import { queueManager } from '../src/infrastructure/platform/queueManager';
import { HybridRuntime } from '../src/runtime/hybridRuntime';
import { Telemetry } from '../src/observability/telemetry';

/**
 * WORKER NODE
 * 
 * An autonomous execution unit that pulls tasks from the platform queue
 * and executes them through the Governed Agent Runtime.
 */
async function startWorker() {
  const workerId = `worker-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[WORKER] Starting cognitive worker node: ${workerId}`);

  Telemetry.emit({
    event: 'WORKER_STARTED',
    source: 'platform',
    operationType: 'worker_lifecycle',
    payload: { worker_id: workerId }
  });

  while (true) {
    try {
      const task = await queueManager.dequeue();
      
      if (task) {
        console.log(`[WORKER ${workerId}] Executing task: ${task.id}`);
        
        // Execute through the governed hybrid runtime
        const result = await HybridRuntime.getInstance().execute(task.request);
        
        // Emit completion telemetry
        Telemetry.emit({
          event: 'WORKER_TASK_COMPLETED',
          source: 'platform',
          operationType: 'worker_execution',
          payload: { 
            worker_id: workerId, 
            task_id: task.id,
            success: result.success 
          }
        });
      } else {
        // Sleep if no tasks
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`[WORKER ${workerId}] Execution failed:`, error);
      
      Telemetry.emit({
        event: 'WORKER_TASK_FAILED',
        source: 'platform',
        operationType: 'worker_execution',
        payload: { 
          worker_id: workerId, 
          error: (error as Error).message 
        }
      });
    }
  }
}

startWorker();
