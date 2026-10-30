(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  async function render() {
    const { shopping } = await chrome.storage.local.get('shopping');
    $('listSection').hidden = !shopping;
    if (!shopping) { $('status').textContent = 'Envie uma receita ou plano pela calculadora para começar.'; return; }
    const filled = new Set(shopping.filled), count = shopping.list.items.filter(item => filled.has(item.id)).length;
    $('status').textContent = !shopping.enabled ? 'Preenchimento pausado.' : count === shopping.list.items.length ? 'Lista preenchida. Confira o carrinho e confirme no jogo.' : `${count} de ${shopping.list.items.length} materiais preenchidos. Abra a loja e a categoria dos itens pendentes.`;
    $('listName').textContent = shopping.list.label;
    $('listDate').textContent = 'Enviada em ' + new Date(shopping.list.createdAt).toLocaleString('pt-BR');
    $('enabled').checked = shopping.enabled;
    $('items').replaceChildren(...shopping.list.items.map(item => {
      const li = document.createElement('li'), name = document.createElement('span'), amount = document.createElement('strong');
      name.textContent = (filled.has(item.id) ? '✓ ' : '○ ') + item.name;
      amount.textContent = String(item.quantity); li.classList.toggle('filled', filled.has(item.id)); li.append(name, amount); return li;
    }));
    $('errors').textContent = (shopping.errors || []).join(' ');
  }
  async function send(message) {
    try { const result = await chrome.runtime.sendMessage(message); if (!result?.ok) throw Error(result?.error || 'Não foi possível atualizar a lista.'); await render(); }
    catch (error) { $('status').textContent = error.message; }
  }
  $('enabled').addEventListener('change', () => send({ type: 'SET_ENABLED', enabled: $('enabled').checked }));
  $('reset').addEventListener('click', () => send({ type: 'RESET_LIST' }));
  $('clear').addEventListener('click', () => send({ type: 'CLEAR_LIST' }));
  chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes.shopping) render().catch(error => { $('status').textContent = error.message; }); });
  render().catch(error => { $('status').textContent = error.message; });
})();
