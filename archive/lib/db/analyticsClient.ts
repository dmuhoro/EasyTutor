import { getAuthenticatedUser, queryAnalyticsRows } from '../supabaseOps';

export type UserEventRow = {
  user_id: string;
  event_name: string;
  learning_mode: string | null;
  timestamp: string;
  metadata?: Record<string, any> | null;
};

export interface AnalyticsQueryResult<T> {
  data: T[];
  error: string | null;
}

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

export const fetchUserEvents = async (
  columns: string,
  builder?: (query: any) => any,
): Promise<AnalyticsQueryResult<UserEventRow>> => {
  try {
    const user = await getAuthenticatedUser();
    const { data, error } = await queryAnalyticsRows('user_events', columns, (query: any) => {
      let scoped = query.eq('user_id', user.id);
      if (builder) scoped = builder(scoped);
      return scoped;
    });

    if (error) return { data: [], error: toErrorMessage(error) };
    return { data: (data ?? []) as unknown as UserEventRow[], error: null };
  } catch (error) {
    return { data: [], error: toErrorMessage(error) };
  }
};
