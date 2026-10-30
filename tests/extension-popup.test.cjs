const {readFileSync}=require('node:fs');const {join}=require('node:path');const {test}=require('node:test');const assert=require('node:assert/strict');const {JSDOM}=require('jsdom');
const harness=require('./helpers/extension-harness.cjs'),root=join(__dirname,'..');
const calc={url:'https://igorkugan.github.io/ygg-alchemy/',tab:{id:1},frameId:0},popup={url:'chrome-extension://test-extension/popup.html',id:'test-extension'};
const tick=()=>new Promise(r=>setImmediate(r));
test('abrir popup apenas mostra a lista; botão solicita o preenchimento na aba ativa',async()=>{
 const h=harness();await h.send({type:'SAVE_LIST',items:[{id:1092,name:'Tubo de Ensaio',quantity:900}],label:'Elixir'},calc);
 const dom=new JSDOM(readFileSync(join(root,'chrome-extension/popup.html'),'utf8'),{runScripts:'outside-only',url:popup.url});
 try{const w=dom.window;w.chrome=h.chromeFor(popup);w.chrome.tabs={query:async options=>{assert.deepEqual(JSON.parse(JSON.stringify(options)),{active:true,currentWindow:true});return[{id:2}];}};
 w.eval(readFileSync(join(root,'chrome-extension/popup.js'),'utf8'));await tick();assert.equal(h.data.shopping.request,null);const button=w.document.getElementById('fill');assert.ok(button,'manual fill button');button.click();await tick();assert.equal(h.data.shopping.request.tabId,2);assert.equal(h.data.shopping.request.status,'pending');assert.match(w.document.getElementById('status').textContent,/solicitado/i);
 }finally{dom.window.close();}
});
