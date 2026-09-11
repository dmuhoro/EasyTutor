/**
 * Utility for batching array items into smaller chunks for processing.
 */

export const getBatches = <T>(items: T[], batchSize: number): T[][] => {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
};

/**
 * Sequential batch processor to prevent overloading resources.
 */
export const processInBatches = async <T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>
): Promise<R[]> => {
  const batches = getBatches(items, batchSize);
  const results: R[] = [];

  for (const batch of batches) {
    const batchResults = await processor(batch);
    results.push(...batchResults);
  }

  return results;
};
