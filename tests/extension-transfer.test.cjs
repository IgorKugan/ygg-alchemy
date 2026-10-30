const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {runInNewContext}=require('node:vm');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const root=join(__dirname,'..');
const html=readFileSync(join(root,'index.html'),'utf8');
const ctx={};runInNewContext(html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1],ctx);
const plain=v=>JSON.parse(JSON.stringify(v));
function shared(){const c={};runInNewContext(readFileSync(join(root,'chrome-extension/shared.js'),'utf8'),c);return c.YggShopping;}
test('envia apenas faltas NPC, usando estoque e vasilhas carregadas sem abreviar',()=>{
 const c=ctx.CraftCore,r=c.recipes.find(r=>r.id==='redelixir');
 const totals=c.aggregate([c.calculate(r,{quantity:137,mode:'attempts',yield:1,success:100})],{tube:370,bowl:500});
 assert.equal(typeof c.npcShoppingList,'function');
 assert.deepEqual(plain(c.npcShoppingList(totals)),[
  {id:1092,name:'Tubo de Ensaio',quantity:1000},
  {id:1093,name:'Garrafa de Poção',quantity:685},
  {id:11621,name:'Xarope Vermelho',quantity:2055},
 ]);
 assert.deepEqual(plain(c.npcShoppingList({gold:{required:12,missing:12},tube:{required:900000000,missing:900000000}})),[{id:1092,name:'Tubo de Ensaio',quantity:900000000}]);
});
test('valida inteiros positivos, nomes e IDs únicos antes de guardar lista',()=>{
 const c=shared();assert.deepEqual(plain(c.validateItems([{id:1092,name:'Tubo de Ensaio',quantity:900000000}])),[{id:1092,name:'Tubo de Ensaio',quantity:900000000}]);
 for(const quantity of [0,-1,1.2,'100',NaN,Infinity,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>c.validateItems([{id:1092,name:'Tubo',quantity}]));
 for(const items of [[],[{id:0,name:'Tubo',quantity:1}],[{id:1,name:'',quantity:1}],[{id:1,name:'Tubo',quantity:1},{id:1,name:'Outro',quantity:2}],[{id:1,name:'Álcool',quantity:1},{id:2,name:'alcool',quantity:2}]])assert.throws(()=>c.validateItems(items));
});
async function worker(){
 let listener;const data={};const c={URL,crypto:require('node:crypto').webcrypto,console,Date,
 chrome:{runtime:{id:'test-extension',getURL:path=>'chrome-extension://test-extension/'+path,onMessage:{addListener:fn=>listener=fn}},storage:{local:{get:async key=>({[key]:structuredClone(data[key])}),set:async value=>Object.assign(data,structuredClone(value))}}}};
 c.importScripts=()=>runInNewContext(readFileSync(join(root,'chrome-extension/shared.js'),'utf8'),c);
 runInNewContext(readFileSync(join(root,'chrome-extension/background.js'),'utf8'),c);
 return {data,send:(message,sender)=>new Promise(resolve=>listener(message,sender,resolve))};
}
const calc={url:'https://igorkugan.github.io/ygg-alchemy/',tab:{id:1},frameId:0};
const game={url:'https://jogo.yggidle.com.br/applications/api/api.html',tab:{id:2},frameId:3};
const popup={url:'chrome-extension://test-extension/popup.html',id:'test-extension'};
const list={type:'SAVE_LIST',label:'Elixir Vermelho',items:[{id:1092,name:'Tubo de Ensaio',quantity:1000},{id:1093,name:'Garrafa de Poção',quantity:500}]};
test('mensagens estrangeiras e inválidas preservam a lista anterior',async()=>{
 const w=await worker();assert.equal((await w.send(list,calc)).ok,true);const id=w.data.shopping.list.id;
 for(const url of ['https://evil.example/','https://igorkugan.github.io/huntera/','https://igorkugan.github.io/ygg-alchemy-falso/','http://igorkugan.github.io/ygg-alchemy/'])assert.equal((await w.send(list,{...calc,url})).ok,false);
 assert.equal((await w.send({...list,items:[{id:1,name:'Tubo',quantity:-1}]},calc)).ok,false);
 assert.equal(w.data.shopping.list.id,id);
 assert.equal((await w.send({type:'CLEAR_LIST'},game)).ok,false);
});
test('um lote fica vinculado ao primeiro frame e o progresso persiste sem repetir compras',async()=>{
 const w=await worker();await w.send(list,calc);const id=w.data.shopping.list.id;
 assert.equal((await w.send({type:'CLAIM_LIST',id},game)).ok,true);
 assert.equal((await w.send({type:'CLAIM_LIST',id},{...game,tab:{id:3}})).ok,false);
 assert.equal((await w.send({type:'REPORT_FILL',id,filled:[1092],errors:[]},game)).ok,true);
 assert.deepEqual(w.data.shopping.filled,[1092]);
 assert.deepEqual(plain((await w.send({type:'CLAIM_LIST',id},game)).remaining),[{id:1093,name:'Garrafa de Poção',quantity:500}]);
 await w.send({type:'SET_ENABLED',enabled:false},popup);
 assert.equal((await w.send({type:'CLAIM_LIST',id},game)).ok,false);
 await w.send({type:'RESET_LIST'},popup);assert.equal(w.data.shopping.enabled,true);assert.deepEqual(w.data.shopping.filled,[]);
 await w.send(list,calc);assert.notEqual(w.data.shopping.list.id,id);assert.equal(w.data.shopping.owner,null);
 await w.send({type:'CLEAR_LIST'},popup);assert.equal(w.data.shopping,null);
});
test('relatórios de outro frame, IDs desconhecidos e lote antigo são rejeitados',async()=>{
 const w=await worker();await w.send(list,calc);const id=w.data.shopping.list.id;
 await w.send({type:'CLAIM_LIST',id},game);
 for(const [message,sender]of [[{type:'REPORT_FILL',id,filled:[999]},game],[{type:'REPORT_FILL',id,filled:[1092]},{...game,frameId:8}],[{type:'REPORT_FILL',id:'old',filled:[1092]},game]])assert.equal((await w.send(message,sender)).ok,false);
 assert.deepEqual(w.data.shopping.filled,[]);
});
