const { readFileSync } = require('node:fs');
const { runInNewContext, Script } = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');

const html = readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
for (const [i, script] of [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].entries()) {
  new Script(script[1], { filename: `inline-${i}.js` });
}
const context = {};
runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1], context);
const core = context.CraftCore;
const recipe = id => core.recipes.find(r => r.id === id);
const capacity = (id, weight = { current: 100, max: 1000 }, profile = {}) =>
  core.weightCapacity(recipe(id), { quantity: 1, mode: 'attempts', yield: 1, success: 100, ...profile }, weight);

test('a compra dos ingredientes limita o lote quando eles pesam mais que o produto', () => {
  const result = capacity('cellular');
  assert.equal(result.ingredientsPerAttempt, 140);
  assert.equal(result.outputPerAttempt, 5);
  assert.equal(result.attempts, 5);
  assert.equal(result.purchaseWeight, 800);
  assert.equal(result.finalWeight, 125);
});

test('reserva espaço para o produto completo, inclusive quando a chance configurada é menor', () => {
  const result = capacity('cellular', undefined, { yield: 50, success: 25 });
  assert.equal(result.attempts, 3);
  assert.equal(result.items, 150);
  assert.equal(result.purchaseWeight, 520);
  assert.equal(result.finalWeight, 850);
});

test('aceita exatamente 90% e não arredonda peso extra para baixo', () => {
  assert.equal(capacity('cellular', { current: 200, max: 1000 }).attempts, 5);
  assert.equal(capacity('cellular', { current: 200.1, max: 1000 }).attempts, 4);
  assert.equal(capacity('cellular', { current: 900, max: 1000 }).attempts, 0);
  assert.equal(capacity('cellular', { current: 950, max: 1000 }).attempts, 0);
});

test('considera o rendimento dos lotes avançados e pesos fracionários ou zero', () => {
  assert.equal(capacity('acid', undefined, { yield: 200 }).attempts, 4);
  assert.equal(capacity('spore', undefined, { yield: 300 }).attempts, 26);
  assert.equal(capacity('chemical').attempts, 100);
  assert.equal(core.itemWeight(6212), 0.1);
  assert.equal(core.itemWeight(1280437), 0);
});

test('usa o peso do servidor em vez do texto padrão divergente', () => {
  assert.equal(core.itemWeight(1093), 1);
  assert.equal(core.itemWeight(715), 0.1);
  assert.equal(core.itemWeight(716), 0.1);
  assert.equal(core.itemWeight(717), 0.1);
  assert.equal(core.itemWeight(100231), 3);
  assert.equal(capacity('red').attempts, 114);
});

test('sinaliza produtos com peso de referência e recusa pesos desconhecidos', () => {
  assert.equal(capacity('whiteSpecial').reference, true);
  assert.equal(capacity('cellular').reference, false);
  assert.equal(core.itemWeight(-1), null);
  assert.throws(() => core.weightCapacity({ ...recipe('red'), itemId: -1 },
    { quantity: 1, mode: 'attempts', yield: 1, success: 100 }, { current: 0, max: 1000 }), /peso/i);
});

test('recusa capacidade ausente, entradas inválidas e peso atual acima da capacidade total', () => {
  for (const weight of [null, { current: 0, max: 0 }, { current: -1, max: 1000 },
    { current: 1001, max: 1000 }, { current: NaN, max: 1000 },
    { current: 0, max: Infinity }, { current: '', max: 1000 }, { current: 0.01, max: 1000 }]) {
    assert.throws(() => capacity('cellular', weight), /peso|capacidade/i);
  }
});

test('todas as receitas têm pesos e o maior lote não supera o limite', () => {
  assert.equal(core.recipes.length, 35);
  for (const r of core.recipes) {
    for (const yieldValue of [1, 300]) {
      const result = capacity(r.id, undefined, { yield: yieldValue });
      assert(result.purchaseWeight <= 900);
      assert(result.finalWeight <= 900);
      assert(100 + (result.attempts + 1) * Math.max(result.ingredientsPerAttempt, result.outputPerAttempt) > 900);
    }
  }
});
