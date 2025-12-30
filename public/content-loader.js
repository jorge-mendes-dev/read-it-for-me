// Content script loader - imports the ES module version
(async () => {
  try {
    const api = typeof browser !== 'undefined' ? browser : chrome;
    await import(api.runtime.getURL('content.js'));
  } catch (error) {
    console.error('[RIFM] Failed to load content script:', error);
  }
})();
