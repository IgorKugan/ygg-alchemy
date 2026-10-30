const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');

const html = readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const context = {};
runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1], context);
const core = context.CraftCore;

test('abrevia resumos com k e kk sem alterar valores pequenos ou negativos', () => {
  for (const [number, expected] of [
    [0, '0'], [685, '685'], [12.5, '12,5'], [1370, '1,37k'],
    [800000, '800k'], [5000000, '5kk'], [900000000, '900kk'],
    [1000000000, '1kkk'], [-1500, '-1,5k'], [999999, '1kk'],
  ]) assert.equal(core.formatNumber(number), expected);
});

test('quantidades e preços para copiar preservam todos os dígitos', () => {
  for (const value of [0, 1370, 2055, 5000000, 900000000]) {
    const button = core.copyNumber(value);
    assert.ok(button.includes(`data-copy-number="${value}"`));
    assert.ok(button.includes(`>${value}</button>`));
    assert.ok(button.includes('type="button"'));
    assert.equal(core.rawNumber(value), String(value));
  }
});

function uiContext(recipeId = 'redelixir') {
  const elements = new Map();
  const ui = {
    C: core, fmt: core.formatNumber, raw: core.rawNumber, copyNumber: core.copyNumber,
    esc: String, state: { selected: recipeId, form: { quantity: 137, mode: 'attempts', yield: 1, success: 100 }, owned: {}, plan: [] },
    $: id => {
      if (!elements.has(id)) elements.set(id, { value: '20', innerHTML: '', removeAttribute() {}, setAttribute() {} });
      return elements.get(id);
    },
    materialIcon: () => '', renderShopCalculation() {}, renderRelatedPreview() {}, save() {},
  };
  ui.selected = () => core.recipes.find(r => r.id === ui.state.selected);
  ui.readForm = () => ({ ...ui.state.form });
  for (const name of ['sourceLabel', 'materialButton']) runInNewContext(html.split('\n').find(l => l.startsWith(`function ${name}(`)), ui);
  return ui;
}

test('a tabela mostra 1370 e 2055 copiáveis enquanto os pontos do resumo ficam abreviados', () => {
  const ui = uiContext();
  runInNewContext(html.slice(html.indexOf('function baseRenderCalculation('), html.indexOf('function getPlanCalcs(')), ui);
  ui.baseRenderCalculation();
  const result = ui.$('calculation').innerHTML;
  assert.ok(result.includes('data-copy-number="1370"'));
  assert.ok(result.includes('>1370</button>'));
  assert.ok(result.includes('>2055</button>'));
  assert.ok(result.includes('1,37k'));
  assert.equal(ui.state.form.quantity, 137);
});

test('o preço de venda mostra o inteiro completo e o lucro do lote usa k', () => {
  const ui = uiContext('cellular');
  runInNewContext(html.slice(html.indexOf('function renderSalePricing('), html.indexOf("$('profitPercent').addEventListener")), ui);
  const cost = core.craftEconomics(ui.selected(), { quantity: 1, mode: 'attempts', yield: 1, success: 100 });
  ui.renderSalePricing(cost);
  const result = ui.$('saleResults').innerHTML;
  assert.ok(result.includes('>12412</button>'));
  assert.ok(result.includes('>14895</button>'));
  assert.ok(result.includes('2,48k'));
});

test('a lista exportada mantém as quantidades completas sem k nem separador de milhar', () => {
  const ui = uiContext();
  ui.state.plan = [{ recipeId: 'redelixir', form: ui.state.form }];
  ui.getPlanCalcs = () => ui.state.plan.map(s => core.calculate(ui.selected(), s.form));
  ui.shopLocation = () => 'Alquimia';
  ui.priceOf = id => core.unitPrice(id, false);
  runInNewContext(html.split('\n').find(l => l.startsWith('function baseListText(')), ui);
  const result = ui.baseListText();
  assert.ok(result.includes('Tubo de Ensaio: total 1370 | tenho 0 | falta 1370'));
  assert.ok(result.includes('Xarope Vermelho: total 2055'));
  assert.ok(!result.includes('1,37k'));
});

test('clique copia o valor completo e informa quando a cópia falha', async () => {
  const lines = html.split('\n');
  let click;
  const messages = [];
  let copied;
  const ui = {
    navigator: { clipboard: { writeText: async text => { copied = text; } } },
    toast: message => messages.push(message),
    document: { addEventListener: (name, fn) => { click = fn; } },
  };
  runInNewContext(lines.find(line => line.startsWith('async function copyText(')), ui);
  runInNewContext(lines.find(line => line.startsWith("document.addEventListener('click',e=>{const copy=")), ui);
  assert.ok(click, 'A cópia está ligada ao clique');
  click({ target: { closest: selector => selector === '[data-copy-number]'
    ? { dataset: { copyNumber: '900000000' } } : null } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(copied, '900000000');
  assert.ok(messages.at(-1).includes('900000000'));

  ui.navigator.clipboard.writeText = async () => { throw Error('Denied'); };
  ui.document.createElement = () => ({ style: {}, select() {}, remove() {} });
  ui.document.body = { appendChild() {} };
  ui.document.execCommand = () => false;
  await ui.copyText('1370', 'Valor copiado: 1370');
  assert.ok(messages.at(-1).includes('Não foi possível copiar'));
});
