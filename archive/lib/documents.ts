export const uploadDocument = async (file: any) => {
  try {
    console.log('[DOCUMENT]', file.name);

    return {
      success: true
    };

  } catch (err) {
    console.error('[DOCUMENT ERROR]', err);

    return {
      success: false
    };
  }
};
