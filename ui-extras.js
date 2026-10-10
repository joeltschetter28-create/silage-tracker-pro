/* Loads page layout (portrait order, landscape side-by-side) and the searchable Field / Storage pickers. */
(function(){
  const main=document.getElementById('main'),stats=document.getElementById('topStatsGrid'),tg=document.getElementById('truckGrid');
  if(!main||!stats||!tg)return;
  const truckCard=tg.closest('.card');
  // Banners go above the two sections; stats and trucks sit in one split container that can be reordered.
  const split=document.createElement('div');split.id='loadsSplit';split.className='loads-split';
  const sCol=document.createElement('div');sCol.className='split-stats';
  const tCol=document.createElement('div');tCol.className='split-trucks';
  stats.parentNode.insertBefore(split,stats);
  ['licenseBanner','counterAlertBanner'].forEach(id=>{const b=document.getElementById(id);if(b)main.insertBefore(b,split)});
  sCol.appendChild(stats);tCol.appendChild(truckCard);split.appendChild(sCol);split.appendChild(tCol);
  const mqLand=window.matchMedia?matchMedia('(orientation: landscape) and (min-width: 560px)'):null;
  const mqShort=window.matchMedia?matchMedia('(orientation: landscape) and (max-height: 600px)'):null;
  window.isLandscapeLayout=()=>!!(mqLand&&mqLand.matches);
  function applyOrientation(){
    const root=document.documentElement,land=isLandscapeLayout();if(!land)root.classList.remove('ctx-peek');
    root.classList.toggle('land',land);root.classList.toggle('land-short',land&&!!(mqShort&&mqShort.matches));
    applyLoadsLayout();
  }
  window.applyLoadsLayout=function(){
    const land=isLandscapeLayout();
    split.classList.toggle('trucks-first',land?!!state.landTrucksLeft:!!state.layoutTrucksFirst);
    split.style.setProperty('--stats-w',(Number(state.landStatCols)===2?'40%':'27%'));
    if(typeof applyTopStatsLayout==='function')applyTopStatsLayout();
    if(typeof applyTruckLayout==='function')applyTruckLayout();
    if(window.__loadsScroll)window.__loadsScroll.sync();
    if(typeof measureLandSplit==='function')measureLandSplit();
  };
  [mqLand,mqShort].forEach(m=>{if(!m)return;if(m.addEventListener)m.addEventListener('change',applyOrientation);else if(m.addListener)m.addListener(applyOrientation)});
  window.addEventListener('resize',()=>{clearTimeout(window.__layoutT);window.__layoutT=setTimeout(applyOrientation,120)});
  applyOrientation();
})();
function setLayoutPref(key,val){state[key]=val;save();applyLoadsLayout();renderLayoutChoices()}
function renderLayoutChoices(){
  const val={layoutTrucksFirst:state.layoutTrucksFirst?'1':'0',landTrucksLeft:state.landTrucksLeft?'1':'0',landStatCols:String(state.landStatCols||1),landTruckCols:String(state.landTruckCols||2)};
  document.querySelectorAll('[data-layout-key]').forEach(b=>b.classList.toggle('grey',val[b.dataset.layoutKey]!==b.dataset.layoutVal));
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-layout-key]');if(!b)return;const k=b.dataset.layoutKey,v=b.dataset.layoutVal;setLayoutPref(k,k==='landStatCols'||k==='landTruckCols'?Number(v):v==='1')});

