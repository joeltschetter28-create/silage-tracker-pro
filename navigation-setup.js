function closeMenu(){document.getElementById('sideMenu')?.classList.remove('open');document.getElementById('menuBackdrop')?.classList.remove('open')}
function openMenu(){document.getElementById('sideMenu')?.classList.add('open');document.getElementById('menuBackdrop')?.classList.add('open')}
// Panels a driver shouldn't need day-to-day. Only Loads (main) stays open; everything else,
// Reports included, needs the slide. Unlocking is in-memory only (never saved), so it always
// resets on reload and re-locks the moment navigation returns to the Loads page.
const DRIVER_MODE_LOCKED=['setup','settings','trash','archive','truckEdit','reports','today'];
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
function editCommodity(id){if(licenseGraceInfo().locked)return requireActivation(()=>editCommodity(id));const c=commodityById(id);if(!c)return;const n=prompt('Commodity name',c.name);if(n===null)return;const name=n.trim();if(!name)return alert('Enter a commodity name.');if(commodityNameTaken(name,id))return alert('There is already a commodity called '+name+'.');c.name=name;save();render();showToast('Commodity renamed')}
function deleteCommodity(id){if(licenseGraceInfo().locked)return requireActivation(()=>deleteCommodity(id));const c=commodityById(id);if(!c)return;const fields=state.fields.filter(f=>f.commodityId===id),weights=(state.loadWeightHistory||[]).filter(r=>r.commodityId===id);const detail=[fields.length?fields.length+' field(s) will lose their commodity':'',weights.length?weights.length+' truck weight(s) on its tab will be deleted':''].filter(Boolean).join('\n');if(!confirm('Delete the commodity "'+c.name+'"?'+(detail?'\n\n'+detail:'')+'\n\nLoads stay in history but will no longer carry a commodity.'))return;state.commodities=state.commodities.filter(x=>x.id!==id);state.fields.forEach(f=>{if(f.commodityId===id)f.commodityId=''});state.loadWeightHistory=(state.loadWeightHistory||[]).filter(r=>r.commodityId!==id);if(truckWeightTabCommodityId===id)truckWeightTabCommodityId='';save();render();showToast('Commodity deleted')}
function moveCommodity(id,dir){const i=state.commodities.findIndex(c=>c.id===id),j=i+dir;if(i<0||j<0||j>=state.commodities.length)return;[state.commodities[i],state.commodities[j]]=[state.commodities[j],state.commodities[i]];state.commodities.forEach((c,k)=>c.order=k);save();render()}
// Weighbridge yards weigh every load, so the truck button asks for the figure instead
// of assuming the truck's assigned weight. The reading in use is shown in the same
// prompt because the sample and the weighbridge ticket arrive together, and a changed
// reading is saved as a proper reading from this load's time rather than stamped on
// the one load, so the loads after it inherit it too.
function openWeighLoad(truckId,btn){
  const t=state.trucks.find(x=>x.id===truckId);if(!t)return;
  const f=currentField();if(!f)return alert('Add a field before recording loads.');
  weighTruckId=truckId;weighButton=btn||null;
  const iso=new Date().toISOString(),cid=commodityById(f.commodityId)?f.commodityId:'',st=currentStorage();
  const suggested=effectiveLoadWeight(truckId,iso,cid);
  const set=(id,text)=>{const el=document.getElementById(id);if(el)el.textContent=text};
  set('weighLoadTitle',t.name+' — Weigh Load');
  set('weighLoadContext',f.name+(st?' · '+st.name:'')+(commoditiesOn()&&cid?' · '+commodityLabel(cid):''));
  set('weighLoadWeightLabel','Load Weight ('+state.unit+')');
  const wi=document.getElementById('weighLoadWeight');
  wi.value=suggested>0?String(Number(suggested.toFixed(2))):'';
  wi.placeholder=suggested>0?money(suggested):'Weighbridge figure';
  document.getElementById('weighLoadDateTime').value=localInputValue();
  const reading=effectiveDMReading(iso);
  const di=document.getElementById('weighLoadDm');
  di.value=reading?String(Number(dmToShown(reading.value).toFixed(2))):'';
  set('weighLoadDmLabel',dmWord()+' %');
  set('weighLoadDmNote',reading
    ?(dmWord()+' in use: '+dmPct(reading.value)+(isSeedReading(reading)?' · starting default':' · effective '+new Date(reading.effective).toLocaleString())+'. Change it to save a new reading from this load\u2019s time; leave it alone to keep the one in use.')
    :('No '+dmWordLower()+' reading has been entered yet. Type one here to start the record.'));
  document.getElementById('weighLoadModal').classList.add('show');
  setTimeout(()=>{try{wi.focus();wi.select()}catch(e){}},60);
}
function saveWeighLoad(){
  if(licenseGraceInfo().locked)return requireActivation(saveWeighLoad);
  const f=currentField();if(!f)return alert('Add a field before recording loads.');
  const weight=Number(document.getElementById('weighLoadWeight').value);
  if(!(weight>0))return alert('Enter the weight of this load.');
  const iso=isoFromLocal(document.getElementById('weighLoadDateTime').value);
  const shown=String(document.getElementById('weighLoadDm').value||'').trim();
  if(shown!==''){
    const v=dmFromShown(shown);
    if(!(v>0)||v>100)return alert(dmWord()+' must be between 0 and 100.');
    const current=effectiveDMReading(iso);
    if(!current||Math.abs(Number(current.value)-v)>0.0001){
      const reading={id:uid(),value:v,effective:iso,created:new Date().toISOString()};
      state.dmReadings.push(reading);state.dryMatter=v;
      state.loads.forEach(l=>{if(l.manualDryMatter===null||l.manualDryMatter===undefined){const r=effectiveDMReading(l.time);if(r){l.dmReadingId=r.id;l.dmValue=Number(r.value);l.dryMatter=Number(r.value);l.dryWeight=Number(l.wetWeight)*(l.dryMatter/100)}}});
      offerBackApply(reading);
    }
  }
  closeModal('weighLoadModal');
  lastLoadEntryButton=weighButton;weighButton=null;
  const st=currentStorage();
  addLoadRecord({truckId:weighTruckId,fieldId:f.id,storageId:st&&st.id,fraction:1,customWeight:weight,time:iso});
}
function openLoadOptions(truckId){optionTruckId=truckId;selectedFraction=1;document.querySelectorAll('#loadModal .choice').forEach((x,i)=>x.classList.toggle('selected',i===0));document.getElementById('customWeight').value='';document.getElementById('loadDateTime').value=localInputValue();const t=state.trucks.find(x=>x.id===truckId);const cf=currentField(),ccid=cf&&commoditiesOn()?fieldCommodityId(cf.id):'';document.getElementById('loadModalTitle').textContent=(t?t.name:'Truck')+' — Load Options'+(ccid?' · '+commodityLabel(ccid):'');document.getElementById('loadModal').classList.add('show')}
function openManual(){renderManualSelects();manualFraction=1;document.querySelectorAll('#manualChoices .choice').forEach((x,i)=>x.classList.toggle('selected',i===0));document.getElementById('manualWeight').value='';document.getElementById('manualDateTime').value=localInputValue();document.getElementById('manualModal').classList.add('show')}
function closeModal(id){document.getElementById(id).classList.remove('show')}
