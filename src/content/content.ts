// Content script that runs on all web pages
// Listens for messages from the popup to get selected text

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'getSelectedText') {
    const selectedText = window.getSelection()?.toString() || '';
    // Detect page language from html lang attribute or meta tags
    const pageLang = document.documentElement.lang || 
                     document.querySelector('meta[http-equiv="content-language"]')?.getAttribute('content') ||
                     navigator.language;
    sendResponse({ 
      text: selectedText,
      language: pageLang
    });
  }
  return true;
});

// Optional: Add context menu support for right-click
document.addEventListener('mouseup', () => {
  const selectedText = window.getSelection()?.toString();
  if (selectedText && selectedText.length > 0) {
    // Store the selected text in chrome storage for quick access
    chrome.storage.local.set({ lastSelectedText: selectedText });
  }
});
