const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function load(storage) {
  const dir = path.join(__dirname, '../huntera');
  assert.ok(fs.existsSync(path.join(dir, 'bosses.js')), 'The boss guide dataset must exist');
  const ctx = vm.createContext({localStorage:storage});
  vm.runInContext(fs.readFileSync(path.join(dir,'bosses.js'),'utf8'),ctx);
  vm.runInContext(fs.readFileSync(path.join(dir,'app.js'),'utf8'),ctx);
  return code=>vm.runInContext(code,ctx);
}
test('all 18 PDF bosses retain healing, estimates, and genuinely unknown values',()=>{
 const run=load();
 assert.equal(run('BOSSES.length'),18);
 assert.equal(run('new Set(BOSSES.map(b=>b.id)).size'),18);
 assert.equal(run('BOSSES.find(b=>b.id==="maxxenius").values.energy'),'-600');
 assert.equal(run('BOSSES.find(b=>b.id==="plagueroot").values.earth'),'-120?');
 assert.equal(run('Object.values(BOSSES.find(b=>b.id==="goshnars-hatred").values).every(v=>v===null)'),true);
 assert.equal(run('BOSSES.every(b=>b.image.startsWith("data:image/png;base64,"))'),true);
 assert.equal(run('modifierType(null)'),'unknown');
 assert.equal(run('modifierType("-120?")'),'heals');
 assert.equal(run('modifierType("0")'),'immune');
});
test('name, recommended element and favorites filters compose without treating unknown as recommended',()=>{
 const run=load();
 assert.equal(run('selectBosses("  OBERON ","holy",new Set(),false).length'),1);
 assert.equal(run('selectBosses("jaul","fire",new Set(),false).length'),0);
 assert.equal(run('selectBosses("","fire",new Set(["faceless-bane"]),true)[0].id'),'faceless-bane');
 assert.equal(run('selectBosses("hatred","fire",new Set(),false).length'),0);
 assert.equal(run('selectBosses("does not exist","",new Set(),false).length'),0);
});
test('bad, obsolete or denied local storage cannot break favorites',()=>{
 for(const value of ['bad json','null','{}','["jaul",7,"missing"]']) {
  const run=load({getItem:()=>value,setItem:()=>{}});
  assert.equal(run('Array.from(readFavorites()).every(id=>BOSSES.some(b=>b.id===id))'),true);
 }
 const run=load({getItem:()=>{throw Error('denied')},setItem:()=>{throw Error('denied')}});
 assert.equal(run('readFavorites().size'),0);
 assert.equal(run('saveFavorites(new Set(["jaul"]))'),false);
});
test('the page exposes all seven selectable elemental filters',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../huntera/index.html'),'utf8');
 const dropdown=html.match(/<select id="element"[\s\S]*?<\/select>/)[0];
 const options=[...dropdown.matchAll(/<option\s+value="([^"]*)"/g)].map(m=>m[1]);
 assert.deepEqual(options,['','physical','holy','death','ice','fire','energy','earth']);
});
