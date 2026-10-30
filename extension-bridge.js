/* Page-side bridge. The calculator works normally without the extension. */
(() => {
  'use strict';
  const channel = 'ygg-alchemy-shopping-v1';
  let pending = null;
  function finish(message) {
    if (!pending) return;
    clearTimeout(pending.timer);
    pending.button.disabled = false;
    pending = null;
    toast(message);
  }
  window.addEventListener('message', event => {
    const data = event.data;
    if (event.source !== window || event.origin !== location.origin || data?.channel !== channel || data.type !== 'LIST_RESULT' || data.requestId !== pending?.id) return;
    finish(data.ok ? 'Lista enviada. Abra a categoria no jogo e clique em Preencher loja na extensão.' : 'Não foi possível enviar: ' + String(data.error || 'tente novamente.').slice(0, 200));
  });
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-send-extension]');
    if (!button) return;
    if (pending) { toast('Aguarde o envio da lista atual.'); return; }
    try {
      const isPlan = !!button.closest('#shopping');
      const batch=button.dataset.sendExtension;
      let calculations,owned,label;
      if(!isPlan&&['first','empty'].includes(batch)){
        const info=calculatorWeightBatches()[batch];
        if(!info.attempts){toast('Não cabe um preparo neste lote. Confira o peso e os materiais.');return;}
        calculations=[CraftCore.calculate(selected(),{...state.form,quantity:info.attempts,mode:'attempts'})];owned=info.owned;
        label=selected().name+' · '+(batch==='first'?'1º lote · usar mochila':'Próximos lotes · sem materiais')+' · '+info.attempts+' preparos';
      }else{calculations=isPlan?getPlanCalcs():current?[current]:[];owned=isPlan?state.owned:calculatorOwned();label=isPlan?'Meu plano · '+calculations.length+' receitas':selected().name;}
      if (!calculations.length) { toast('Informe uma receita válida para enviar.'); return; }
      const totals = CraftCore.aggregate(calculations, owned);
      const items = CraftCore.npcShoppingList(totals);
      if (!items.length) { toast('Seu estoque já cobre os materiais vendidos no NPC.'); return; }
      const id = crypto.randomUUID();
      pending = { id, button, timer: setTimeout(() => finish('Extensão não encontrada. Instale em “Baixar extensão Chrome” e recarregue a calculadora.'), 1500) };
      button.disabled = true;
      window.postMessage({ channel, type: 'SEND_LIST', requestId: id, label, items }, location.origin);
    } catch (error) { if (pending) finish('Não foi possível enviar: ' + error.message); else toast('Não foi possível enviar: ' + error.message); }
  });
})();
