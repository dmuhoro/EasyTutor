import { z } from 'zod';

const envSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.string().url(),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10),
  EXPO_PUBLIC_ANTHROPIC_API_KEY: z.string().optional(),
});

export interface DiagnosticResult {
  valid: boolean;
  errors?: string[];
}

/**
 * Validates mandatory environment variables at startup.
 */
export const validateEnvironment = (): DiagnosticResult => {
  try {
    envSchema.parse(process.env);
    return { valid: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return {
        valid: false,
        errors: err.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { valid: false, errors: ['Unknown environment validation error'] };
  }
};
