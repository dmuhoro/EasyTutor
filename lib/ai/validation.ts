/**
 * Structural validation contract for AI-generated JSON.
 *
 * This is type-only: it has no runtime import and therefore adds nothing to the
 * login bundle. Zod schemas satisfy it structurally, but the shipped common
 * path uses the dependency-free validators in `lib/schemas.ts`.
 */
export type SchemaValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string } };

export interface ValidationSchema<T> {
  safeParse(value: unknown): SchemaValidationResult<T>;
}