// ---------- Searchable Field / Storage pickers ----------
const PICK_ICON='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
const PICK_SORTS=[['recent','Recently Used'],['az','A–Z'],['za','Z–A'],['setup','Setup Order']];
let pickKind=null;
function pickConfig(kind){
  return kind==='field'?{select:'fieldSelect',title:'Choose Field',list:()=>state.fields,used:l=>l.fieldId,sub:f=>{const n=state.loads.filter(l=>l.fieldId===f.id).length;return [f.size?money(f.size)+' acres':'',typeof commoditiesOn==='function'&&commoditiesOn()&&f.commodityId?commodityLabel(f.commodityId):'',f.note||'',n?n+' load'+(n===1?'':'s'):''].filter(Boolean).join(' · ')},search:f=>(f.name+' '+(f.note||'')).toLowerCase()}
    :{select:'storageSelect',title:'Choose Storage',list:()=>state.storages,used:l=>l.storageId,sub:x=>{const n=state.loads.filter(l=>l.storageId===x.id).length;return n?n+' load'+(n===1?'':'s'):''},search:x=>x.name.toLowerCase()};
}
function syncPickButtons(){
  ['field','storage'].forEach(kind=>{const c=pickConfig(kind),sel=document.getElementById(c.select);if(!sel)return;
    let btn=document.getElementById(c.select+'Pick');
    if(!btn){btn=document.createElement('button');btn.type='button';btn.id=c.select+'Pick';btn.className='pick-btn';btn.addEventListener('click',()=>openPicker(kind));sel.insertAdjacentElement('afterend',btn);sel.classList.add('pick-hidden')}
    const o=sel.options[sel.selectedIndex];btn.innerHTML='<span class="pick-btn-text">'+esc(o?o.textContent:(kind==='field'?'No fields':'No storage'))+'</span><span class="pick-btn-icon">'+PICK_ICON+'</span>';
    btn.setAttribute('aria-label',(kind==='field'?'Current field: ':'Storage: ')+(o?o.textContent:''));
  });
}
function openPicker(kind){pickKind=kind;const c=pickConfig(kind);document.getElementById('pickTitle').textContent=c.title;const q=document.getElementById('pickSearch');q.value='';q.placeholder=kind==='field'?'Search fields':'Search storage';renderPicker();document.getElementById('pickModal').classList.add('show')}
function renderPicker(){
  if(!pickKind)return;const c=pickConfig(pickKind),sel=document.getElementById(c.select);
  state.pickSort=state.pickSort||{};const sort=state.pickSort[pickKind]||'recent';
  document.getElementById('pickSorts').innerHTML=PICK_SORTS.map(([k,l])=>'<button type="button" class="pick-sort'+(k===sort?' on':'')+'" data-pick-sort="'+k+'">'+l+'</button>').join('');
  const q=document.getElementById('pickSearch').value.trim().toLowerCase();
  const last={};state.loads.forEach(l=>{const id=c.used(l),t=new Date(l.time).getTime();if(id&&Number.isFinite(t)&&(!last[id]||t>last[id]))last[id]=t});
  let items=c.list().map((x,i)=>({x,i})).filter(o=>!q||c.search(o.x).includes(q));
  const byName=(a,b)=>String(a.x.name).localeCompare(String(b.x.name),undefined,{numeric:true,sensitivity:'base'});
  if(sort==='az')items.sort(byName);else if(sort==='za')items.sort((a,b)=>byName(b,a));else if(sort==='recent')items.sort((a,b)=>((last[b.x.id]||0)-(last[a.x.id]||0))||byName(a,b));
  document.getElementById('pickList').innerHTML=items.length?items.map(o=>{const sub=c.sub(o.x);return '<button type="button" class="pick-item'+(o.x.id===sel.value?' selected':'')+'" data-pick-id="'+o.x.id+'"><b>'+esc(o.x.name)+'</b>'+(sub?'<span>'+esc(sub)+'</span>':'')+'</button>'}).join(''):'<div class="empty">'+(q?'No matches.':'Nothing set up yet. Add some in Setup.')+'</div>';
}
document.addEventListener('input',e=>{if(e.target.id==='pickSearch')renderPicker()});
document.addEventListener('click',e=>{
  const s=e.target.closest('[data-pick-sort]');if(s){state.pickSort=state.pickSort||{};state.pickSort[pickKind]=s.dataset.pickSort;save();renderPicker();return}
  const it=e.target.closest('[data-pick-id]');if(it&&pickKind){const sel=document.getElementById(pickConfig(pickKind).select);sel.value=it.dataset.pickId;sel.dispatchEvent(new Event('change',{bubbles:true}));closeModal('pickModal');pickKind=null;syncPickButtons();return}
  if(e.target.id==='pickModal'||e.target.id==='pickCloseBtn'){closeModal('pickModal');pickKind=null}
});

