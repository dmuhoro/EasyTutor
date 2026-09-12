export const extractText = async (file: any) => {
  try {
    // prepare for pdf/doc parsing integration

    console.log('[EXTRACTION]', file.name);

    return '';

  } catch (err) {
    console.error('[EXTRACTION ERROR]', err);

    return '';
  }
};
