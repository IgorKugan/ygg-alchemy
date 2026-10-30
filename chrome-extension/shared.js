/* Shared validation. No page or network access. */
(() => {
  'use strict';
  const normalizeName = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  function validateItems(items) {
    if (!Array.isArray(items) || !items.length || items.length > 200) throw Error('A lista deve ter entre 1 e 200 materiais.');
    const ids = new Set(), names = new Set();
    return items.map(item => {
      if (!item || !Number.isSafeInteger(item.id) || item.id < 1 || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 160 || !Number.isSafeInteger(item.quantity) || item.quantity < 1) throw Error('Material ou quantidade inválida.');
      const name = item.name.trim(), key = normalizeName(name);
      if (ids.has(item.id) || names.has(key)) throw Error('Material duplicado na lista.');
      ids.add(item.id); names.add(key);
      return { id: item.id, name, quantity: item.quantity };
    });
  }
  globalThis.YggShopping = { normalizeName, validateItems };
})();
