(() => {
  'use strict';
  const core = globalThis.YggShopping;
  let timer, busy = false, dirty = false, lastAttempt = '', panel, statusText, latestListId = null, activeState = null;
  const inputIds = new WeakMap(); let nextInputId = 0;
  function showStatus(shop, text) {
    if (!shop) { if (panel) panel.hidden = true; return; }
    if (!panel) {
      panel = document.createElement('div'); panel.id = 'ygg-alchemy-assistant';
      const shadow = panel.attachShadow({ mode: 'closed' });
      const style = document.createElement('style');
      style.textContent = ':host{position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:2147483647;max-width:min(580px,92vw);font:13px/1.5 system-ui,sans-serif;color:#e9f0e4}div{padding:10px 16px;border:1px solid #9ebd7c;background:#183026;box-shadow:0 3px 16px #0008;border-radius:9px}strong{color:#c7e29e}p{margin:2px 0}small{color:#bdcdbd}';
      const box = document.createElement('div'), title = document.createElement('strong'), help = document.createElement('small');
      title.textContent = 'Ygg Alchemy · Compras'; statusText = document.createElement('p'); statusText.setAttribute('role', 'status');
      help.textContent = 'Confira o carrinho e confirme a compra no jogo. Controles no ícone da extensão.';
      box.append(title, statusText, help); shadow.append(style, box); document.documentElement.append(panel);
    }
    panel.hidden = false; statusText.textContent = text;
  }
  function schedule() {
    if (busy) { dirty = true; return; }
    if (!timer) timer = setTimeout(() => { timer = null; scan(); }, 100);
  }
  async function scan() {
    if (busy) { dirty = true; return; }
    busy = true;
    try {
      const { shopping } = await chrome.storage.local.get('shopping');
      latestListId = shopping?.list.id || null; activeState = shopping;
      const shop = core.findShop(document);
      if (!shopping || !shop) { showStatus(null); return; }
      if (!shopping.enabled) { showStatus(shop, 'Preenchimento pausado. Ative pelo ícone da extensão.'); return; }
      const remaining = shopping.list.items.filter(item => !shopping.filled.includes(item.id));
      if (!remaining.length) { showStatus(shop, 'Lista já preenchida. Para outro lote, envie novamente pela calculadora.'); return; }
      const fields = core.shopInputs(shop).map(input => {
        if (!inputIds.has(input)) inputIds.set(input, ++nextInputId);
        return [inputIds.get(input), input.parentElement?.textContent, input.min, input.max, input.disabled, input.readOnly].join(':');
      }).join('|');
      const signature = shopping.list.id + ':' + remaining.map(item => item.id).join(',') + ':' + fields;
      if (signature === lastAttempt) return;
      lastAttempt = signature;
      const claim = await chrome.runtime.sendMessage({ type: 'CLAIM_LIST', id: shopping.list.id });
      if (!claim?.ok) { showStatus(shop, claim?.error || 'Não foi possível preparar a lista.'); return; }
      const result = await core.fillShop(shop, claim.remaining, () => activeState?.list.id === claim.list.id && activeState.enabled);
      const report = await chrome.runtime.sendMessage({ type: 'REPORT_FILL', id: claim.list.id, filled: result.filled, errors: result.errors });
      if (!report?.ok) { showStatus(shop, report?.error || 'A lista mudou. Confira as quantidades.'); return; }
      const count = shopping.filled.length + result.filled.length;
      showStatus(shop, result.errors.length ? result.errors.join(' ') : result.pending.length ? `${count} de ${shopping.list.items.length} materiais preenchidos. Abra a categoria dos itens pendentes; veja a lista no ícone da extensão.` : 'Lista preenchida. Confira os materiais e confirme a compra.');
    } catch (error) {
      if (panel) { panel.hidden = false; statusText.textContent = 'Não foi possível preencher: ' + error.message + '. Recarregue o jogo após atualizar a extensão.'; }
    } finally {
      busy = false;
      if (dirty) { dirty = false; schedule(); }
    }
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.shopping) return;
    activeState = changes.shopping.newValue;
    if (activeState?.list.id !== latestListId || (activeState?.enabled && !changes.shopping.oldValue?.enabled)) lastAttempt = '';
    latestListId = activeState?.list.id || null;
    schedule();
  });
  const observer = new MutationObserver(records => {
    if (records.some(record => record.target !== panel && !panel?.contains(record.target))) schedule();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'style', 'class', 'min', 'max', 'disabled', 'readonly'], characterData: true });
  schedule();
})();
