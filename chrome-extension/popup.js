(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let timeout;
  async function render() {
    const { shopping } = await chrome.storage.local.get('shopping');
    $('listSection').hidden = !shopping;
    if (!shopping) { $('status').textContent = 'Envie uma receita ou plano pela calculadora para começar.'; return; }
    const filled = new Set(shopping.filled), count = shopping.list.items.filter(item => filled.has(item.id)).length;
    const request = shopping.request;
    if (request?.status === 'pending') $('status').textContent = Date.now() - request.createdAt < 2000 ? 'Preenchimento solicitado. Aguarde…' : 'A loja não respondeu. Abra a categoria dos materiais na aba do jogo e clique novamente. Se necessário, recarregue o jogo.';
    else if (request?.status === 'running') $('status').textContent = 'Preenchendo os materiais…';
    else if (count === shopping.list.items.length) $('status').textContent = 'Lista preenchida. Confira o carrinho e confirme no jogo.';
    else $('status').textContent = `${count} de ${shopping.list.items.length} materiais preenchidos. Abra a categoria correta no jogo e clique em Preencher loja.`;
    $('listName').textContent = shopping.list.label;
    $('listDate').textContent = 'Enviada em ' + new Date(shopping.list.createdAt).toLocaleString('pt-BR');
    $('items').replaceChildren(...shopping.list.items.map(item => {
      const li = document.createElement('li'), name = document.createElement('span'), amount = document.createElement('strong');
      name.textContent = (filled.has(item.id) ? '✓ ' : '○ ') + item.name;
      amount.textContent = String(item.quantity); li.classList.toggle('filled', filled.has(item.id)); li.append(name, amount); return li;
    }));
    $('errors').textContent = (shopping.errors || []).join(' ');
  }
  async function send(message) {
    const result = await chrome.runtime.sendMessage(message);
    if (!result?.ok) throw Error(result?.error || 'Não foi possível atualizar a lista.');
    await render();
  }
  $('fill').addEventListener('click', async () => {
    $('fill').disabled = true;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!Number.isInteger(tab?.id) || tab.id < 0) throw Error('Abra a extensão na aba do jogo.');
      await send({ type: 'FILL_REQUEST', tabId: tab.id });
      clearTimeout(timeout); timeout = setTimeout(() => render().catch(error => { $('status').textContent = error.message; }), 2200);
    } catch (error) { $('status').textContent = error.message; }
    finally { $('fill').disabled = false; }
  });
  $('clear').addEventListener('click', () => send({ type: 'CLEAR_LIST' }).catch(error => { $('status').textContent = error.message; }));
  chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes.shopping) render().catch(error => { $('status').textContent = error.message; }); });
  render().catch(error => { $('status').textContent = error.message; });
})();
