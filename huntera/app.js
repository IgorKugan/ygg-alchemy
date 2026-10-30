'use strict';
const ELEMENTS = [
  ['physical','Físico','FÍS','◇'],['holy','Sagrado','SAG','✧'],['death','Morte','MOR','☽'],
  ['ice','Gelo','GEL','❄'],['fire','Fogo','FOG','♨'],['energy','Energia','ENE','ϟ'],['earth','Terra','TER','♧']
];
const FAVORITES_KEY = 'huntera-boss-guide:favorites:v1';
function modifierType(value) {
  if (value === null) return 'unknown';
  const n = Number.parseFloat(value);
  return n < 0 ? 'heals' : n === 0 ? 'immune' : n > 100 ? 'weak' : n < 100 ? 'resistant' : 'neutral';
}
function normalize(value) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(); }
function selectBosses(query, element, favorites, favoritesOnly) {
  const q = normalize(query);
  return BOSSES.filter(b => normalize(b.name).includes(q) && (!element || b.recommended.includes(element)) && (!favoritesOnly || favorites.has(b.id)));
}
function readFavorites() {
  try {
    const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    return new Set(Array.isArray(saved) ? saved.filter(id=>typeof id==='string' && BOSSES.some(b=>b.id===id)) : []);
  } catch { return new Set(); }
}
function saveFavorites(favorites) {
  try { localStorage.setItem(FAVORITES_KEY,JSON.stringify([...favorites])); return true; } catch { return false; }
}
function escapeHTML(text) { return String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function icon(name) {
  const paths={star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>',check:'<path d="m5 12 4 4L19 6"/>',avoid:'<circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/>',chevron:'<path d="m7 10 5 5 5-5"/>',link:'<path d="m10 13 4-4m-7 2-2 2a4 4 0 0 0 6 6l2-2m-2-10 2-2a4 4 0 0 1 6 6l-2 2"/>'};
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
}
function modifierMarkup(key,label,abbr,mark,value) {
  const type=modifierType(value);
  const estimated=value!==null && value.includes('?');
  const display=value===null ? '—' : `${value.replace('?','')}%${estimated?'?':''}`;
  const status=type==='heals'?'CURA':type==='immune'?'IMUNE':'';
  const hint=value===null ? `${label}: sem dados` : `${label}: ${value.replace('?','')}% do dano base${estimated?', estimado':''}${type==='heals'?', cura o boss':type==='immune'?', imune':''}`;
  return `<div class="modifier ${type}" role="group" title="${escapeHTML(hint)}" aria-label="${escapeHTML(hint)}"><span class="element-mark" style="--element:var(--${key})" aria-hidden="true">${mark}</span><span class="element-name" aria-hidden="true">${abbr}</span><span class="modifier-value" aria-hidden="true">${display}</span><span class="modifier-status" aria-hidden="true">${status}</span></div>`;
}
function cardMarkup(b,favorites) {
  const saved=favorites.has(b.id), n=BOSSES.indexOf(b)+1;
  const wikiName=b.name.replace(/’/g,"'").replace(/ /g,'_');
  return `<article class="boss-card" id="${b.id}" aria-labelledby="title-${b.id}"><div class="card-head"><div class="portrait"><img src="${b.image}" alt="" width="59" height="59" loading="lazy"></div><div class="boss-heading"><span class="boss-number">BOSS ${String(n).padStart(2,'0')}</span><h2 id="title-${b.id}">${escapeHTML(b.name)}</h2><div class="mechanic-tag">${escapeHTML(b.mechanic)}</div></div><button class="favorite" type="button" data-favorite="${b.id}" aria-pressed="${saved}" aria-label="${saved?'Remover':'Adicionar'} ${escapeHTML(b.name)} ${saved?'dos':'aos'} favoritos">${icon('star')}</button></div><div class="recommendations"><div class="recommendation use">${icon('check')}<div><span class="label">Usar / priorizar</span><p>${escapeHTML(b.best)}</p></div></div><div class="recommendation avoid">${icon('avoid')}<div><span class="label">Evitar / atenção</span><p>${escapeHTML(b.avoid)}</p></div></div></div><div class="modifiers" role="group" aria-label="Dano recebido por elemento">${ELEMENTS.map(([key,label,abbr,mark])=>modifierMarkup(key,label,abbr,mark,b.values[key])).join('')}</div><details class="details"><summary>Mecânica e observações ${icon('chevron')}</summary><p>${escapeHTML(b.note)}</p><div class="detail-actions"><a class="source" href="https://tibia.fandom.com/wiki/${encodeURIComponent(wikiName)}" target="_blank" rel="noopener noreferrer">Referência: TibiaWiki ↗</a><button class="copy-link" type="button" data-copy="${b.id}">${icon('link')}Copiar link</button></div></details></article>`;
}
function initGuide() {
  const search=document.getElementById('search'),element=document.getElementById('element'),favoritesButton=document.getElementById('favorites'),results=document.getElementById('results'),reset=document.getElementById('reset'),empty=document.getElementById('empty'),toast=document.getElementById('toast');
  let favorites=readFavorites(),favoritesOnly=false,toastTimer;
  const showToast=message=>{clearTimeout(toastTimer);toast.textContent=message;toast.hidden=false;toastTimer=setTimeout(()=>{toast.hidden=true;},3000);};
  function render() {
    const open = new Set([...results.querySelectorAll('details[open]')].map(d=>d.closest('article').id));
    const bosses=selectBosses(search.value,element.value,favorites,favoritesOnly);
    results.innerHTML=bosses.map(b=>cardMarkup(b,favorites)).join('');
    results.querySelectorAll('details').forEach(d=>{d.open=open.has(d.closest('article').id);});
    document.getElementById('results-count').textContent=`${bosses.length} de ${BOSSES.length} bosses${favoritesOnly?' · favoritos':''}`;
    document.getElementById('favorite-count').textContent=favorites.size;
    favoritesButton.setAttribute('aria-pressed',String(favoritesOnly));
    reset.hidden=!search.value && !element.value && !favoritesOnly;
    empty.hidden=bosses.length!==0;
  }
  function clearFilters() { search.value='';element.value='';favoritesOnly=false;render(); }
  search.addEventListener('input',render);element.addEventListener('change',render);
  favoritesButton.addEventListener('click',()=>{favoritesOnly=!favoritesOnly;render();});
  reset.addEventListener('click',clearFilters);document.getElementById('empty-reset').addEventListener('click',clearFilters);
  results.addEventListener('click',async event=>{
    const favorite=event.target.closest('[data-favorite]');
    if(favorite) {
      const id=favorite.dataset.favorite;
      favorites.has(id)?favorites.delete(id):favorites.add(id);
      const persisted=saveFavorites(favorites),wasFiltered=favoritesOnly;
      render();
      const next=results.querySelector(`[data-favorite="${id}"]`);
      if(next)next.focus({preventScroll:true});else if(wasFiltered)favoritesButton.focus({preventScroll:true});
      if(!persisted)showToast('Favorito alterado nesta sessão. O navegador não permitiu salvar.');
    }
    const copy=event.target.closest('[data-copy]');
    if(copy) {
      const url=new URL(location.href);url.hash=copy.dataset.copy;
      try { await navigator.clipboard.writeText(url.href);showToast('Link do boss copiado.'); }
      catch { history.replaceState(null,'',url.href);showToast('O link do boss está na barra de endereço.'); }
    }
  });
  function openHash() {
    let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}
    if(!BOSSES.some(b=>b.id===id))return;
    clearFilters();
    const card=document.getElementById(id);card.querySelector('details').open=true;
    requestAnimationFrame(()=>card.scrollIntoView({block:'start'}));
  }
  window.addEventListener('hashchange',openHash);
  window.addEventListener('storage',event=>{if(event.key===FAVORITES_KEY || event.key===null){favorites=readFavorites();render();}});
  render();openHash();
}
if(typeof document!=='undefined')initGuide();
