const {readFileSync}=require('node:fs');const {join}=require('node:path');const {test}=require('node:test');const assert=require('node:assert/strict');const {JSDOM}=require('jsdom');
const harness=require('./helpers/extension-harness.cjs');const root=join(__dirname,'..');const fixture=readFileSync(join(__dirname,'fixtures/extension-shop.html'),'utf8');
const calc={url:'https://igorkugan.github.io/ygg-alchemy/',tab:{id:1},frameId:0},game={url:'https://jogo.yggidle.com.br/applications/api/api.html',tab:{id:2},frameId:3};
const popup={url:'chrome-extension://test-extension/popup.html',id:'test-extension'};
const items=[{id:1092,name:'Tubo de Ensaio',quantity:1370},{id:1093,name:'Garrafa de Poção',quantity:685}];
const tick=()=>new Promise(r=>setTimeout(r,50));
async function until(fn){for(let i=0;i<60&&!fn();i++)await tick();assert.ok(fn(),'expected update did not arrive');}
function load(h,sender=game){const dom=new JSDOM(fixture,{runScripts:'dangerously',url:sender.url});dom.window.chrome=h.chromeFor(sender);const close=dom.window.close.bind(dom.window);dom.window.close=()=>{h.release(dom.window.chrome);close();};for(const f of ['shared.js','shop-adapter.js','shop.js'])dom.window.eval(readFileSync(join(root,'chrome-extension',f),'utf8'));return dom;}
const sendList=h=>h.send({type:'SAVE_LIST',items,label:'Elixir'},calc);
const fill=h=>h.send({type:'FILL_REQUEST',tabId:2},popup);
test('receber lista e abrir ou mudar a loja não preenche sem clicar',async()=>{
 const h=harness();const dom=load(h);try{await sendList(h);await tick();const d=dom.window.document;
 assert.equal(d.getElementById('tube').value,'0');d.getElementById('shop').hidden=true;d.getElementById('shop').hidden=false;d.getElementById('cart').textContent='Alquimia';await tick();assert.equal(d.getElementById('tube').value,'0');assert.equal(h.data.shopping.owner,null);
 await fill(h);await until(()=>h.data.shopping.request.status==='done');assert.equal(d.getElementById('tube').value,'1370');assert.equal(d.getElementById('potion').value,'685');assert.equal(dom.window.purchases,0);
 }finally{dom.window.close();}
});
test('clicar antes de abrir a loja não arma um preenchimento futuro',async()=>{
 const h=harness();const dom=load(h);try{await sendList(h);const d=dom.window.document;d.getElementById('shop').hidden=true;await fill(h);await tick();d.getElementById('shop').hidden=false;await tick();assert.equal(d.getElementById('tube').value,'0');
 await fill(h);await until(()=>h.data.shopping.request.status==='done');assert.equal(d.getElementById('tube').value,'1370');
 }finally{dom.window.close();}
});
test('trocar categoria exige novo clique e preenche os materiais agora visíveis',async()=>{
 const h=harness();const dom=load(h);try{await sendList(h);const d=dom.window.document;d.getElementById('tube').closest('.product').hidden=true;await fill(h);await until(()=>h.data.shopping.request.status==='done');assert.equal(d.getElementById('potion').value,'685');assert.equal(d.getElementById('tube').value,'0');
 d.getElementById('tube').closest('.product').hidden=false;await tick();assert.equal(d.getElementById('tube').value,'0');await fill(h);await until(()=>h.data.shopping.request.status==='done');assert.equal(d.getElementById('tube').value,'1370');
 }finally{dom.window.close();}
});
test('somente a aba escolhida pelo botão pode preencher',async()=>{
 const h=harness();const other=load(h,{...game,tab:{id:8}}),dom=load(h);try{await sendList(h);await fill(h);await until(()=>h.data.shopping.request.status==='done');assert.equal(dom.window.document.getElementById('tube').value,'1370');assert.equal(other.window.document.getElementById('tube').value,'0');
 }finally{dom.window.close();other.window.close();}
});
test('recarregar não repete comando antigo, mas novo clique pode repetir o lote',async()=>{
 const h=harness();await sendList(h);let dom=load(h);try{await fill(h);await until(()=>h.data.shopping.request.status==='done');dom.window.close();dom=load(h);await tick();assert.equal(dom.window.document.getElementById('tube').value,'0');await fill(h);await until(()=>h.data.shopping.request.status==='done');assert.equal(dom.window.document.getElementById('tube').value,'1370');
 }finally{dom.window.close();}
});
test('listas antigas com automático ativado ficam paradas ao atualizar',async()=>{
 const h=harness();await sendList(h);h.data.shopping.enabled=true;h.data.shopping.request=null;const dom=load(h);try{await tick();assert.equal(dom.window.document.getElementById('tube').value,'0');await fill(h);await until(()=>h.data.shopping.request.status==='done');assert.equal(dom.window.document.getElementById('tube').value,'1370');}finally{dom.window.close();}
});
test('reserva confirmada preenche mesmo antes de chegar a notificação de storage',async()=>{
 const h=harness(),factory=h.chromeFor;h.chromeFor=sender=>{const api=factory(sender),add=api.storage.onChanged.addListener;api.storage.onChanged.addListener=fn=>add((changes,area)=>{if(changes.shopping.newValue?.request?.status!=='running')fn(changes,area);});return api;};
 const dom=load(h);try{await sendList(h);await fill(h);await until(()=>h.data.shopping.request.status==='done');assert.equal(dom.window.document.getElementById('tube').value,'1370');}finally{dom.window.close();}
});
