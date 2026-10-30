(() => {
  'use strict';
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  const parent = element => element.parentElement || element.getRootNode()?.host;
  function deep(root, selector) {
    const result = [...root.querySelectorAll(selector)];
    for (const node of root.querySelectorAll('*')) if (node.shadowRoot) result.push(...deep(node.shadowRoot, selector));
    return [...new Set(result)];
  }
  function visible(element) {
    if (!element?.isConnected) return false;
    for (let node = element; node; node = parent(node)) {
      if (node.hidden || node.getAttribute('aria-hidden') === 'true') return false;
      const style = node.ownerDocument.defaultView.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
    }
    return true;
  }
  const craftTitle = text => /lista.*itens.*(?:fazer|criar|fabricar)|items?.*(?:make|create)|제조|제작/.test(normalize(text));
  const craftText = text => /fabric|cria[cç]|criar|preparar|produzir|craft|manufactur|제조|제작/.test(normalize(text));
  function confirmation(root) {
    const explicit = deep(root, '.ok,[bg$="btn_ok.bmp"],[data-background$="btn_ok.bmp"]');
    const buttons = deep(root, 'button,ui-button,[role="button"],input[type="button"]');
    const candidates = [...new Set([...explicit, ...buttons.filter(e => /^(?:확인|ok|confirmar|fabricar|criar)$/.test(normalize(e.textContent || e.value)))].map(e => e.closest('button,ui-button,[role="button"],.btn') || e))]
      .filter(e => visible(e) && !e.disabled && !e.hasAttribute('disabled') && e.getAttribute('aria-disabled') !== 'true' && !e.classList.contains('cancel'));
    const outer = candidates.filter(e => !candidates.some(other => other !== e && contains(other, e)));
    return outer.length === 1 ? { element: outer[0], root } : null;
  }
  function contains(container, node) { for (let current = node; current; current = parent(current)) if (current === container) return true; return false; }
  function inspect(document, recipe = '', options = {}) {
    const roots = deep(document, '#MakeItemSelection,#MakeArrowSelection,#ItemSelection').filter(visible).filter(root => root.id !== 'ItemSelection' || craftTitle(root.textContent));
    const popups = deep(document, '#win_popup').filter(visible);
    if (roots.length > 1 || popups.length > 1) return { kind: 'blocked', message: 'Há mais de uma janela aberta. Feche as janelas extras antes de iniciar.' };
    let root = roots[0];
    if (!root && popups.length) {
      const popup = popups[0], text = normalize(popup.textContent);
      if (!options.allowDetail || !options.previous || !craftText(text) || /compra|comprar|purchase|vender|trade|cash|zeny/.test(text)) return { kind: 'blocked', message: 'A janela extra não foi reconhecida como fabricação. Confira o jogo.' };
      if (recipe && !text.includes(normalize(recipe))) return { kind: 'blocked', message: 'A confirmação não identifica a receita escolhida.' };
      root = popup;
    }
    if (!root) return { kind: 'absent' };
    const items = deep(root, '.list .item,[role="option"]').filter(visible);
    const confirm = confirmation(root);
    if (!confirm) return { kind: 'blocked', message: 'Botão Confirmar da fabricação não encontrado ou desativado.' };
    const signature = root.id + ':' + normalize(root.textContent) + ':' + items.map(item => item.getAttribute('data-index')).join(',');
    if (items.length) {
      const matching = recipe ? items.filter(item => normalize(item.querySelector('.name')?.textContent || item.textContent) === normalize(recipe)) : [items[0]];
      if (matching.length !== 1) return { kind: 'blocked', message: matching.length ? 'Receita duplicada na janela.' : 'A receita não está na lista disponível: ' + recipe };
      return { kind: 'list', root, signature, item: { element: matching[0], root }, confirm };
    }
    if (!options.allowDetail || !options.previous || (options.previous.root !== root && (!craftText(root.textContent) || (recipe && !normalize(root.textContent).includes(normalize(recipe)))))) return { kind: 'blocked', message: 'Abra a lista de receitas antes de iniciar o Autocraft.' };
    return { kind: 'detail', root, signature, confirm };
  }
  function point(target) {
    const element = target?.element;
    if (!visible(element) || !visible(target.root) || !contains(target.root, element)) throw Error('O botão de fabricação não está mais visível.');
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) throw Error('O botão de fabricação ainda não está visível.');
    let x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
    const document = element.ownerDocument;
    let hit = document.elementFromPoint(x, y);
    while (hit?.shadowRoot?.elementFromPoint) { const inner = hit.shadowRoot.elementFromPoint(x, y); if (!inner || inner === hit) break; hit = inner; }
    if (!hit || !contains(element, hit)) throw Error('O botão de fabricação está coberto por outra janela.');
    let window = document.defaultView;
    try {
      while (window !== window.top) {
        const frame = window.frameElement;
        if (!frame) throw Error('Frame inacessível.');
        if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) throw Error('Botão fora do frame.');
        const bounds = frame.getBoundingClientRect(), sx = bounds.width / frame.offsetWidth, sy = bounds.height / frame.offsetHeight;
        if (!Number.isFinite(sx) || !Number.isFinite(sy) || sx <= 0 || sy <= 0) throw Error('Frame sem dimensões.');
        x = bounds.left + (frame.clientLeft + x) * sx; y = bounds.top + (frame.clientTop + y) * sy;
        window = window.parent;
        const over = window.document.elementFromPoint(x, y);
        if (over !== frame) throw Error('Frame coberto por outra janela.');
      }
    } catch { throw Error('Não foi possível localizar o botão no frame do jogo.'); }
    if (![x, y].every(Number.isFinite) || x < 0 || y < 0 || x >= window.innerWidth || y >= window.innerHeight) throw Error('Botão fora da área visível do jogo.');
    return { x, y };
  }
  function ready(document) { return deep(document, 'canvas,#MakeItemSelection,#MakeArrowSelection,#ItemSelection').some(visible); }
  function focusGame(document) {
    let element = document.activeElement;
    while (element?.shadowRoot?.activeElement) element = element.shadowRoot.activeElement;
    if (element?.matches('input,textarea,select,[contenteditable="true"]')) throw Error('Feche o campo de texto do jogo antes de iniciar.');
    try { let window = document.defaultView; while (window.frameElement) { window.frameElement.focus(); window = window.parent; } } catch { /* The focused game frame may already be correct. */ }
    document.body.tabIndex = -1; document.body.focus({ preventScroll: true });
  }
  globalThis.YggAutoDOM = { inspect, point, ready, focusGame };
})();
