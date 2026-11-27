declare const callAnthropic: (prompt: string) => Promise<string>;

export const ask = () => callAnthropic('probe');
