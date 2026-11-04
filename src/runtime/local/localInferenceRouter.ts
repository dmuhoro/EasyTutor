/**
 * LOCAL INFERENCE ROUTER
 *
 * Routes inference requests to appropriate local engines.
 * Manages inference execution and result aggregation.
 */

import { LocalInferenceEngine, LocalInferenceRequest, LocalInferenceResult } from './localInferenceEngine';
import { RuntimeExecution } from '../types';

export interface InferenceRoute {
  engine: string;
  priority: number;
  capabilities: string[];
  performance_score: number;
}

export class LocalInferenceRouter {
  private inferenceEngine = new LocalInferenceEngine();
  private routes: InferenceRoute[] = [
    {
      engine: 'local_inference',
      priority: 1,
      capabilities: ['lesson', 'quiz', 'reasoning', 'assessment'],
      performance_score: 0.8,
    },
  ];

  async routeInference(execution: RuntimeExecution): Promise<LocalInferenceResult> {
    // Determine request type from execution
    const request = this.buildInferenceRequest(execution);

    // Find best route
    const bestRoute = this.selectBestRoute(request);

    if (!bestRoute) {
      return {
        success: false,
        data: { error: 'No suitable inference route found' },
        confidence: 0,
        source: 'fallback',
        processing_time: 0,
      };
    }

    // Execute inference
    return this.inferenceEngine.executeInference(request);
  }

  // Backwards-compatible alias used by CognitiveExecutionGraph
  async execute(execution: RuntimeExecution): Promise<LocalInferenceResult> {
    return this.routeInference(execution);
  }

  private buildInferenceRequest(execution: RuntimeExecution): LocalInferenceRequest {
    // Map runtime execution to inference request
    const type = this.mapExecutionToType(execution.operation);

    // Normalize learner profile to expected shape with sensible defaults
    const lp = execution.learner_profile as Record<string, any> | undefined;
    const learner_profile = lp
      ? {
          skill_level: typeof lp.skill_level === 'number' ? lp.skill_level : 0,
          learning_style: typeof lp.learning_style === 'string' ? lp.learning_style : 'unknown',
          preferences: Array.isArray(lp.preferences) ? lp.preferences : [],
        }
      : undefined;

    return {
      type,
      canonical_id: execution.canonical_id,
      context: execution.context || {},
      learner_profile,
    };
  }

  private mapExecutionToType(operation?: string): 'lesson' | 'quiz' | 'reasoning' | 'assessment' {
    const op = operation || '';
    if (op.includes('lesson')) return 'lesson';
    if (op.includes('quiz')) return 'quiz';
    if (op.includes('reasoning') || op.includes('explain')) return 'reasoning';
    if (op.includes('assess')) return 'assessment';
    return 'lesson'; // Default
  }

  private selectBestRoute(request: LocalInferenceRequest): InferenceRoute | null {
    // Filter routes that support the request type
    const capableRoutes = this.routes.filter(route =>
      route.capabilities.includes(request.type)
    );

    if (capableRoutes.length === 0) return null;

    // Select route with highest priority and performance
    return capableRoutes.reduce((best, current) => {
      const bestScore = best.priority * best.performance_score;
      const currentScore = current.priority * current.performance_score;

      return currentScore > bestScore ? current : best;
    });
  }

  async getAvailableRoutes(): Promise<InferenceRoute[]> {
    return [...this.routes];
  }

  async updateRoutePerformance(engine: string, performanceScore: number): Promise<void> {
    const route = this.routes.find(r => r.engine === engine);
    if (route) {
      // Update with exponential moving average
      route.performance_score = route.performance_score * 0.9 + performanceScore * 0.1;
    }
  }

  async addRoute(route: InferenceRoute): Promise<void> {
    // Check if route already exists
    const existingIndex = this.routes.findIndex(r => r.engine === route.engine);

    if (existingIndex >= 0) {
      this.routes[existingIndex] = route;
    } else {
      this.routes.push(route);
    }

    // Sort by priority
    this.routes.sort((a, b) => b.priority - a.priority);
  }

  async removeRoute(engine: string): Promise<void> {
    this.routes = this.routes.filter(r => r.engine !== engine);
  }

  async getRoutingAnalytics(): Promise<{
    total_routes: number;
    route_performance: Record<string, number>;
    request_distribution: Record<string, number>;
  }> {
    const routePerformance: Record<string, number> = {};
    this.routes.forEach(route => {
      routePerformance[route.engine] = route.performance_score;
    });

    // Mock request distribution
    const requestDistribution = {
      lesson: 45,
      quiz: 30,
      reasoning: 20,
      assessment: 5,
    };

    return {
      total_routes: this.routes.length,
      route_performance: routePerformance,
      request_distribution: requestDistribution,
    };
  }

  async optimizeRouting(): Promise<void> {
    // Analyze routing patterns and optimize route priorities
    const analytics = await this.getRoutingAnalytics();

    // Adjust priorities based on performance
    this.routes.forEach(route => {
      if (route.performance_score < 0.5) {
        route.priority = Math.max(1, route.priority - 1);
      } else if (route.performance_score > 0.8) {
        route.priority = Math.min(10, route.priority + 1);
      }
    });

    // Re-sort routes
    this.routes.sort((a, b) => b.priority - a.priority);
  }

  async testRoute(route: InferenceRoute, testRequest: LocalInferenceRequest): Promise<{
    success: boolean;
    response_time: number;
    confidence: number;
  }> {
    const startTime = Date.now();

    try {
      const result = await this.inferenceEngine.executeInference(testRequest);
      const responseTime = Date.now() - startTime;

      return {
        success: result.success,
        response_time: responseTime,
        confidence: result.confidence,
      };
    } catch (error) {
      return {
        success: false,
        response_time: Date.now() - startTime,
        confidence: 0,
      };
    }
  }
}