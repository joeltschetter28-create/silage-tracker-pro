// While the menu is open the page behind is pinned in place (phones ignore overflow:hidden for touch scrolling),
// so a swipe on the menu scrolls the menu, not the page. Closing puts the page back exactly where it was.
let menuLockY=null;
function lockPageScroll(){if(menuLockY!==null)return;menuLockY=window.scrollY||0;const b=document.body.style;b.position='fixed';b.top=(-menuLockY)+'px';b.left='0';b.right='0';b.width='100%'}
function unlockPageScroll(){if(menuLockY===null)return;const y=menuLockY;menuLockY=null;const b=document.body.style;b.position='';b.top='';b.left='';b.right='';b.width='';window.scrollTo(0,y)}
function closeMenu(){unlockPageScroll();document.documentElement.classList.remove('menu-open');document.getElementById('sideMenu')?.classList.remove('open');document.getElementById('menuBackdrop')?.classList.remove('open')}
function openMenu(){lockPageScroll();document.documentElement.classList.add('menu-open');document.getElementById('sideMenu')?.classList.add('open');document.getElementById('menuBackdrop')?.classList.add('open')}
// Panels a driver shouldn't need day-to-day. Only Loads (main) stays open; everything else,
// Reports included, needs the slide. Unlocking is in-memory only (never saved), so it always
// resets on reload and re-locks the moment navigation returns to the Loads page.
const DRIVER_MODE_LOCKED=['setup','settings','appearance','trash','archive','truckEdit','reports','today'];
let driverModeUnlocked=false;
function switchTab(name,addHistory=true){
  closeChangelogModal();
  if(!PAGE_TITLES[name])name=HOME_PAGE;
  if(document.querySelector('.panel.active')?.id==='today'&&name!=='today')todaySelectedDate=null;
  if(state.driverMode&&DRIVER_MODE_LOCKED.includes(name)&&!driverModeUnlocked){
    openSlideUnlockModal(()=>{driverModeUnlocked=true;switchTab(name,addHistory)});
    return;
  }
  if(name===HOME_PAGE)driverModeUnlocked=false;
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
  document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id===name));
  const pt=document.getElementById('pageTitle');if(pt)pt.textContent=PAGE_TITLES[name]||name;
  if(window.__loadsScroll)window.__loadsScroll.sync();
  if(name==='reports'&&typeof resetReportTabs==='function')resetReportTabs();
  closeMenu();
  if(addHistory)history.pushState({silageTrackerPage:name},'',location.href);
  render();
}
function commodityNameTaken(name,exceptId){return (state.commodities||[]).some(c=>c.id!==exceptId&&c.name.toLowerCase()===name.toLowerCase())}
function createCommodity(name){name=String(name||'').trim();if(!name)return null;if(commodityNameTaken(name)){alert('There is already a commodity called '+name+'.');return null}const c={id:uid(),name,order:(state.commodities||[]).length};state.commodities=state.commodities||[];state.commodities.push(c);return c}
async function editCommodity(id){if(licenseGraceInfo().locked)return requireActivation(()=>editCommodity(id));const c=commodityById(id);if(!c)return;const n=(await uiPrompt('Commodity name',c.name,{confirmText:'Save'}));if(n===null)return;const name=n.trim();if(!name)return alert('Enter a commodity name.');if(commodityNameTaken(name,id))return alert('There is already a commodity called '+name+'.');c.name=name;save();render();showToast('Commodity renamed')}
async function deleteCommodity(id){if(licenseGraceInfo().locked)return requireActivation(()=>deleteCommodity(id));const c=commodityById(id);if(!c)return;const fields=state.fields.filter(f=>f.commodityId===id),weights=(state.loadWeightHistory||[]).filter(r=>r.commodityId===id);const detail=[fields.length?fields.length+' field(s) will lose their commodity':'',weights.length?weights.length+' truck weight(s) on its tab will be deleted':''].filter(Boolean).join('\n');if(!(await uiConfirm('Delete the commodity "'+c.name+'"?'+(detail?'\n\n'+detail:'')+'\n\nLoads stay in history but will no longer carry a commodity.')))return;state.commodities=state.commodities.filter(x=>x.id!==id);state.fields.forEach(f=>{if(f.commodityId===id)f.commodityId=''});state.loadWeightHistory=(state.loadWeightHistory||[]).filter(r=>r.commodityId!==id);if(truckWeightTabCommodityId===id)truckWeightTabCommodityId='';save();render();showToast('Commodity deleted')}
function moveCommodity(id,dir){const i=state.commodities.findIndex(c=>c.id===id),j=i+dir;if(i<0||j<0||j>=state.commodities.length)return;[state.commodities[i],state.commodities[j]]=[state.commodities[j],state.commodities[i]];state.commodities.forEach((c,k)=>c.order=k);save();render()}
// Weighbridge yards weigh every load, so the truck button asks for the figure instead
// of assuming the truck's assigned weight. The reading in use is shown in the same
// prompt because the sample and the weighbridge ticket arrive together, and a changed
// reading is saved as a proper reading from this load's time rather than stamped on
// the one load, so the loads after it inherit it too.
function setActiveBtnPair(activeId,inactiveId){document.getElementById(activeId).className='btn small blue';document.getElementById(inactiveId).className='btn small grey'}
function recalcWeighLoadNet(){
  const gross=Number(document.getElementById('weighLoadGross').value)||0;
  const tare=Number(document.getElementById('weighLoadTare').value)||0;
  const net=gross-tare;
  document.getElementById('weighLoadNetComputed').value=net>0?String(Number(net.toFixed(2))):'';
}
function renderWeighLoadFields(){
  const unit=state.weighLoadUnit,mode=state.weighLoadEntryMode;
  const netGroup=document.getElementById('weighLoadNetGroup'),grossGroup=document.getElementById('weighLoadGrossGroup');
  if(mode==='gross'){
    netGroup.style.display='none';grossGroup.style.display='block';
    document.getElementById('weighLoadGrossLabel').textContent='Gross Weight ('+unit+')';
    document.getElementById('weighLoadTareLabel').textContent='Tare Weight ('+unit+')';
    document.getElementById('weighLoadNetComputedLabel').textContent='Net Weight ('+unit+')';
  }else{
    netGroup.style.display='block';grossGroup.style.display='none';
    document.getElementById('weighLoadWeightLabel').textContent='Net Weight ('+unit+')';
  }
}
function openWeighLoadGear(){
  if(state.weighLoadUnit==='kg')setActiveBtnPair('weighUnitKgBtn','weighUnitLbBtn');else setActiveBtnPair('weighUnitLbBtn','weighUnitKgBtn');
  if(state.weighLoadEntryMode==='net')setActiveBtnPair('weighModeNetBtn','weighModeGrossBtn');else setActiveBtnPair('weighModeGrossBtn','weighModeNetBtn');
  document.getElementById('weighLoadGearModal').classList.add('show');
}
function bindWeighLoadGear(){
  const gearBtn=document.getElementById('weighLoadGearBtn');
  if(!gearBtn||gearBtn.dataset.bound)return;
  gearBtn.dataset.bound='1';
  gearBtn.addEventListener('click',openWeighLoadGear);
  document.getElementById('weighLoadGearCloseBtn').addEventListener('click',()=>{document.getElementById('weighLoadGearModal').classList.remove('show');if(weighTruckId)openWeighLoad(weighTruckId,weighButton)});
  document.getElementById('weighUnitKgBtn').addEventListener('click',()=>{state.weighLoadUnit='kg';save();setActiveBtnPair('weighUnitKgBtn','weighUnitLbBtn')});
  document.getElementById('weighUnitLbBtn').addEventListener('click',()=>{state.weighLoadUnit='lb';save();setActiveBtnPair('weighUnitLbBtn','weighUnitKgBtn')});
  document.getElementById('weighModeNetBtn').addEventListener('click',()=>{state.weighLoadEntryMode='net';save();setActiveBtnPair('weighModeNetBtn','weighModeGrossBtn')});
  document.getElementById('weighModeGrossBtn').addEventListener('click',()=>{state.weighLoadEntryMode='gross';save();setActiveBtnPair('weighModeGrossBtn','weighModeNetBtn')});
  document.getElementById('weighLoadGross').addEventListener('input',recalcWeighLoadNet);
  document.getElementById('weighLoadTare').addEventListener('input',recalcWeighLoadNet);
}
function openWeighLoad(truckId,btn){
  const t=state.trucks.find(x=>x.id===truckId);if(!t)return;
  const f=currentField();if(!f)return alert('Add a field before recording loads.');
  weighTruckId=truckId;weighButton=btn||null;
  bindWeighLoadGear();
  const iso=new Date().toISOString(),cid=commodityById(f.commodityId)?f.commodityId:'',st=currentStorage();
  const suggested=effectiveLoadWeight(truckId,iso,cid);
  const suggestedInEntryUnit=suggested>0?convertWeight(suggested,state.unit,state.weighLoadUnit):0;
  const set=(id,text)=>{const el=document.getElementById(id);if(el)el.textContent=text};
  set('weighLoadTitle',t.name+' — Weigh Load');
  set('weighLoadContext',f.name+(st?' · '+st.name:'')+(commoditiesOn()&&cid?' · '+commodityLabel(cid):''));
  renderWeighLoadFields();
  if(state.weighLoadEntryMode==='gross'){
    const tareInEntryUnit=t.tareWeightKg>0?convertWeight(t.tareWeightKg,'kg',state.weighLoadUnit):0;
    document.getElementById('weighLoadGross').value='';
    document.getElementById('weighLoadTare').value=tareInEntryUnit>0?String(Number(tareInEntryUnit.toFixed(2))):'';
    document.getElementById('weighLoadNetComputed').value='';
  }else{
    const wi=document.getElementById('weighLoadWeight');
    wi.value=suggestedInEntryUnit>0?String(Number(suggestedInEntryUnit.toFixed(2))):'';
    wi.placeholder=suggestedInEntryUnit>0?money(suggestedInEntryUnit):'Weighbridge figure';
  }
  document.getElementById('weighLoadDateTime').value=localInputValue();
  document.getElementById('weighLoadModal').classList.add('show');
  setTimeout(()=>{try{(state.weighLoadEntryMode==='gross'?document.getElementById('weighLoadGross'):document.getElementById('weighLoadWeight')).focus()}catch(e){}},60);
}
function saveWeighLoad(){
  if(licenseGraceInfo().locked)return requireActivation(saveWeighLoad);
  const f=currentField();if(!f)return alert('Add a field before recording loads.');
  const t=state.trucks.find(x=>x.id===weighTruckId);
  let netInEntryUnit;
  if(state.weighLoadEntryMode==='gross'){
    const gross=Number(document.getElementById('weighLoadGross').value);
    const tare=Number(document.getElementById('weighLoadTare').value)||0;
    if(!(gross>0))return alert('Enter the gross weight of this load.');
    netInEntryUnit=gross-tare;
    if(!(netInEntryUnit>0))return alert('Net weight must be greater than zero \u2014 check the gross and tare weights.');
    if(t)t.tareWeightKg=convertWeight(tare,state.weighLoadUnit,'kg');
  }else{
    netInEntryUnit=Number(document.getElementById('weighLoadWeight').value);
    if(!(netInEntryUnit>0))return alert('Enter the weight of this load.');
  }
  const weight=convertWeight(netInEntryUnit,state.weighLoadUnit,state.unit);
  const iso=isoFromLocal(document.getElementById('weighLoadDateTime').value);
  closeModal('weighLoadModal');
  lastLoadEntryButton=weighButton;weighButton=null;
  const st=currentStorage();
  addLoadRecord({truckId:weighTruckId,fieldId:f.id,storageId:st&&st.id,fraction:1,customWeight:weight,time:iso});
}
function openLoadOptions(truckId){optionTruckId=truckId;selectedFraction=1;document.querySelectorAll('#loadModal .choice').forEach((x,i)=>x.classList.toggle('selected',i===0));document.getElementById('customWeight').value='';document.getElementById('loadDateTime').value=localInputValue();const t=state.trucks.find(x=>x.id===truckId);const cf=currentField(),ccid=cf&&commoditiesOn()?fieldCommodityId(cf.id):'';document.getElementById('loadModalTitle').textContent=(t?t.name:'Truck')+' — Load Options'+(ccid?' · '+commodityLabel(ccid):'');document.getElementById('loadModal').classList.add('show')}
function openManual(){renderManualSelects();manualFraction=1;document.querySelectorAll('#manualChoices .choice').forEach((x,i)=>x.classList.toggle('selected',i===0));document.getElementById('manualWeight').value='';document.getElementById('manualDateTime').value=localInputValue();document.getElementById('manualModal').classList.add('show')}
function closeModal(id){document.getElementById(id).classList.remove('show')}
