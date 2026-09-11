import { getLocalAIEndpoint } from './bridge/localNetwork';

export const generateOfflineResponse = async (prompt: string) => {
  try {
    const endpoint = getLocalAIEndpoint();
    const res = await fetch(`${endpoint}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen2.5-coder:1.5b',
        prompt,
        stream: false
      })
    });

    const data = await res.json();

    return data.response || '';

  } catch (err) {
    console.error('[OLLAMA ERROR]', err);
    return '';
  }
};
