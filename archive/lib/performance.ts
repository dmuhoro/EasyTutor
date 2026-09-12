export const measurePerformance = async <T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> => {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  console.log(`[PERFORMANCE] ${label}: ${end - start}ms`);
  return result;
};
