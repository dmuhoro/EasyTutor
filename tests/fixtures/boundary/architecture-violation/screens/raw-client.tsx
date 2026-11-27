declare const getSupabaseClient: () => unknown;

export const probe = () => getSupabaseClient();
