/* Work only with visible HTML quantity fields; never submit or click buy. */
(() => {
  'use strict';
  const core = globalThis.YggShopping;
  const norm = core.normalizeName;
  function visible(element) {
    for (let node = element; node?.nodeType === 1; node = node.parentElement) {
      if (node.hidden || node.getAttribute('aria-hidden') === 'true') return false;
      const style = node.ownerDocument.defaultView.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
    }
    return true;
  }
  function quantityInputs(root) {
    return [...root.querySelectorAll('input')].filter(input => ['number', 'text', 'tel'].includes(input.type) && !input.disabled && !input.readOnly && visible(input) && /^\d*$/.test(input.value.trim()));
  }
  function findShop(document) {
    const confirms = [...document.querySelectorAll('button,[role="button"],input[type="submit"],input[type="button"]')].filter(element => visible(element) && /^confirmar compra$/.test(norm(element.textContent || element.value || '')));
    const shops = new Set();
    for (const button of confirms) {
      for (let root = button.parentElement; root && root !== document.body; root = root.parentElement) {
        const text = norm(root.textContent);
        if (/loja\s*[—–-]?\s*suprimentos/.test(text) && text.includes('produtos') && text.includes('sua compra') && quantityInputs(root).length) { shops.add(root); break; }
      }
    }
    return shops.size === 1 ? [...shops][0] : null;
  }
  function nameElements(shop, name) {
    return [...shop.querySelectorAll('*')].filter(element => {
      if (!visible(element) || element.matches('script,style,option,button,input')) return false;
      // Supports a name followed by a separate price element in the same div.
      const directText = [...element.childNodes].filter(node => node.nodeType === 3).map(node => node.textContent).join(' ');
      return norm(directText) === name;
    });
  }
  function inputForName(shop, name) {
    const matches = new Set();
    for (const label of nameElements(shop, name)) {
      for (let row = label, depth = 0; row && row !== shop && depth < 8; row = row.parentElement, depth++) {
        const fields = [...row.querySelectorAll('input')].filter(input => ['number', 'text', 'tel'].includes(input.type));
        if (!fields.length) continue;
        const inputs = quantityInputs(row);
        // A disabled/missing field must never make us borrow a sibling product's
        // input. Other non-control text identifies a different product or a
        // category container, rather than the requested product's own row.
        const foreignName = [...row.querySelectorAll('*')].some(element => {
          if (!visible(element) || element.matches('button,input,script,style') || element.closest('button,[role="button"]')) return false;
          const text = [...element.childNodes].filter(node => node.nodeType === 3).map(node => node.textContent).join(' ');
          const value = norm(text);
          return /[a-z]/.test(value) && value !== name && !/^\d[\d.,]*\s*z(?:eny)?$/.test(value) && !['qtd', 'quantidade'].includes(value);
        });
        if (inputs.length === 1 && !foreignName) matches.add(inputs[0]);
        break;
      }
    }
    return [...matches];
  }
  async function fillShop(shop, items, canContinue = () => true) {
    const filled = [], pending = [], errors = [];
    for (const item of core.validateItems(items)) {
      if (!canContinue() || !shop.isConnected || !visible(shop)) { pending.push(item.id); continue; }
      const inputs = inputForName(shop, norm(item.name));
      if (inputs.length !== 1) {
        pending.push(item.id);
        if (inputs.length > 1) errors.push(item.name + ': mais de um campo encontrado; preencha manualmente.');
        continue;
      }
      const input = inputs[0];
      const min = input.min === '' ? 0 : Number(input.min), max = input.max === '' ? Infinity : Number(input.max);
      const step = !input.step || input.step === 'any' ? 1 : Number(input.step);
      if (item.quantity < min || item.quantity > max || (step > 0 && Math.abs((item.quantity - min) / step - Math.round((item.quantity - min) / step)) > 1e-8) || (input.maxLength >= 0 && String(item.quantity).length > input.maxLength)) {
        pending.push(item.id); errors.push(item.name + ': quantidade fora do limite do campo.'); continue;
      }
      const window = input.ownerDocument.defaultView;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, String(item.quantity));
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
      const afterInput = input.isConnected ? [input] : inputForName(shop, norm(item.name));
      if (afterInput.length === 1) afterInput[0].dispatchEvent(new window.Event('change', { bubbles: true }));
      // Allow synchronous handlers and queued framework updates to settle.
      await new Promise(resolve => window.setTimeout(resolve, 0));
      const finalInputs = inputForName(shop, norm(item.name));
      if (finalInputs.length === 1 && finalInputs[0].value === String(item.quantity)) filled.push(item.id);
      else { pending.push(item.id); errors.push(item.name + ': o jogo não manteve a quantidade; confira manualmente.'); }
    }
    return { filled, pending, errors };
  }
  Object.assign(core, { findShop, fillShop, shopInputs: quantityInputs });
})();
