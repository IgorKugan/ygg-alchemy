const {readFileSync}=require('node:fs');const {join}=require('node:path');const {test}=require('node:test');const assert=require('node:assert/strict');const {JSDOM}=require('jsdom');
const root=join(__dirname,'..'),html=readFileSync(join(root,'index.html'),'utf8');
function setup(){const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://igorkugan.github.io/ygg-alchemy/',beforeParse(w){w.localStorage.setItem('ygg-alchemy-v1',JSON.stringify({version:1,selected:'redelixir',form:{quantity:100,mode:'attempts',yield:1,success:100},owned:{redsyrup:999},plan:[],weight:{current:500,max:1000,bowls:100,carried:{tube:200,potionbottle:100},includesMaterials:true,active:true}}));}});dom.window.eval(readFileSync(join(root,'extension-bridge.js'),'utf8'));return dom;}
function transfer(w){const sent=[];w.postMessage=(data,origin)=>{sent.push(data);queueMicrotask(()=>w.dispatchEvent(new w.MessageEvent('message',{source:w,origin,data:{channel:data.channel,type:'LIST_RESULT',requestId:data.requestId,ok:true}})));};return sent;}
const tick=()=>new Promise(r=>setImmediate(r));
test('exporta primeiro lote e próximos lotes com quantidades independentes',async()=>{
 const dom=setup();try{const w=dom.window,d=w.document,sent=transfer(w);
 assert.equal(d.getElementById('weightMaterial-tube')?.value,'200');assert.equal(d.getElementById('weightMaterial-potionbottle')?.value,'100');assert.equal(d.getElementById('quantity').value,'3');
 d.querySelector('[data-send-extension="first"]').click();await tick();assert.deepEqual(JSON.parse(JSON.stringify(sent[0].items)),[{id:11621,name:'Xarope Vermelho',quantity:45}]);assert.match(sent[0].label,/1º lote/);
 d.querySelector('[data-send-extension="empty"]').click();await tick();assert.deepEqual(JSON.parse(JSON.stringify(sent[1].items)),[{id:1092,name:'Tubo de Ensaio',quantity:60},{id:1093,name:'Garrafa de Poção',quantity:30},{id:11621,name:'Xarope Vermelho',quantity:90},{id:7134,name:'Vasilha de Mistura',quantity:6}]);assert.match(sent[1].label,/sem materiais/i);assert.equal(d.getElementById('quantity').value,'3');
 }finally{dom.window.close();}
});
test('editar materiais recalcula e salva a mochila separada do estoque',()=>{
 const dom=setup();try{const w=dom.window,d=w.document,input=d.getElementById('weightMaterial-tube');assert.ok(input);input.value='250';input.dispatchEvent(new w.Event('input',{bubbles:true}));
 const saved=JSON.parse(w.localStorage.getItem('ygg-alchemy-v1'));assert.equal(saved.weight.carried.tube,250);assert.equal(saved.weight.includesMaterials,true);assert.equal(saved.owned.redsyrup,999);assert.equal(d.getElementById('quantity').value,'3');
 }finally{dom.window.close();}
});
test('editar um material de outra receita mantém o campo enquanto se digita',()=>{
 const dom=setup();try{const w=dom.window,d=w.document;d.querySelector('[data-recipe="red"]').click();const input=d.getElementById('weightMaterial-tube');assert.ok(input);input.focus();input.value='';input.dispatchEvent(new w.Event('input',{bubbles:true}));assert.ok(input.isConnected);assert.equal(d.activeElement,input);input.value='20';input.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(JSON.parse(w.localStorage.getItem('ygg-alchemy-v1')).weight.carried.tube,20);
 }finally{dom.window.close();}
});
