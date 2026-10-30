const {readFileSync}=require('node:fs');const {join}=require('node:path');
const {test}=require('node:test');const assert=require('node:assert/strict');const {JSDOM}=require('jsdom');
const root=join(__dirname,'..'),html=readFileSync(join(root,'index.html'),'utf8');
function setup(){const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://igorkugan.github.io/ygg-alchemy/',beforeParse(w){w.localStorage.setItem('ygg-alchemy-v1',JSON.stringify({version:1,selected:'redelixir',form:{quantity:137,mode:'attempts',yield:1,success:100},owned:{tube:370,bowl:500},plan:[]}));}});dom.window.eval(readFileSync(join(root,'extension-bridge.js'),'utf8'));return dom;}
test('a página envia as faltas atuais à extensão e recebe confirmação',async()=>{
 const dom=setup();try{const w=dom.window,d=w.document;let payload;
 w.postMessage=(message,origin)=>{payload=message;assert.equal(origin,w.location.origin);queueMicrotask(()=>w.dispatchEvent(new w.MessageEvent('message',{source:w,origin,data:{channel:message.channel,type:'LIST_RESULT',requestId:message.requestId,ok:true}})));};
 d.querySelector('#recipePurchases [data-send-extension]').click();await new Promise(r=>setImmediate(r));
 assert.deepEqual(JSON.parse(JSON.stringify(payload.items)),[{id:1092,name:'Tubo de Ensaio',quantity:1000},{id:1093,name:'Garrafa de Poção',quantity:685},{id:11621,name:'Xarope Vermelho',quantity:2055}]);
 assert.match(d.getElementById('toast').textContent,/enviad/i);assert.equal(d.querySelector('#recipePurchases [data-send-extension]').disabled,false);
 }finally{dom.window.close();}
});
test('uma extensão ausente não bloqueia a calculadora e oferece instalação',async()=>{
 const dom=setup();try{const d=dom.window.document;d.querySelector('#recipePurchases [data-send-extension]').click();
 await new Promise(r=>setTimeout(r,1700));assert.match(d.getElementById('toast').textContent,/extensão.*instal|instal.*extensão/i);
 const input=d.getElementById('quantity');input.value='20';input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));assert.ok(d.getElementById('calculation').textContent.includes('200'));
 assert.equal(d.getElementById('recipeCount').textContent,'37');
 }finally{dom.window.close();}
});
test('a lista consolidada é enviada em vez da receita selecionada no plano',async()=>{
 const dom=setup();try{const w=dom.window,d=w.document;let payload;d.getElementById('addPlan').click();d.getElementById('addPlan').click();
 w.postMessage=message=>{payload=message;};d.querySelector('#shopping [data-send-extension]').click();
 assert.equal(payload.items.find(i=>i.id===1092).quantity,2370);assert.equal(payload.items.find(i=>i.id===1093).quantity,1370);assert.ok(!payload.items.some(i=>i.id===7134));
 }finally{dom.window.close();}
});
