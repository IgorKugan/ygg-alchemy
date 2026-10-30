(() => {
  'use strict';
  if (location.origin !== 'https://igorkugan.github.io' || !location.pathname.startsWith('/ygg-alchemy/')) return;
  window.addEventListener('message', async event => {
    const request = event.data;
    if (event.source !== window || event.origin !== location.origin || request?.channel !== 'ygg-alchemy-shopping-v1' || request.type !== 'SEND_LIST' || typeof request.requestId !== 'string' || request.requestId.length > 100) return;
    let response;
    try {
      const items = YggShopping.validateItems(request.items);
      response = await chrome.runtime.sendMessage({ type: 'SAVE_LIST', items, label: request.label });
    } catch (error) { response = { ok: false, error: error.message }; }
    window.postMessage({ channel: 'ygg-alchemy-shopping-v1', type: 'LIST_RESULT', requestId: request.requestId, ok: response?.ok === true, error: response?.error }, location.origin);
  });
})();
