const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');

const html = readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const context = {};
runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1], context);
const core = context.CraftCore;
const form = { quantity: 3, mode: 'attempts', yield: 10, success: 100 };
const recipe = id => {
  const result = core.recipes.find(r => r.id === id);
  assert.ok(result, `Receita disponível: ${id}`);
  return result;
};

test('planeja os dois elixires juntos e desconta o estoque compartilhado', () => {
  const red = core.calculate(recipe('redelixir'), form);
  const blue = core.calculate(recipe('blueelixir'), form);
  assert.equal(red.expectedOutput, 30);
  assert.equal(blue.expectedOutput, 30);
  const totals = core.aggregate([red, blue], { bottle: 20, potionbottle: 5, redsyrup: 10 });
  assert.equal(totals.bottle.required, 60);
  assert.equal(totals.bottle.missing, 40);
  assert.equal(totals.potionbottle.missing, 25);
  assert.equal(totals.redsyrup.missing, 35);
  assert.equal(totals.bluesyrup.missing, 18);
  assert.equal(totals.bowl.required, 6);
});

test('inclui os xaropes corretos no custo e no limite de peso dos elixires', () => {
  for (const [id, cost, ingredientWeight, attempts] of [
    ['redelixir', 42006, 131, 6],
    ['blueelixir', 63156, 86, 9],
  ]) {
    const r = recipe(id);
    assert.equal(core.craftEconomics(r, form).full.sum, cost);
    const capacity = core.weightCapacity(r, form, { current: 100, max: 1000 });
    assert.equal(capacity.ingredientsPerAttempt, ingredientWeight);
    assert.equal(capacity.outputPerAttempt, 2);
    assert.equal(capacity.attempts, attempts);
    assert.equal(r.shop.name, r.name);
    assert.ok(r.icon.startsWith('data:image/'));
  }
});

test('preserva os elixires em metas salvas e mantém o Elixir Dourado removido', () => {
  const goal = core.normalizeExtras({ route: { goal: [
    { recipeId: 'redelixir', form },
    { recipeId: 'blueelixir', form },
  ] } }).goal;
  assert.equal(goal.length, 2);
  for (const snap of goal) assert.ok(!core.removedRecipeIds.includes(snap.recipeId));
  assert.ok(core.removedRecipeIds.includes('goldelixir'));
});
