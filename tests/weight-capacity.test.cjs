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
  assert.equal(result.ingredientsPerAttempt, 141);
  assert.equal(result.outputPerAttempt, 5);
  assert.equal(result.attempts, 5);
  assert.equal(result.purchaseWeight, 805);
  assert.equal(result.finalWeight, 125);
});

test('reserva espaço para o produto completo, inclusive quando a chance configurada é menor', () => {
  const result = capacity('cellular', undefined, { yield: 50, success: 25 });
  assert.equal(result.attempts, 3);
  assert.equal(result.items, 150);
  assert.equal(result.purchaseWeight, 523);
  assert.equal(result.finalWeight, 850);
});

test('aceita exatamente 90% e não arredonda peso extra para baixo', () => {
  assert.equal(capacity('cellular', { current: 195, max: 1000 }).attempts, 5);
  assert.equal(capacity('cellular', { current: 195.1, max: 1000 }).attempts, 4);
  assert.equal(capacity('cellular', { current: 900, max: 1000 }).attempts, 0);
  assert.equal(capacity('cellular', { current: 950, max: 1000 }).attempts, 0);
});

test('todos os crafts consomem exatamente uma vasilha por preparo, inclusive lotes avançados', () => {
  for (const r of core.recipes) {
    assert.equal(r.ingredients.bowl, 1, r.name);
    const result = core.calculate(r, { quantity: 3, mode: 'attempts', yield: 200, success: 100 });
    assert.equal(result.materials.bowl, 3, r.name);
  }
});

test('inclui as vasilhas no limite do exemplo informado pelo usuário', () => {
  const result = capacity('cellular', { current: 281, max: 18930 });
  assert.equal(result.limit, 17037);
  assert.equal(result.attempts, 118);
  assert.equal(result.purchaseWeight, 16919);
  assert.equal(result.finalWeight, 871);
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
  assert.equal(core.recipes.length, 37);
  for (const r of core.recipes) {
    for (const yieldValue of [1, 300]) {
      const result = capacity(r.id, undefined, { yield: yieldValue });
      assert(result.purchaseWeight <= 900);
      assert(result.finalWeight <= 900);
      assert(100 + (result.attempts + 1) * Math.max(result.ingredientsPerAttempt, result.outputPerAttempt) > 900);
    }
  }
});

test('soma as vasilhas existentes e mantém o peso das extras após fabricar', () => {
  const result = capacity('cellular', { current: 100, max: 1000, bowls: 100 });
  assert.equal(result.attempts, 5);
  assert.equal(result.bowlWeight, 100);
  assert.equal(result.startingWeight, 200);
  assert.equal(result.bowlsToBuy, 0);
  assert.equal(result.bowlsRemaining, 95);
  assert.equal(result.purchaseWeight, 900);
  assert.equal(result.finalWeight, 220);
});

test('compra só as vasilhas que faltam sem duplicar o peso das que já tem', () => {
  const result = capacity('cellular', { current: 100, max: 1000, bowls: 3 });
  assert.equal(result.attempts, 5);
  assert.equal(result.bowlsToBuy, 2);
  assert.equal(result.bowlsRemaining, 0);
  assert.equal(result.purchaseWeight, 805);
  assert.equal(result.finalWeight, 125);
});

test('as vasilhas extras limitam o lote também quando o produto é o mais pesado', () => {
  const result = capacity('spore', { current: 100, max: 1000, bowls: 500 }, { yield: 300 });
  assert.equal(result.attempts, 10);
  assert.equal(result.finalWeight, 890);
  assert.equal(result.bowlsRemaining, 490);
  assert.equal(capacity('cellular', { current: 100, max: 1000, bowls: 801 }).attempts, 0);
});

test('recusa quantidade de vasilhas negativa, fracionária ou inválida', () => {
  for (const bowls of [-1, 0.5, NaN, Infinity, '3', 1000000001]) {
    assert.throws(() => capacity('cellular', { current: 100, max: 1000, bowls }), /vasilhas/i);
  }
});

test('mantém todos os estágios do craft até 90% e encontra o maior lote com vasilhas', () => {
  for (const r of core.recipes) for (const bowls of [0, 3, 100, 500]) {
    const result = capacity(r.id, { current: 100, max: 1000, bowls }, { yield: 300 });
    const purchase = n => 100 + bowls + n * (result.ingredientsPerAttempt - 1) + Math.max(0, n - bowls);
    const final = n => purchase(n) + n * (result.outputPerAttempt - result.ingredientsPerAttempt);
    assert.ok(purchase(result.attempts) <= 900, r.id);
    assert.ok(final(result.attempts) <= 900, r.id);
    assert.ok(purchase(result.attempts + 1) > 900 || final(result.attempts + 1) > 900, r.id);
  }
});

test('salva a quantidade de vasilhas e abre planos antigos com zero nesse campo', () => {
  const elements = new Map();
  const ui = { C: core, state: { form: { quantity: 1, mode: 'attempts', yield: 1, success: 100 } },
    renderWeightMaterials() {}, $: id => { if (!elements.has(id)) elements.set(id, {}); return elements.get(id); } };
  for (const name of ['validNumber', 'cleanSnapshot', 'sanitize', 'fillForm']) {
    runInNewContext(html.split('\n').find(line => line.startsWith(`function ${name}(`)), ui);
  }
  const data = { version: 1, plan: [], weight: { current: 100, max: 1000, bowls: 100, active: true } };
  ui.state = ui.sanitize(JSON.parse(JSON.stringify(data)));
  ui.fillForm();
  assert.equal(ui.$('weightBowls').value, 100);
  assert.equal(ui.state.weight.active, true);
  delete data.weight.bowls;
  assert.equal(ui.sanitize(data).weight.bowls, 0);
});

