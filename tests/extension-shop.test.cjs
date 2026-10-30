const {readFileSync}=require('node:fs');const {join}=require('node:path');
const {test}=require('node:test');const assert=require('node:assert/strict');const {JSDOM}=require('jsdom');
const root=join(__dirname,'..'),fixture=readFileSync(join(__dirname,'fixtures/extension-shop.html'),'utf8');
function setup(){const dom=new JSDOM(fixture,{runScripts:'dangerously',url:'https://jogo.yggidle.com.br/applications/api/api.html'});for(const p of ['shared.js','shop-adapter.js'])dom.window.eval(readFileSync(join(root,'chrome-extension',p),'utf8'));return dom;}
const red=[{id:1092,name:'Tubo de Ensaio',quantity:1370},{id:1093,name:'Garrafa de Poção',quantity:685},{id:11621,name:'Xarope Vermelho',quantity:2055},{id:7134,name:'Vasilha de Mistura',quantity:137}];
test('preenche nomes exatos com eventos que atualizam o carrinho sem comprar',async()=>{
 const dom=setup();try{const {document:d,YggShopping:c}=dom.window;const shop=c.findShop(d);assert.equal(shop.id,'shop');
 const result=await c.fillShop(shop,red);assert.deepEqual(Array.from(result.filled),[1092,1093,11621]);assert.deepEqual(Array.from(result.pending),[7134]);
 assert.equal(d.getElementById('tube').value,'1370');assert.equal(d.getElementById('potion').value,'685');assert.equal(d.getElementById('red').value,'2055');
 assert.equal(d.getElementById('blue').value,'0');assert.equal(d.getElementById('unrelated').value,'77');assert.equal(d.getElementById('hiddenTube').value,'9');
 assert.match(d.getElementById('cart').textContent,/red: 2055/);assert.equal(dom.window.purchases,0);
 assert.ok(dom.window.events.includes('tube:input'));assert.ok(dom.window.events.includes('tube:change'));
 }finally{dom.window.close();}
});
test('acentos e caixa são ignorados mas nomes parciais nunca são usados',async()=>{
 const dom=setup();try{const d=dom.window.document,c=dom.window.YggShopping;const result=await c.fillShop(c.findShop(d),[{id:970,name:'alcool',quantity:20},{id:1,name:'Xarope',quantity:10}]);
 assert.deepEqual(Array.from(result.filled),[970]);assert.equal(d.getElementById('alcohol').value,'20');assert.equal(d.getElementById('red').value,'0');assert.equal(d.getElementById('blue').value,'0');
 }finally{dom.window.close();}
});
test('produto duplicado e limites do campo não resultam em preenchimento arbitrário',async()=>{
 const dom=setup();try{const d=dom.window.document,c=dom.window.YggShopping;const duplicate=d.querySelector('.product').cloneNode(true);duplicate.querySelector('input').id='duplicate';d.querySelector('#shop section').append(duplicate);
 d.getElementById('tube').max='999';const result=await c.fillShop(c.findShop(d),red);
 assert.equal(d.getElementById('potion').value,'0');assert.equal(d.getElementById('duplicate').value,'0');assert.equal(d.getElementById('tube').value,'0');assert.ok(result.errors.length>=2);
 assert.deepEqual(Array.from(result.filled),[11621]);
 }finally{dom.window.close();}
});
test('nenhum campo é alterado quando a loja está fechada ou não é reconhecida',async()=>{
 const dom=setup();try{const d=dom.window.document,c=dom.window.YggShopping;d.getElementById('shop').style.display='none';assert.equal(c.findShop(d),null);
 d.getElementById('shop').style.display='';d.getElementById('buy').textContent='Salvar';assert.equal(c.findShop(d),null);
 }finally{dom.window.close();}
});
test('valor rejeitado pelo jogo permanece pendente em vez de ser marcado preenchido',async()=>{
 const dom=setup();try{const d=dom.window.document,c=dom.window.YggShopping;d.getElementById('tube').addEventListener('input',e=>{e.target.value='10';});
 const result=await c.fillShop(c.findShop(d),red.slice(0,1));assert.deepEqual(Array.from(result.filled),[]);assert.deepEqual(Array.from(result.pending),[1092]);assert.equal(result.errors.length,1);
 }finally{dom.window.close();}
});
test('campo ausente ou desabilitado nunca empresta o campo de outro produto',async()=>{
 for(const mode of ['disabled','missing']){
  const dom=setup();try{const d=dom.window.document,c=dom.window.YggShopping;
   for(const id of ['red','blue','alcohol','hiddenTube'])d.getElementById(id).closest('.product').remove();
   if(mode==='disabled')d.getElementById('tube').disabled=true;else d.getElementById('tube').remove();
   const result=await c.fillShop(c.findShop(d),red.slice(0,1));assert.equal(d.getElementById('potion').value,'0');assert.deepEqual(Array.from(result.filled),[]);assert.deepEqual(Array.from(result.pending),[1092]);
  }finally{dom.window.close();}
 }
});
test('aceita o carrinho que substitui o input por outro com a quantidade atualizada',async()=>{
 const dom=setup();try{const d=dom.window.document,c=dom.window.YggShopping;
 d.getElementById('tube').addEventListener('input',event=>{const replacement=event.target.cloneNode(true);replacement.value=event.target.value;event.target.replaceWith(replacement);});
 const result=await c.fillShop(c.findShop(d),red.slice(0,1));assert.deepEqual(Array.from(result.filled),[1092]);assert.equal(d.getElementById('tube').value,'1370');
 }finally{dom.window.close();}
});
