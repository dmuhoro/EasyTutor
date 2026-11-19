export const generateCloudResponse = async (prompt: string) => {
  try {
    console.log('[CLOUD ROUTE]');
    return '';
  } catch (err) {
    console.error('[CLOUD ERROR]', err);
    return '';
  }
};
