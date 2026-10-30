const {readFileSync}=require('node:fs');const {join}=require('node:path');const {test}=require('node:test');const assert=require('node:assert/strict');const {JSDOM}=require('jsdom');
const harness=require('./helpers/extension-harness.cjs');const root=join(__dirname,'..');const fixture=readFileSync(join(__dirname,'fixtures/extension-shop.html'),'utf8');
const calc={url:'https://igorkugan.github.io/ygg-alchemy/',tab:{id:1},frameId:0},game={url:'https://jogo.yggidle.com.br/applications/api/api.html',tab:{id:2},frameId:3};
const items=[{id:1092,name:'Tubo de Ensaio',quantity:1370},{id:1093,name:'Garrafa de Poção',quantity:685}];
const pause=()=>new Promise(r=>setTimeout(r,300));
function load(h){const dom=new JSDOM(fixture,{runScripts:'dangerously',url:game.url});dom.window.chrome=h.chromeFor(game);for(const f of ['shared.js','shop-adapter.js','shop.js'])dom.window.eval(readFileSync(join(root,'chrome-extension',f),'utf8'));return dom;}
test('detectar abertura preenche uma vez; mutações e recarregar não repetem o lote',async()=>{
 const h=harness();await h.send({type:'SAVE_LIST',items,label:'Elixir'},calc);let dom=load(h);
 try{await pause();const d=dom.window.document;assert.equal(d.getElementById('tube').value,'1370');assert.equal(dom.window.purchases,0);assert.deepEqual(h.data.shopping.filled,[1092,1093]);
 d.getElementById('tube').value='0';d.getElementById('cart').textContent='Compra feita';await pause();assert.equal(d.getElementById('tube').value,'0');
 dom.window.close();dom=load(h);await pause();assert.equal(dom.window.document.getElementById('tube').value,'0');
 await h.send({type:'SAVE_LIST',items:[{...items[0],quantity:50}],label:'Novo lote'},calc);await pause();assert.equal(dom.window.document.getElementById('tube').value,'50');
 }finally{dom.window.close();}
});
test('categorias carregadas depois preenchem pendências e pausa evita alterações',async()=>{
 const h=harness();await h.send({type:'SAVE_LIST',items,label:'Elixir'},calc);
 await h.send({type:'SET_ENABLED',enabled:false},{url:'chrome-extension://test-extension/popup.html',id:'test-extension'});
 const dom=load(h);try{await pause();assert.equal(dom.window.document.getElementById('tube').value,'0');
 await h.send({type:'SET_ENABLED',enabled:true},{url:'chrome-extension://test-extension/popup.html',id:'test-extension'});await pause();assert.equal(dom.window.document.getElementById('tube').value,'1370');
 }finally{dom.window.close();}
});
test('mostrar uma categoria antes oculta preenche os materiais que estavam pendentes',async()=>{
 const h=harness();await h.send({type:'SAVE_LIST',items:[items[0]],label:'Tubo'},calc);const dom=load(h);
 try{const d=dom.window.document;d.getElementById('tube').closest('.product').style.display='none';await pause();assert.equal(d.getElementById('tube').value,'0');
 d.getElementById('tube').closest('.product').style.display='';await pause();assert.equal(d.getElementById('tube').value,'1370');assert.deepEqual(h.data.shopping.filled,[1092]);
 }finally{dom.window.close();}
});
test('mutações frequentes do jogo não adiam o preenchimento indefinidamente',async()=>{
 const h=harness();await h.send({type:'SAVE_LIST',items:[items[0]],label:'Tubo'},calc);const dom=load(h);const w=dom.window;
 const timer=setInterval(()=>{w.document.getElementById('unrelated').setAttribute('class',String(Date.now()));},15);
 try{await pause();assert.equal(w.document.getElementById('tube').value,'1370');}finally{clearInterval(timer);w.close();}
});
test('retoma o lote mesmo se a pausa ocorreu enquanto a aba aguardava a reserva',async()=>{
 const h=harness(),popup={url:'chrome-extension://test-extension/popup.html',id:'test-extension'};
 await h.send({type:'SAVE_LIST',items:[items[0]],label:'Tubo'},calc);
 const chromeFor=h.chromeFor;let intercepted=false;
 h.chromeFor=sender=>{const api=chromeFor(sender),send=api.runtime.sendMessage;api.runtime.sendMessage=async message=>{const result=await send(message);if(message.type==='CLAIM_LIST'&&!intercepted){intercepted=true;await h.send({type:'SET_ENABLED',enabled:false},popup);}return result;};return api;};
 const dom=load(h);try{await pause();assert.equal(dom.window.document.getElementById('tube').value,'0');assert.equal(h.data.shopping.enabled,false);
 await h.send({type:'SET_ENABLED',enabled:true},popup);await pause();assert.equal(dom.window.document.getElementById('tube').value,'1370');
 }finally{dom.window.close();}
});
