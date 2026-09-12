export const toIsoDayRange = (dateIso?: string): { start: string; end: string } => {
  const day = new Date(dateIso ?? new Date().toISOString());
  day.setHours(0, 0, 0, 0);
  const nextDay = new Date(day);
  nextDay.setDate(nextDay.getDate() + 1);
  return { start: day.toISOString(), end: nextDay.toISOString() };
};

export const safeNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return fallback;
};

