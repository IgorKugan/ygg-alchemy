/* A fresh click in the popup authorizes exactly one attempt in the active tab. */
(() => {
  'use strict';
  const core = globalThis.YggShopping;
  let activeState = null, queue = Promise.resolve();
  async function fillRequest(requestId) {
    const { shopping } = await chrome.storage.local.get('shopping');
    if (!shopping || shopping.request?.id !== requestId || shopping.request.status !== 'pending') return;
    // Consume this click even if the shop is closed. Opening/changing it later
    // must never turn an old click into an automatic fill.
    const shop = core.findShop(document);
    if (!shop) return;
    const id = shopping.list.id;
    const claim = await chrome.runtime.sendMessage({ type: 'CLAIM_LIST', id, requestId });
    if (!claim?.ok) return;
    const result = await core.fillShop(shop, claim.remaining, () => activeState?.list.id === id && activeState.request?.id === requestId);
    if (activeState?.list.id !== id || activeState.request?.id !== requestId) return;
    await chrome.runtime.sendMessage({ type: 'REPORT_FILL', id, requestId, filled: result.filled, errors: result.errors });
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.shopping) return;
    activeState = changes.shopping.newValue;
    const request = activeState?.request;
    if (!request || request.status !== 'pending' || request.id === changes.shopping.oldValue?.request?.id) return;
    queue = queue.then(() => fillRequest(request.id)).catch(error => console.warn('Ygg Alchemy: ' + error.message));
  });
  // Deliberately no initial scan or DOM observer: stored lists and old requests
  // do not run on installation, reload, shop opening or category changes.
})();