// ---------- Landscape: fill the screen, and the Field / Storage pull-down ----------
function measureLandSplit(){
  const root=document.documentElement,split=document.getElementById('loadsSplit'),hdr=document.querySelector('header');
  if(hdr)root.style.setProperty('--hdr-h',Math.round(hdr.getBoundingClientRect().height)+'px');
  if(!split)return;
  if(!root.classList.contains('land-short')||!document.querySelector('#main.panel.active')){split.style.removeProperty('--split-h');return}
  const top=split.getBoundingClientRect().top+(window.scrollY||0);
  split.style.setProperty('--split-h',Math.max(200,Math.round(window.innerHeight-top-10))+'px');
}
(function(){
  const root=document.documentElement;let timer=null,sx=0,sy=0,armed=false;
  const landLoads=()=>root.classList.contains('land-short')&&!!document.querySelector('#main.panel.active');
  const pickerOpen=()=>document.getElementById('pickModal')?.classList.contains('show');
  function hideLater(ms){clearTimeout(timer);timer=setTimeout(()=>{if(pickerOpen())return hideLater(2000);root.classList.remove('ctx-peek')},ms)}
  window.peekFieldStorage=function(){if(!landLoads())return;root.classList.add('ctx-peek');hideLater(10000)};
  document.addEventListener('touchstart',e=>{armed=false;if(!landLoads()||e.touches.length!==1)return;if(e.target.closest('.active-context')){if(root.classList.contains('ctx-peek'))hideLater(10000);return}if(e.target.closest('.modal,.side-menu'))return;sx=e.touches[0].clientX;sy=e.touches[0].clientY;armed=true},{passive:true});
  document.addEventListener('touchmove',e=>{if(!armed)return;const dx=e.touches[0].clientX-sx,dy=e.touches[0].clientY-sy;if(window.statDragUntil&&Date.now()<window.statDragUntil){armed=false;return}if(dy>35&&Math.abs(dy)>Math.abs(dx)*1.4){armed=false;peekFieldStorage()}},{passive:true});
  document.addEventListener('wheel',e=>{if(e.deltaY<-20)peekFieldStorage()},{passive:true});
  document.addEventListener('change',e=>{if(e.target.id==='fieldSelect'||e.target.id==='storageSelect'){if(root.classList.contains('ctx-peek'))hideLater(10000)}});
  window.addEventListener('resize',()=>setTimeout(measureLandSplit,150));
  setTimeout(measureLandSplit,0);
})();

// ---------- Share App ----------
function appShareUrl(){const l=location;if(/^https?:$/.test(l.protocol)&&!/^(localhost|127\.|10\.|192\.168\.)/.test(l.hostname))return l.origin+l.pathname;return 'https://dairyguyj.github.io/silage-tracker-pro/index.html'}
function renderShareApp(){const url=appShareUrl(),q=document.getElementById('shareQr'),u=document.getElementById('shareUrl');if(q&&typeof qrSvg==='function'&&q.dataset.url!==url){q.innerHTML=qrSvg(url,'#000','#fff',{logo:'icon-192.png'});q.dataset.url=url}if(u)u.textContent=url}
async function shareAppLink(){const url=appShareUrl();try{if(navigator.share){await navigator.share({title:'Silage Tracker Pro',text:'Silage Tracker Pro',url});return}}catch(e){if(e&&e.name==='AbortError')return}copyAppLink()}
async function copyAppLink(){const url=appShareUrl();try{await navigator.clipboard.writeText(url);showToast('Link copied')}catch(e){uiPrompt('Copy this link',url,{confirmText:'Done'})}}
renderShareApp();
