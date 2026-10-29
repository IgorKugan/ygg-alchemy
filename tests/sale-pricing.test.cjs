const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');

const html = readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const context = {};
runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1], context);
const core = context.CraftCore;
const recipe = core.recipes.find(r => r.id === 'cellular');
const form = { quantity: 1, mode: 'attempts', yield: 1, success: 100 };
const price = (profit = 20, profile = {}, options = {}) =>
  core.salePricing(core.craftEconomics(recipe, { ...form, ...profile }, options), profit);

test('mostra o mínimo sem prejuízo e o lucro desejado em zeny inteiro', () => {
  const result = price();
  assert.equal(result.minimum, 12412);
  assert.equal(result.suggested, 14895);
  assert.equal(result.unitProfit, 2483);
  assert.equal(result.lotProfit, 2483);
  assert.equal(price(0).suggested, 12412);
  assert.equal(price(50).suggested, 18618);
});

test('considera rendimento, falhas e quantidade do lote', () => {
  const result = price(20, { yield: 10, success: 50 });
  assert.equal(result.minimum, 2483);
  assert.equal(result.suggested, 2979);
  assert.equal(result.lotProfit, 2483);
  assert.equal(price(20, { quantity: 10 }).lotProfit, 24830);
});

test('aplica Desconto e continua valorizando ingredientes já em estoque', () => {
  const discounted = price(20, {}, { discount: true });
  assert.equal(discounted.minimum, 9434);
  assert.equal(discounted.suggested, 11320);
  const owned = Object.fromEntries(Object.entries(recipe.ingredients).map(([id]) => [id, 1000]));
  assert.equal(price(20, {}, { owned }).minimum, 12412);
});

test('não apresenta um preço mínimo com custos incompletos ou produção zero', () => {
  const red = core.recipes.find(r => r.id === 'red');
  assert.equal(core.salePricing(core.craftEconomics(red, form), 20), null);
  assert.equal(price(20, { quantity: 0 }), null);
});

test('arredonda para cima sem criar um zeny extra por erro de ponto flutuante', () => {
  const r = { ...recipe, ingredients: { bowl: 1 } };
  const cost = core.craftEconomics(r, { ...form, yield: 3 }, { prices: { bowl: 100 } });
  assert.equal(core.salePricing(cost, 20).minimum, 34);
  assert.equal(core.salePricing(cost, 20).suggested, 40);
  const fractional = core.craftEconomics(r, { ...form, success: 1 }, { prices: { bowl: 0.14 } });
  const fractionalPrice = core.salePricing(fractional, 0);
  assert.equal(fractionalPrice.minimum, 14);
  assert(fractionalPrice.unitProfit >= 0);
  assert(!Object.is(fractionalPrice.lotProfit, -0));
});

test('custos zero e lucro inválido não geram resultados negativos ou indefinidos', () => {
  const prices = Object.fromEntries(Object.keys(recipe.ingredients).map(id => [id, 0]));
  assert.equal(price(20, {}, { prices }).minimum, 0);
  assert.equal(price(20, {}, { prices }).suggested, 1);
  assert.equal(price(0, {}, { prices }).suggested, 0);
  for (const invalid of [-1, NaN, Infinity, '', null, 1000001]) {
    assert.throws(() => price(invalid), /lucro/i);
  }
  const huge = Object.fromEntries(Object.keys(recipe.ingredients).map(id => [id, 1e12]));
  assert.throws(() => price(20, { success: 0.0000001 }, { prices: huge }), /preciso/i);
});

test('não aumenta um preço exato por ruído na produção média decimal', () => {
  const result = price(20, { quantity: 100, success: 29 });
  assert.equal(result.minimum, 42800);
  assert.equal(result.suggested, 51360);
  const almostFree = Object.fromEntries(Object.keys(recipe.ingredients).map(id => [id, 0.01]));
  assert.equal(price(0, { yield: 1000000 }, { prices: almostFree }).minimum, 1);
});
