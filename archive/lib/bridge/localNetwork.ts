import Constants from 'expo-constants';

/**
 * Resolves the host developer machine's IP address.
 * Useful for physical devices to reach local services (Ollama, etc.).
 */
export const getHostIP = (): string | null => {
  // 1. Check for explicit environment override
  const envIP = process.env.EXPO_PUBLIC_OLLAMA_HOST;
  if (envIP) return envIP;

  // 2. Extract from Expo hostUri (Standard in development)
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return ip;
  }

  return null;
};

/**
 * Constructs the local AI endpoint URL.
 */
export const getLocalAIEndpoint = (port = 11434): string => {
  const ip = getHostIP();
  if (ip) {
    return `http://${ip}:${port}`;
  }
  return `http://localhost:${port}`;
};