test('usa as vasilhas do personagem na compra sem alterar o estoque salvo', () => {
  const ui = { state: { weight: { active: true, bowls: 3 }, owned: { bowl: 1000 } } };
  runInNewContext(html.split('\n').find(line => line.startsWith('function calculatorOwned(')), ui);
  const calc = core.calculate(recipe('cellular'), { quantity: 5, mode: 'attempts', yield: 1, success: 100 });
  assert.equal(core.aggregate([calc], ui.calculatorOwned()).bowl.missing, 2);
  assert.equal(ui.state.owned.bowl, 1000);
  ui.state.weight.active = false;
  assert.equal(core.aggregate([calc], ui.calculatorOwned()).bowl.missing, 0);
});

test('recalcula o custo da calculadora com as vasilhas carregadas mesmo em outra aba', () => {
  const ui = { view: 'inventory', state: { weight: { active: true, bowls: 3 }, owned: { bowl: 1000 }, prices: {}, discount: false } };
  for (const name of ['calculatorOwned', 'economicsOptions']) {
    runInNewContext(html.split('\n').find(line => line.startsWith(`function ${name}(`)), ui);
  }
  const form = { quantity: 5, mode: 'attempts', yield: 1, success: 100 };
  assert.equal(core.craftEconomics(recipe('cellular'), form, ui.economicsOptions(true)).remaining.sum, 62024);
  assert.equal(core.craftEconomics(recipe('cellular'), form, ui.economicsOptions()).remaining.sum, 62000);
});

test('usa tubos e garrafas da mochila, compra só xarope e mantém todos os extras', () => {
  const result = capacity('redelixir', { current: 100, max: 1000, bowls: 100, carried: { tube: 200, potionbottle: 100 } });
  assert.equal(result.attempts, 3);
  assert.equal(result.carriedWeight, 400);
  assert.equal(result.startingWeight, 500);
  assert.equal(result.purchaseWeight, 815);
  assert.equal(result.finalWeight, 452.6);
  assert.equal(result.toBuy.tube, 0);
  assert.equal(result.toBuy.potionbottle, 0);
  assert.equal(result.toBuy.redsyrup, 45);
  assert.equal(result.remaining.tube, 170);
  assert.equal(result.remaining.potionbottle, 85);
});
test('peso total do jogo inclui materiais uma única vez e calcula próximo lote sem estoque', () => {
  assert.equal(typeof core.weightBatches, 'function');
  const result = core.weightBatches(recipe('redelixir'), {yield:1,success:100}, {current:500,max:1000,bowls:100,carried:{tube:200,potionbottle:100},includesMaterials:true});
  assert.equal(result.first.baseWeight,100);
  assert.equal(result.first.attempts,3);
  assert.equal(result.empty.attempts,6);
  assert.equal(result.empty.purchaseWeight,826);
  assert.equal(result.empty.finalWeight,101.2);
  assert.equal(result.empty.toBuy.tube,60);
  assert.equal(result.empty.toBuy.potionbottle,30);
  assert.equal(result.empty.toBuy.bowl,6);
  assert.equal(result.empty.toBuy.redsyrup,90);
  assert.equal(result.empty.startingWeight,100);
});
test('materiais de outra receita continuam pesando no primeiro lote', () => {
  const result=capacity('redelixir',{current:100,max:1000,bowls:100,carried:{tube:200,potionbottle:100,bluesyrup:10}});
  assert.equal(result.attempts,2);
  assert.equal(result.startingWeight,600);
  assert.equal(result.purchaseWeight,810);
  assert.equal(result.finalWeight,568.4);
  assert.equal(result.remaining.bluesyrup,10);
});
test('recusa estoque da mochila inválido e peso total menor que os materiais', () => {
  for(const tube of [-1,.5,NaN,Infinity,'3',1000000001])assert.throws(()=>capacity('redelixir',{current:100,max:1000,carried:{tube}}),/quantidade|mochila|material/i);
  assert.throws(()=>capacity('redelixir',{current:99,max:1000,carried:{tube:100},includesMaterials:true}),/peso.*materiais|materiais.*peso/i);
});
test('todos os lotes com materiais misturados respeitam os estágios e são máximos',()=>{
 for(const r of core.recipes)for(const y of [1,300]){
  const carried=Object.fromEntries(Object.entries(r.ingredients).filter(([id])=>id!=='bowl').map(([id,n],i)=>[id,n*(i%3)])),bowls=30;
  const bag={...carried,bowl:bowls},unit=id=>core.itemWeight(core.materials[id].id),initial=100+Object.entries(bag).reduce((s,[id,n])=>s+n*unit(id),0);
  const info=capacity(r.id,{current:100,max:1000,bowls,carried},{yield:y});
  if(initial>900){assert.equal(info.attempts,0);continue;}
  const bought=n=>100+Object.keys(r.ingredients).reduce((sum,id)=>sum+Math.max(bag[id]||0,n*r.ingredients[id])*unit(id),0);
  const ingredient=Object.entries(r.ingredients).reduce((sum,[id,n])=>sum+n*unit(id),0),output=y*core.itemWeight(r.itemId);
  for(let j=0;j<=info.attempts;j++)assert.ok(bought(info.attempts)+j*(output-ingredient)<=900+1e-7,r.id+' stage '+j);
  assert.ok(bought(info.attempts+1)>900||bought(info.attempts+1)+(info.attempts+1)*(output-ingredient)>900,r.id+' maximal');
 }
});
