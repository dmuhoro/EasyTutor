export const AI_PROVIDER = {
  ONLINE: 'online',
  OFFLINE: 'offline'
};

export const getAIProvider = () => {
  return AI_PROVIDER.OFFLINE;
};

export const shouldUseCloud = ({
  promptLength,
  complexity
}: {
  promptLength: number;
  complexity: string;
}) => {
  if (complexity === 'high') return true;
  if (promptLength > 4000) return true;
  return false;
};
