'use strict';
importScripts('shared.js');
(() => {
  const { validateItems } = globalThis.YggShopping;
  const isCalculator = sender => {
    try { const url = new URL(sender.url); return url.origin === 'https://igorkugan.github.io' && url.pathname.startsWith('/ygg-alchemy/') && sender.tab?.id !== undefined; } catch { return false; }
  };
  const isGame = sender => {
    try { return new URL(sender.url).origin === 'https://jogo.yggidle.com.br' && sender.tab?.id !== undefined; } catch { return false; }
  };
  const isPopup = sender => sender.id === chrome.runtime.id && sender.url === chrome.runtime.getURL('popup.html');
  const owns = (state, sender) => state.owner?.tabId === sender.tab?.id && state.owner?.frameId === sender.frameId;
  async function handle(message, sender) {
    if (!message || typeof message.type !== 'string') throw Error('Mensagem inválida.');
    const { shopping = null } = await chrome.storage.local.get('shopping');
    if (message.type === 'SAVE_LIST') {
      if (!isCalculator(sender)) throw Error('Origem não autorizada.');
      const items = validateItems(message.items);
      const label = typeof message.label === 'string' ? message.label.trim().slice(0, 200) : 'Lista de compras';
      const next = { list: { id: crypto.randomUUID(), label, items, createdAt: Date.now() }, request: null, owner: null, filled: [], errors: [] };
      await chrome.storage.local.set({ shopping: next });
      return { ok: true, count: items.length };
    }
    if (['CLEAR_LIST', 'FILL_REQUEST'].includes(message.type)) {
      if (!isPopup(sender)) throw Error('Origem não autorizada.');
      if (message.type === 'CLEAR_LIST') { await chrome.storage.local.set({ shopping: null }); return { ok: true }; }
      if (!shopping) throw Error('Envie uma lista pela calculadora.');
      if (!Number.isSafeInteger(message.tabId) || message.tabId < 0) throw Error('Abra a extensão na aba do jogo.');
      shopping.request = { id: crypto.randomUUID(), tabId: message.tabId, createdAt: Date.now(), status: 'pending' };
      shopping.owner = null; shopping.errors = [];
      delete shopping.enabled;
      await chrome.storage.local.set({ shopping }); return { ok: true };
    }
    if (!['CLAIM_LIST', 'REPORT_FILL'].includes(message.type) || !isGame(sender)) throw Error('Origem ou ação não autorizada.');
    if (!shopping || message.id !== shopping.list.id) throw Error('A lista foi substituída.');
    const request = shopping.request;
    if (!request || request.id !== message.requestId || request.tabId !== sender.tab.id) throw Error('Clique em Preencher loja na extensão, na aba do jogo.');
    if (shopping.owner && !owns(shopping, sender)) throw Error('Este preenchimento pertence a outro frame.');
    if (message.type === 'CLAIM_LIST') {
      if (request.status !== 'pending' || Date.now() - request.createdAt > 5000) throw Error('Clique novamente em Preencher loja.');
      shopping.owner = { tabId: sender.tab.id, frameId: sender.frameId }; request.status = 'running';
      await chrome.storage.local.set({ shopping });
      return { ok: true, list: shopping.list, remaining: shopping.list.items };
    }
    if (request.status !== 'running') throw Error('Este preenchimento já terminou.');
    if (!owns(shopping, sender) || !Array.isArray(message.filled) || message.filled.some(id => !shopping.list.items.some(item => item.id === id))) throw Error('Progresso inválido.');
    if (message.errors !== undefined && (!Array.isArray(message.errors) || message.errors.length > 200 || message.errors.some(text => typeof text !== 'string' || text.length > 300))) throw Error('Relatório inválido.');
    shopping.filled = [...new Set([...shopping.filled, ...message.filled])];
    shopping.errors = (message.errors || []).slice(0, 200);
    request.status = 'done';
    await chrome.storage.local.set({ shopping }); return { ok: true };
  }
  // Serialize claims and updates from multiple game tabs/frames.
  let queue = Promise.resolve();
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    queue = queue.then(() => handle(message, sender)).then(respond, error => respond({ ok: false, error: error.message }));
    return true;
  });
})();
