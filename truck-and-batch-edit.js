function selectTruckWeightTab(id){truckWeightTabCommodityId=commodityById(id)?id:'';renderPageTruckWeightHistory()}
function moveWeightHistoryCommodity(id){
  if(licenseGraceInfo().locked)return requireActivation(()=>moveWeightHistoryCommodity(id));
  const r=state.loadWeightHistory.find(x=>x.id===id);if(!r)return;
  const opts=(state.commodities||[]).filter(c=>c.id!==(r.commodityId||''));
  if(!opts.length)return alert('There\u2019s no other commodity to move this weight to.');
  const names=opts.map((c,i)=>(i+1)+'. '+c.name).join('\n');
  const answer=prompt('Move this weight to which commodity?\n\n'+names);
  if(answer===null)return;
  const idx=parseInt(answer,10)-1;
  if(!Number.isInteger(idx)||!opts[idx])return alert('Invalid selection.');
  r.commodityId=opts[idx].id;
  save();render();showToast('Weight moved to '+opts[idx].name);
}
function renderPageTruckWeightHistory(){const el=document.getElementById('pageTruckWeightHistory');if(!el||!pageEditingTruckId)return;const t=state.trucks.find(x=>x.id===pageEditingTruckId);const tabs=truckWeightTabs();if(!tabs.some(tab=>tab.id===truckWeightTabCommodityId))truckWeightTabCommodityId=tabs[0]?.id||'';const cid=commoditiesOn()?truckWeightTabCommodityId:'';const all=(state.loadWeightHistory||[]).filter(r=>r.truckId===pageEditingTruckId);const rows=all.filter(r=>(r.commodityId||'')===cid).slice().sort((a,b)=>new Date(b.effective)-new Date(a.effective));
let h='<label>'+(commoditiesOn()?'Weights by Commodity':'Weight History')+'</label>';
if(commoditiesOn()&&tabs.length){
h+='<div class="commodity-tabs">'+tabs.map(tab=>{const n=all.filter(r=>(r.commodityId||'')===tab.id).length;return '<button type="button" class="commodity-tab'+(tab.id===cid?' active':'')+'" onclick="selectTruckWeightTab(\''+tab.id+'\')">'+esc(tab.label)+(n?'<span class="commodity-tab-count">'+n+'</span>':'')+'</button>'}).join('')+'</div>';
const orphaned=all.filter(r=>!r.commodityId||!commodityById(r.commodityId));
if(orphaned.length)h+='<p class="note" style="color:var(--red)">'+orphaned.length+' weight'+(orphaned.length===1?'':'s')+' not under any commodity &mdash; use Move on '+(orphaned.length===1?'it':'them')+' below to file '+(orphaned.length===1?'it':'them')+' correctly.</p>';
}
const effective=t?effectiveLoadWeight(t.id,new Date().toISOString(),cid):0;
if(t)h+='<div class="history-row"><div><div class="history-weight">Now: '+money(effective)+' '+state.unit+'</div><div class="recent-sub">Full load weight in use today'+(commoditiesOn()&&cid?' for '+esc(commodityTabLabel(cid)):'')+' · Setup weight '+money(t.fullWeight)+' '+state.unit+'</div></div></div>';
const orphanedHere=commoditiesOn()?all.filter(r=>!r.commodityId||!commodityById(r.commodityId)):[];
const shown=commoditiesOn()?rows.concat(orphanedHere.filter(r=>!rows.includes(r))):rows;
h+=shown.length?shown.map(r=>{const isOrphan=commoditiesOn()&&(!r.commodityId||!commodityById(r.commodityId));return '<div class="history-row"><div><div class="history-weight">'+money(r.weight)+' '+state.unit+(isOrphan?' <span class="dup-badge">No commodity</span>':'')+'</div><div class="recent-sub">Effective '+new Date(r.effective).toLocaleString()+'</div></div><div class="history-actions">'+(commoditiesOn()&&(state.commodities||[]).length>1?'<button type="button" class="btn small grey" onclick="moveWeightHistoryCommodity(\''+r.id+'\')">Move</button>':'')+'</div></div>'}).join(''):'<div class="empty">No weights '+(commoditiesOn()?'on this tab ':'')+'yet.</div>';
const tabName=commoditiesOn()&&cid?commodityTabLabel(cid):'';
h+='<div class="actions"><button type="button" class="btn small blue" onclick="openWeightHistory(pageEditingTruckId,{commodityId:commoditiesOn()?truckWeightTabCommodityId:\'\',chosen:true})">'+(tabName?'Add Weight to '+esc(tabName):'Add Weight')+'</button></div>';
el.innerHTML=h}
function openTruckEditPage(id){const t=state.trucks.find(x=>x.id===id);if(!t)return;pageEditingTruckId=id;document.getElementById('truckEditTitle').textContent='Edit '+t.name;document.getElementById('pageTruckName').value=t.name;document.getElementById('pageTruckWeight').value=t.fullWeight;document.getElementById('pageTruckDriver').value=t.driver||'';document.getElementById('pageTruckPrimary').value=t.primaryColor||'#1f7a3f';document.getElementById('pageTruckSecondary').value=t.secondaryColor||'#14532d';updatePageTruckPreview();renderPageTruckWeightHistory();switchTab('truckEdit')}
function updatePageTruckPreview(){const p=document.getElementById('pageTruckPreview');if(!p)return;const n=document.getElementById('pageTruckName').value.trim()||'Truck Preview',d=document.getElementById('pageTruckDriver').value.trim()||'Assigned Driver',a=document.getElementById('pageTruckPrimary').value,b=document.getElementById('pageTruckSecondary').value;p.style.borderColor=a;p.querySelector('.truck-preview-head').textContent=n;p.querySelector('.truck-preview-head').style.background=a;p.querySelector('.truck-preview-head').style.color=contrastText(a);p.querySelector('.truck-preview-body').textContent=d;p.querySelector('.truck-preview-body').style.background=b;p.querySelector('.truck-preview-body').style.color=contrastText(b)}
function savePageTruck(){if(licenseGraceInfo().locked)return requireActivation(savePageTruck);const t=state.trucks.find(x=>x.id===pageEditingTruckId);if(!t)return;const n=document.getElementById('pageTruckName').value.trim(),w=Number(document.getElementById('pageTruckWeight').value);if(!n||!w||w<=0)return alert('Check truck name and full load weight.');t.name=n;t.fullWeight=w;t.driver=document.getElementById('pageTruckDriver').value.trim();t.primaryColor=document.getElementById('pageTruckPrimary').value;t.secondaryColor=document.getElementById('pageTruckSecondary').value;save();render();switchTab('setup');showToast('Truck saved')}
function deletePageTruck(){if(licenseGraceInfo().locked)return requireActivation(deletePageTruck);if(!pageEditingTruckId)return;if(confirm('Delete this truck? Its existing loads will be kept.')){deleteTruck(pageEditingTruckId);pageEditingTruckId=null;switchTab('setup')}}
function updateBatchSelection(){
  batchSelectedLoadIds=new Set([...document.querySelectorAll('[data-load-select]:checked')].map(x=>x.dataset.loadSelect));
  const text=batchSelectedLoadIds.size?batchSelectedLoadIds.size+' load(s) selected.':'No loads selected.';
  ['batchSelectedCount','reportSelectedCount'].forEach(id=>{const c=document.getElementById(id);if(c)c.textContent=text});
  document.querySelectorAll('[data-load-id]').forEach(r=>r.classList.toggle('batch-selected',batchSelectedLoadIds.has(r.dataset.loadId)));
  const loadBoxes=[...document.querySelectorAll('.load-select')],reportBoxes=[...document.querySelectorAll('.report-load-select')];
  const lb=document.getElementById('loadSelectAllBtn');if(lb&&loadSelectionMode)lb.textContent=loadBoxes.length&&loadBoxes.every(x=>x.checked)?'Clear All':'Select All';
  const rb=document.getElementById('reportSelectAllBtn');if(rb&&reportSelectionMode)rb.textContent=reportBoxes.length&&reportBoxes.every(x=>x.checked)?'Clear All':'Select All';
}
function setSelectionMode(type,on){
  if(type==='loads')loadSelectionMode=on;else reportSelectionMode=on;
  const mode=type==='loads'?loadSelectionMode:reportSelectionMode;
  const selector=type==='loads'?'.load-select':'.report-load-select';
  document.querySelectorAll(selector).forEach(x=>x.classList.toggle('selection-hidden',!mode));
  const selectBtn=document.getElementById(type==='loads'?'loadSelectBtn':'reportSelectBtn');
  if(selectBtn)selectBtn.textContent=mode?'Cancel':'Select';
  const allBtn=document.getElementById(type==='loads'?'loadSelectAllBtn':'reportSelectAllBtn');
  if(allBtn){allBtn.classList.toggle('selection-hidden',!mode);allBtn.textContent='Select All';}
  const editBtn=document.getElementById(type==='loads'?'batchEditBtn':'reportBatchEditBtn');
  if(editBtn)editBtn.classList.toggle('selection-hidden',!mode);
  const count=document.getElementById(type==='loads'?'batchSelectedCount':'reportSelectedCount');
  if(count)count.classList.toggle('selection-hidden',!mode);
  if(!mode){
    document.querySelectorAll(selector).forEach(x=>x.checked=false);
    updateBatchSelection();
  }
}
function selectAllVisibleLoads(type){
  const selector=type==='loads'?'.load-select':'.report-load-select';
  const boxes=[...document.querySelectorAll(selector)];
  if(!boxes.length)return;
  const allChecked=boxes.every(x=>x.checked);
  boxes.forEach(x=>x.checked=!allChecked);
  updateBatchSelection();
  const btn=document.getElementById(type==='loads'?'loadSelectAllBtn':'reportSelectAllBtn');
  if(btn)btn.textContent=allChecked?'Select All':'Clear All';
}
function openBatchEdit(){if(!batchSelectedLoadIds.size)return alert('Select at least one load to batch edit.');const a=document.getElementById('batchAction');if(a)a.value='edit';const f=document.getElementById('batchField'),s=document.getElementById('batchStorage'),t=document.getElementById('batchTruck');f.innerHTML='<option value="">No change</option>'+state.fields.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');s.innerHTML='<option value="">No change</option>'+state.storages.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');t.innerHTML='<option value="">No change</option>'+state.trucks.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');const c=document.getElementById('batchCommodity');if(c)c.innerHTML='<option value="">No change</option><option value="'+NO_COMMODITY+'">No commodity</option>'+(state.commodities||[]).map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');document.getElementById('batchDM').value='';document.getElementById('batchWeight').value='';const bn=document.getElementById('batchNote');if(bn)bn.value='';document.getElementById('batchEditModal').classList.add('show')}
// One reading of the batch form, shared by the review screen, by what is applied and by
// the wording written to the edit log, so all three can never drift apart.
function readBatchForm(){return {action:document.getElementById('batchAction')?.value||'edit',note:String(document.getElementById('batchNote')?.value||'').trim(),f:document.getElementById('batchField').value,s:document.getElementById('batchStorage').value,t:document.getElementById('batchTruck').value,c:document.getElementById('batchCommodity')?.value||'',dm:document.getElementById('batchDM').value,w:document.getElementById('batchWeight').value}}
function batchChangeList(v){const changes=[];if(v.f)changes.push('Field → '+fieldDisplay({fieldId:v.f}));if(v.c)changes.push('Commodity → '+(v.c===NO_COMMODITY?'None':(commodityLabel(v.c)||'None')));if(v.s)changes.push('Storage → '+storageDisplay({storageId:v.s}));if(v.t){const tr=state.trucks.find(x=>x.id===v.t);changes.push('Truck → '+(tr?.name||v.t))}if(v.dm!=='')changes.push(dmWord()+' → '+v.dm+'%');if(v.w!=='')changes.push('Weight → '+v.w+' '+state.unit);if(v.note)changes.push('Field Note → '+v.note);return changes}
function reviewBatchEdit(){const v=readBatchForm();if(v.action==='edit'&&!v.f&&!v.s&&!v.t&&!v.c&&v.dm===''&&v.w===''&&!v.note)return alert('Enter at least one change.');const names=[...batchSelectedLoadIds].map(id=>{const l=state.loads.find(x=>x.id===id);return l?new Date(l.time).toLocaleString()+' · '+truckDisplay(l):id});if(v.action==='delete'){document.getElementById('batchConfirmText').innerHTML='<b>Selected loads ('+names.length+'):</b><br>'+names.map(esc).join('<br>')+'<br><br><b>Action:</b><br>Move these loads to Trash.<br><br>Are you sure you want to continue?';document.getElementById('batchConfirmModal').classList.add('show');return;}const changes=batchChangeList(v);document.getElementById('batchConfirmText').innerHTML='<b>Selected loads ('+names.length+'):</b><br>'+names.map(esc).join('<br>')+'<br><br><b>Changes:</b><br>'+changes.map(esc).join('<br>')+'<br><br>Are you sure you want to apply these changes?';document.getElementById('batchConfirmModal').classList.add('show')}
function applyBatchEdit(){if(licenseGraceInfo().locked)return requireActivation(applyBatchEdit);const v=readBatchForm(),{action,note,f,s,t,c,dm,w}=v;if(action==='delete'){const now=new Date().toISOString();const selected=new Set(batchSelectedLoadIds);const moved=[];state.loads=state.loads.filter(l=>{if(!selected.has(l.id))return true;moved.push(l);return false});const entries=moved.map(l=>({loadId:l.id,before:loadEditSnapshot(l),deleted:true}));moved.forEach(l=>{l.deletedAt=now});state.trash=[...moved,...(state.trash||[])];recordEditLog({kind:'batch-delete',changes:['Moved to Trash'],entries});save();batchSelectedLoadIds.clear();document.getElementById('batchConfirmModal').classList.remove('show');document.getElementById('batchEditModal').classList.remove('show');render();showToast(moved.length+' load(s) moved to Trash');return;}const entries=[];for(const id of batchSelectedLoadIds){const l=state.loads.find(x=>x.id===id);if(!l)continue;const before=loadEditSnapshot(l);if(f){const x=state.fields.find(y=>y.id===f);if(x){l.fieldId=x.id;l.fieldName=x.name;l.commodityId=commodityById(x.commodityId)?x.commodityId:'';l.commodityName=commodityLabel(l.commodityId);l.fieldNote=String(x.note||'').trim()}}if(c){l.commodityId=c===NO_COMMODITY?'':(commodityById(c)?c:'');l.commodityName=commodityLabel(l.commodityId)}if(note)l.fieldNote=note;if(s){const x=state.storages.find(y=>y.id===s);if(x){l.storageId=x.id;l.storageName=x.name}}if(t){const x=state.trucks.find(y=>y.id===t);if(x){l.truckId=x.id;l.truckName=x.name;l.driverName=x.driver||''}}if(dm!==''){const q=dmFromShown(dm);if(q>0&&q<=100){l.manualDryMatter=q;l.dmReadingId=null;l.dmValue=q;l.dryMatter=q;l.dryWeight=Number(l.wetWeight)*(q/100)}}if(w!==''){const q=Number(w);if(q>0){l.wetWeight=q;l.loadWeightMode='custom';l.fraction=1;l.type='Custom';l.dryWeight=Number(l.wetWeight)*(Number(l.dryMatter||0)/100)}}entries.push({loadId:l.id,before,after:null})}recalculateLoads();entries.forEach(e=>{const l=state.loads.find(x=>x.id===e.loadId);e.after=l?loadEditSnapshot(l):e.before});recordEditLog({kind:'batch',changes:batchChangeList(v),entries});save();batchSelectedLoadIds.clear();document.getElementById('batchConfirmModal').classList.remove('show');document.getElementById('batchEditModal').classList.remove('show');render();showToast('Batch changes applied')}
// A single reusable popup for the longer explanation behind any brief setting description --
// tap the small circled "i" next to a setting to read the full version, rather than every
// setting carrying its whole explanation inline all the time.
const INFO_TEXTS={
  driverMode:{title:'Driver Mode',text:'Locks Setup, Settings, Archive, Deleted Loads and Reports, so only Loads stays open day-to-day. Nothing to set up first \u2014 turn it on any time. Turning it off, or opening a locked page, shows a slider \u2014 slide it all the way to the right to continue.'},
  loadsWindow:{title:'Loads page window',text:'Entering a second load for the same truck inside this window asks to confirm it first, so an accidental double-tap doesn\u2019t log the same load twice.'},
  importWindow:{title:'Imported loads window',text:'Imported loads landing this close to a load already recorded for the same truck are counted and offered as possible duplicates, rather than silently added twice.'},
  cycleBreak:{title:'Ignore breaks longer than',text:'Truck cycle times (Loads page cards, a truck\u2019s edit page), the field and truck averages in Reports, and the harvest Rate figure (Loads page dashboard and Reports) all skip over any gap longer than this \u2014 a lunch stop or an overnight break won\u2019t drag a cycle time up or a harvest rate down. The single \u201clast cycle\u201d figure still always shows the real gap, whatever it was. Set to 0 to include every gap with nothing excluded.'},
  rateWindow:{title:'Rate window',text:'The Rate stat on the Loads page dashboard only counts loads from the last this-many hours, so it reflects the current pace rather than the field\u2019s whole history \u2014 switching to a different field shows that field\u2019s own rate right away. Set to 0 to use the field\u2019s full history instead. Breaks longer than the setting above still don\u2019t count, even inside this window. Reports keeps using its own date filters, not this setting.'},
  weighEveryLoad:{title:'Prompt for a weight on every load',text:'The prompt starts on the truck\u2019s assigned weight so it can be accepted with one tap, shows the reading in use and lets a new one be entered at the same time. Holding a truck down still opens the full Load Options form, and switching this off goes straight back to one tap per load.'},
  moisture:{title:'Show moisture instead of dry matter',text:'Moisture and dry matter are the same reading counted the other way round, so 35% dry matter is 65% moisture. The app keeps storing dry matter and every weight, dry tonnage and total stays exactly as it is \u2014 only the wording and the number on screen change, and the reading boxes accept whichever one is switched on.'},
  commodityToggle:{title:'Commodity tracking',text:'Switching this off only hides the feature. Your commodities, the commodity set on each field, and every per-commodity truck weight are kept exactly as they are, no load is recalculated, and it all comes straight back when you switch it on again.'},
};
function openInfoPopup(key){
  const info=INFO_TEXTS[key];if(!info)return;
  document.getElementById('infoPopupTitle').textContent=info.title;
  document.getElementById('infoPopupText').textContent=info.text;
  document.getElementById('infoPopupModal').classList.add('show');
}
function bindInfoPopups(){
  if(document.body.dataset.infoPopupsBound)return;
  document.body.dataset.infoPopupsBound='1';
  document.addEventListener('click',e=>{
    const btn=e.target.closest('.info-icon');
    if(btn){openInfoPopup(btn.dataset.info);return}
    if(e.target.id==='infoPopupCloseBtn'||e.target.id==='infoPopupModal')document.getElementById('infoPopupModal').classList.remove('show');
  });
}
// The changelog moved out of the normal About view into its own full-screen sheet, opened by
// press-and-hold (same 550ms/12px-tolerance pattern as a truck button) so it stays out of the
// way day to day. It closes by swiping down once already scrolled to the top -- checked at the
// start of each touch so an ordinary scroll gesture is never mistaken for a dismiss -- or by
// leaving the page via the app's own navigation.
function openChangelogModal(){
  document.getElementById('changelogModal')?.classList.add('show');
  const body=document.getElementById('changelogModalBody');
  if(body)body.scrollTop=0;
}
function closeChangelogModal(){
  const modal=document.getElementById('changelogModal');
  if(modal)modal.classList.remove('show');
  const body=document.getElementById('changelogModalBody');
  if(body)body.style.transform='';
}
function bindChangelogModal(){
  const card=document.getElementById('aboutCard');
  if(card&&!card.dataset.pressBound){
    card.dataset.pressBound='1';
    let timer=null,startX=0,startY=0;
    const cancel=()=>{clearTimeout(timer);timer=null};
    card.addEventListener('pointerdown',e=>{startX=e.clientX;startY=e.clientY;timer=setTimeout(()=>{navigator.vibrate&&navigator.vibrate(40);openChangelogModal()},550)});
    card.addEventListener('pointermove',e=>{if(Math.abs(e.clientX-startX)>12||Math.abs(e.clientY-startY)>12)cancel()});
    card.addEventListener('pointerup',cancel);
    card.addEventListener('pointercancel',cancel);
    card.addEventListener('contextmenu',e=>e.preventDefault());
  }
  const body=document.getElementById('changelogModalBody');
  if(body&&!body.dataset.swipeBound){
    body.dataset.swipeBound='1';
    let dragStartY=0,dragging=false;
    body.addEventListener('touchstart',e=>{dragging=body.scrollTop<=0;dragStartY=e.touches[0].clientY},{passive:true});
    body.addEventListener('touchmove',e=>{
      if(!dragging)return;
      const dy=e.touches[0].clientY-dragStartY;
      if(dy>0)body.style.transform='translateY('+Math.min(dy,220)+'px)';
      else{dragging=false;body.style.transform=''}
    },{passive:true});
    body.addEventListener('touchend',e=>{
      const dy=e.changedTouches[0].clientY-dragStartY;
      body.style.transform='';
      if(dragging&&dy>80)closeChangelogModal();
      dragging=false;
    });
  }
  const closeBtn=document.getElementById('changelogModal');
  if(closeBtn&&!closeBtn.dataset.bgBound){closeBtn.dataset.bgBound='1';closeBtn.addEventListener('click',e=>{if(e.target===closeBtn)closeChangelogModal()})}
}
// A field showing only a placeholder loses its description the moment something is typed in
// it -- fine once you already know what "12.4" in a truck's Full Weight box means, not so fine
// the first time. The label stays hidden while empty (the placeholder covers that case) and
// appears above the box the moment there's a value, synced on every render so it's correct
// immediately for an existing truck's already-populated fields, not just as you type.
function bindFloatFields(){
  document.querySelectorAll('.float-field').forEach(wrap=>{
    const input=wrap.querySelector('input');if(!input)return;
    const sync=()=>wrap.classList.toggle('has-value',!!String(input.value||'').trim());
    sync();
    if(!input.dataset.floatBound){input.dataset.floatBound='1';input.addEventListener('input',sync)}
  });
}
// todaySelectedDate is the calendar date (YYYY-MM-DD) the Today page is currently showing --
// null means "live today", tracking the real current harvest day as time passes. Set only by
// picking a date; leaving the page (any navigation away from 'today') resets it back to null.
let todaySelectedDate=null;
function computeTodayStats(dayStart){
  const end=harvestDayEnd(dayStart);
  const loads=state.loads.filter(l=>{const t=new Date(l.time).getTime();return t>=dayStart.getTime()&&t<end.getTime()});
  const loadsCount=loads.length;
  const wetTonnes=loads.reduce((s,l)=>s+Number(l.wetWeight||0),0);
  const avgDm=loadsCount?loads.reduce((s,l)=>s+Number(l.dryMatter||0),0)/loadsCount:null;
  const avgRate=harvestRatePerHour(loads.map(l=>l.time),wetTonnes);
  const hourTotals={};
  loads.forEach(l=>{const hr=new Date(l.time).getHours();hourTotals[hr]=(hourTotals[hr]||0)+Number(l.wetWeight||0)});
  const peakRate=Object.keys(hourTotals).length?Math.max(...Object.values(hourTotals)):null;
  const byTruck={};
  loads.forEach(l=>{const key=l.truckName||'Unknown';if(!byTruck[key])byTruck[key]={count:0,wet:0};byTruck[key].count++;byTruck[key].wet+=Number(l.wetWeight||0)});
  return {loadsCount,wetTonnes,avgDm,avgRate,peakRate,byTruck};
}
function renderTodayPage(){
  if(!document.getElementById('todayLoadsCount'))return;
  const dayStart=harvestDayStart(todaySelectedDate?new Date(todaySelectedDate+'T12:00:00'):new Date());
  const end=harvestDayEnd(dayStart);
  const stats=computeTodayStats(dayStart);
  document.getElementById('todayLoadsCount').textContent=stats.loadsCount;
  document.getElementById('todayWetTonnes').textContent=money(stats.wetTonnes)+' '+state.unit;
  document.getElementById('todayDmLabel').textContent='Avg '+dmWord();
  document.getElementById('todayAvgDm').textContent=stats.avgDm!==null?dmPct(stats.avgDm):'\u2014';
  document.getElementById('todayAvgRate').textContent=stats.avgRate!==null?money(stats.avgRate)+' '+state.unit+'/hr':'\u2014';
  document.getElementById('todayPeakRate').textContent=stats.peakRate!==null?money(stats.peakRate)+' '+state.unit+'/hr':'\u2014';
  document.getElementById('todayDateLabel').textContent=dayStart.toLocaleDateString([],{weekday:'long',month:'long',day:'numeric'})+' \u00b7 '+dayStart.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})+' \u2013 '+end.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})+' next day';
  const truckNames=Object.keys(stats.byTruck).sort((a,b)=>stats.byTruck[b].count-stats.byTruck[a].count);
  const breakdown=document.getElementById('todayTruckBreakdown');
  breakdown.innerHTML=truckNames.length?truckNames.map(name=>{const t=stats.byTruck[name];return '<div class="field-total"><div>'+esc(name)+'</div><div>'+t.count+' load'+(t.count===1?'':'s')+'</div><div>'+money(t.wet)+' '+state.unit+'</div></div>'}).join(''):'<div class="empty">No loads yet.</div>';
  const picker=document.getElementById('todayDatePicker');
  if(picker&&document.activeElement!==picker){
    const y=dayStart.getFullYear(),m=String(dayStart.getMonth()+1).padStart(2,'0'),d=String(dayStart.getDate()).padStart(2,'0');
    picker.value=y+'-'+m+'-'+d;
  }
}
function bindTodayPage(){
  const picker=document.getElementById('todayDatePicker');
  if(picker&&!picker.dataset.bound){picker.dataset.bound='1';picker.addEventListener('change',()=>{if(picker.value){todaySelectedDate=picker.value;renderTodayPage()}})}
}
function bindV18SettingsPage(){
  bindChangelogModal();
  bindInfoPopups();
  bindDriverModeSettings();
  bindCycleBreakStepper();
  bindRateWindowStepper();
  bindLicenseSettings();
  bindTextScaleStepper();
  const a=document.getElementById('settingsAudioLoad'),h=document.getElementById('settingsHapticLoad'),i=document.getElementById('settingsInoculant'),d=document.getElementById('darkToggle'),w=document.getElementById('wakeToggle');
  if(a&&!a.dataset.bound){a.dataset.bound='1';a.checked=!!getLoadFeedback().audio;a.addEventListener('change',()=>{const s=getLoadFeedback();s.audio=a.checked;saveLoadFeedback(s);if(s.audio)playLoadTone();});}
  if(h&&!h.dataset.bound){h.dataset.bound='1';h.checked=!!getLoadFeedback().haptic;h.addEventListener('change',()=>{const s=getLoadFeedback();s.haptic=h.checked;saveLoadFeedback(s);if(s.haptic)doLoadHaptic();});}
  if(i&&!i.dataset.bound){i.dataset.bound='1';i.checked=!!state.counter?.enabled;i.addEventListener('change',()=>{state.counter=state.counter||{};state.counter.enabled=i.checked;save();render();});}
  const c=document.getElementById('settingsCommodities');
  if(c&&!c.dataset.bound){c.dataset.bound='1';c.addEventListener('change',()=>{state.commoditiesEnabled=c.checked;save();render();showToast(c.checked?'Commodities switched on':'Commodities switched off');});}
  if(c)c.checked=commoditiesOn();
  const m=document.getElementById('settingsMoisture');
  if(m&&!m.dataset.bound){m.dataset.bound='1';m.addEventListener('change',()=>{state.dmDisplayMode=m.checked?'moisture':'dm';save();render();showToast(m.checked?'Showing moisture':'Showing dry matter');});}
  if(m)m.checked=moistureMode();
  const we=document.getElementById('settingsWeighEveryLoad');
  if(we&&!we.dataset.bound){we.dataset.bound='1';we.addEventListener('change',()=>{state.weighEveryLoad=we.checked;save();render();showToast(we.checked?'Every load will be weighed':'Weight prompt switched off');});}
  if(we)we.checked=!!state.weighEveryLoad;
  bindMinuteStepper('dupLoad','loadMinutes','dupLoadSummary',m=>m>0
    ?'A second load for the same truck entered within '+minuteWord(m)+' asks to be confirmed before it is saved.'
    :'Off. Every load on the Loads page is saved as soon as the truck is tapped.');
  bindMinuteStepper('dupImport','importMinutes','dupImportSummary',m=>m>0
    ?'Imported loads landing within '+minuteWord(m)+' of a load already here for the same truck are counted up and offered before they are added.'
    :'Off. Imported loads are added straight away, apart from exact matches, which are skipped as before.');
  if(d)d.checked=state.darkMode;
  if(w)w.checked=state.keepAwake;
  renderThemeSwatches();
}
// Theme swatches: one click listener on the row (delegated), rebuilt each render so the
// "selected" outline follows state.theme without needing per-button rebinding.
// Driver Mode: turning it on needs no setup at all, since there is no PIN or code to create.
// Turning it off, and opening any locked page, both require sliding the same on-screen slider
// shown every time -- it exists to stop an idle screen in a pocket, not to keep out someone who
// can see the screen and use it.
// Snaps through the fixed preset steps (80% up to 160%) rather than a free-form number, so the
// displayed percentage is always one of a small, predictable set.
const TEXT_SCALE_STEPS=[0.8,0.9,1,1.1,1.25,1.4,1.6];
function bindTextScaleStepper(){
  const display=document.getElementById('textScaleDisplay'),minus=document.getElementById('textScaleMinus'),plus=document.getElementById('textScalePlus');
  if(!display)return;
  const paint=()=>{display.textContent=Math.round(clampTextScale(state.textScale)*100)+'%'};
  const set=v=>{state.textScale=clampTextScale(v);save();applyTextScale();paint()};
  if(!display.dataset.bound){
    display.dataset.bound='1';
    minus?.addEventListener('click',()=>{const i=TEXT_SCALE_STEPS.indexOf(clampTextScale(state.textScale));set(TEXT_SCALE_STEPS[Math.max(0,i-1)])});
    plus?.addEventListener('click',()=>{const i=TEXT_SCALE_STEPS.indexOf(clampTextScale(state.textScale));set(TEXT_SCALE_STEPS[Math.min(TEXT_SCALE_STEPS.length-1,i+1)])});
  }
  paint();
}
// One 10-minute tap at a time, typed in directly, or held at 0 to include every gap.
function bindCycleBreakStepper(){
  const input=document.getElementById('cycleBreakMinutes'),minus=document.getElementById('cycleBreakMinus'),plus=document.getElementById('cycleBreakPlus'),summary=document.getElementById('cycleBreakSummary');
  if(!input)return;
  const summaryText=m=>m===0?'Every gap counts toward cycle time and rate calculations, however long.':'Gaps over '+fmtDuration(m)+' are left out of cycle time and rate calculations.';
  const paint=()=>{const m=clampCycleBreakMinutes(state.cycleTimeBreakMinutes);input.value=String(m);if(summary)summary.textContent=summaryText(m)};
  const set=v=>{state.cycleTimeBreakMinutes=clampCycleBreakMinutes(v);save();paint();render()};
  if(!input.dataset.bound){
    input.dataset.bound='1';
    input.addEventListener('change',()=>set(input.value));
    input.addEventListener('blur',paint);
    if(minus)minus.addEventListener('click',()=>set(clampCycleBreakMinutes(state.cycleTimeBreakMinutes)-10));
    if(plus)plus.addEventListener('click',()=>set(clampCycleBreakMinutes(state.cycleTimeBreakMinutes)+10));
  }
  paint();
}
// The dashboard Rate figure's rolling window -- 0 falls back to the field's full history.
// Tapping the dashboard Rate tile jumps straight to the setting that controls it, rather than
// making someone hunt through Settings for it, and briefly highlights the row so it's obvious
// which one just got scrolled to.
function openRateWindowSetting(){
  switchTab('settings');
  requestAnimationFrame(()=>{
    const row=document.getElementById('rateWindowHours')?.closest('.setting-row');
    if(!row)return;
    row.scrollIntoView({block:'center',behavior:'smooth'});
    row.classList.add('setting-flash');
    setTimeout(()=>row.classList.remove('setting-flash'),1600);
  });
}
function bindRateWindowStepper(){
  const input=document.getElementById('rateWindowHours'),minus=document.getElementById('rateWindowMinus'),plus=document.getElementById('rateWindowPlus'),summary=document.getElementById('rateWindowSummary');
  if(!input)return;
  const summaryText=h=>h===0?'The dashboard Rate uses the whole field, however far back it goes.':'The dashboard Rate only looks at the last '+h+' hour'+(h===1?'':'s')+'.';
  const paint=()=>{const h=clampRateWindowHours(state.rateWindowHours);input.value=String(h);if(summary)summary.textContent=summaryText(h)};
  const set=v=>{state.rateWindowHours=clampRateWindowHours(v);save();paint();render()};
  if(!input.dataset.bound){
    input.dataset.bound='1';
    input.addEventListener('change',()=>set(input.value));
    input.addEventListener('blur',paint);
    if(minus)minus.addEventListener('click',()=>set(clampRateWindowHours(state.rateWindowHours)-1));
    if(plus)plus.addEventListener('click',()=>set(clampRateWindowHours(state.rateWindowHours)+1));
  }
  paint();
}
// Annual Activation: entirely offline, no payment, no server -- see activationCodeForFarm() and
// licenseGraceInfo() in core-state.js for the full reasoning. Settings is where a renewal code
// is entered; requireActivation() (core-state.js) is what actually prompts for one, right at the
// moment a gated action needs it, wherever that happens to be in the app.
// Activation is a rolling 12 months from whenever a code was last entered, not a calendar year --
// entering the current year's code restarts that 12 months from today. A code only validates
// during the calendar year it was made for.
function fmtLicenseDate(d){return new Date(d).toLocaleDateString([],{year:'numeric',month:'short',day:'numeric'})}
function renderLicenseStatus(){
  const status=document.getElementById('licenseStatus');if(!status)return;
  const info=licenseGraceInfo();
  const activatedLine=state.licenseActivatedAt?('Activated '+fmtLicenseDate(state.licenseActivatedAt)+' for '+state.licenseFarmName+'.'):'';
  if(info.locked){
    status.textContent=state.licenseActivatedAt
      ?(activatedLine+' Expired '+fmtLicenseDate(info.expiresAt)+'. Locked \u2014 enter a current code below, or when prompted while using the app.')
      :'Not yet activated. Enter the farm name and a matching code below, or when prompted the first time something needs it.';
    return;
  }
  if(info.inGrace){status.textContent=activatedLine+' Expired '+fmtLicenseDate(info.expiresAt)+'. Grace period: '+info.daysLeft+' day'+(info.daysLeft===1?'':'s')+' left to enter a new code.';return}
  status.textContent=activatedLine+' Valid through '+fmtLicenseDate(info.expiresAt)+'.';
}
// The on-demand activation prompt: opened by requireActivation() (core-state.js) whenever a
// gated action is attempted while locked. Unlike the old hard gate, this can be cancelled --
// cancelling just means the attempted action doesn't happen, nothing else in the app is affected.
// pendingActivationCallback holds the action to resume automatically the moment a valid code
// is entered, so activating and finishing the original action feel like one motion.
let pendingActivationCallback=null;
function openActivationPrompt(onSuccess){
  pendingActivationCallback=onSuccess;
  const err=document.getElementById('promptError');if(err)err.textContent='';
  const codeInput=document.getElementById('promptCodeInput');if(codeInput)codeInput.value='';
  const farmInput=document.getElementById('promptFarmNameInput');if(farmInput)farmInput.value=state.licenseFarmName||'';
  document.getElementById('activationPromptModal')?.classList.add('show');
}
function closeActivationPrompt(){
  document.getElementById('activationPromptModal')?.classList.remove('show');
  pendingActivationCallback=null;
}
function bindActivationPromptModal(){
  const farmInput=document.getElementById('promptFarmNameInput'),codeInput=document.getElementById('promptCodeInput'),btn=document.getElementById('promptActivateBtn'),cancelBtn=document.getElementById('promptCancelBtn'),err=document.getElementById('promptError');
  if(!btn||btn.dataset.bound)return;
  btn.dataset.bound='1';
  btn.addEventListener('click',()=>{
    const farmName=(farmInput.value||'').trim();
    if(!farmName){err.textContent='Enter the farm name.';return}
    const raw=(codeInput.value||'').trim().toUpperCase();
    const now=new Date().getFullYear();
    if(raw!==activationCodeForFarm(farmName,now)){err.textContent='That code was not recognized for this farm name.';return}
    state.licenseFarmName=farmName;
    state.licenseActivatedAt=new Date().toISOString();
    save();
    const cb=pendingActivationCallback;
    closeActivationPrompt();
    render();
    if(cb)cb();
  });
  cancelBtn?.addEventListener('click',closeActivationPrompt);
}
function renderHeaderFarmName(){
  const el=document.getElementById('headerFarmName');if(!el)return;
  if(state.licenseFarmName){el.textContent='Activated: '+state.licenseFarmName;el.style.display=''}
  else{el.style.display='none'}
}
function bindLicenseSettings(){
  const farmInput=document.getElementById('licenseFarmNameInput'),codeInput=document.getElementById('licenseCodeInput'),activateBtn=document.getElementById('licenseActivateBtn');
  if(!farmInput)return;
  if(document.activeElement!==farmInput)farmInput.value=state.licenseFarmName||'';
  renderLicenseStatus();
  if(activateBtn&&!activateBtn.dataset.bound){
    activateBtn.dataset.bound='1';
    activateBtn.addEventListener('click',()=>{
      const farmName=(farmInput.value||'').trim();
      if(!farmName)return alert('Enter the farm name first.');
      const raw=(codeInput.value||'').trim().toUpperCase();
      const now=new Date().getFullYear();
      const matched=raw===activationCodeForFarm(farmName,now);
      if(!matched)return alert('That code was not recognized for this farm name.');
      state.licenseFarmName=farmName;
      state.licenseActivatedAt=new Date().toISOString();
      codeInput.value='';
      save();render();
      showToast('Activated through '+fmtLicenseDate(licenseExpiry(state.licenseActivatedAt)));
    });
  }
}
function renderDriverModeSettings(){
  const t=document.getElementById('driverModeToggle');if(t)t.checked=!!state.driverMode;
  const badge=document.getElementById('driverModeBadge');if(badge)badge.style.display=state.driverMode?'':'none';
}
function bindDriverModeSettings(){
  const t=document.getElementById('driverModeToggle');
  if(t&&!t.dataset.bound){
    t.dataset.bound='1';
    t.addEventListener('change',()=>{
      if(t.checked){
        state.driverMode=true;driverModeUnlocked=false;save();render();showToast('Driver Mode on');
      }else{
        t.checked=true;
        openSlideUnlockModal(()=>{state.driverMode=false;save();render();showToast('Driver Mode off')});
      }
    });
  }
  renderDriverModeSettings();
}
function renderThemeSwatches(){
  const row=document.getElementById('themeSwatchRow');if(!row)return;
  const cur=sanitizeTheme(state.theme);
  row.innerHTML=THEME_PRESETS.map(p=>`<button type="button" class="theme-swatch${cur.id===p.id?' selected':''}" data-theme-id="${p.id}" style="background:linear-gradient(135deg,${p.accent},${p.accent2})" title="${esc(p.name)}" aria-label="${esc(p.name)}"></button>`).join('')+`<button type="button" class="theme-swatch theme-swatch-custom${cur.id==='custom'?' selected':''}" data-theme-id="custom" title="Custom" aria-label="Custom"></button>`;
  const customRow=document.getElementById('customThemeRow');
  if(customRow)customRow.style.display=cur.id==='custom'?'grid':'none';
  const ca=document.getElementById('customThemeAccent'),ca2=document.getElementById('customThemeAccent2');
  if(ca)ca.value=cur.accent;
  if(ca2)ca2.value=cur.accent2;
  if(!row.dataset.bound){
    row.dataset.bound='1';
    row.addEventListener('click',e=>{
      const btn=e.target.closest('.theme-swatch');if(!btn)return;
      const id=btn.dataset.themeId;
      if(id==='custom'){const existing=sanitizeTheme(state.theme);state.theme={id:'custom',accent:existing.accent,accent2:existing.accent2}}
      else{const p=themePreset(id);state.theme={id:p.id,accent:p.accent,accent2:p.accent2}}
      save();applyTheme();render();
    });
  }
  if(ca&&!ca.dataset.bound){ca.dataset.bound='1';ca.addEventListener('input',()=>{state.theme={id:'custom',accent:ca.value,accent2:document.getElementById('customThemeAccent2').value};save();applyTheme()});ca.addEventListener('change',()=>render());}
  if(ca2&&!ca2.dataset.bound){ca2.dataset.bound='1';ca2.addEventListener('input',()=>{state.theme={id:'custom',accent:document.getElementById('customThemeAccent').value,accent2:ca2.value};save();applyTheme()});ca2.addEventListener('change',()=>render());}
}
// One minute a tap, typed in directly, or held at 0 to switch the guard off entirely.
function bindMinuteStepper(prefix,key,summaryId,summaryText){
  const input=document.getElementById(prefix+'Minutes'),minus=document.getElementById(prefix+'Minus'),plus=document.getElementById(prefix+'Plus'),summary=document.getElementById(summaryId);
  if(!input)return;
  const paint=()=>{const m=clampDupMinutes(dupWatch()[key]);input.value=String(m);if(summary)summary.textContent=summaryText(m)};
  const set=v=>{dupWatch()[key]=clampDupMinutes(v);save();paint()};
  if(!input.dataset.bound){
    input.dataset.bound='1';
    input.addEventListener('change',()=>set(input.value));
    input.addEventListener('blur',paint);
    if(minus)minus.addEventListener('click',()=>set(clampDupMinutes(dupWatch()[key])-1));
    if(plus)plus.addEventListener('click',()=>set(clampDupMinutes(dupWatch()[key])+1));
  }
  paint();
}
function selectReportTab(name){
  document.querySelectorAll('.report-tab').forEach(x=>x.classList.toggle('active',x.dataset.reportTab===name));
  document.getElementById('reportLoadsPanel')?.classList.toggle('active',name==='loads');
  document.getElementById('reportInoculantPanel')?.classList.toggle('active',name==='inoculant');
  document.getElementById('reportEditLogsPanel')?.classList.toggle('active',name==='editlogs');
}
// The Reports page always opens on the two report tabs, with the strip scrolled back to
// the start so Edit Logs sits off the right edge until it is swiped in again.
function resetReportTabs(){selectReportTab('loads');const strip=document.getElementById('reportTabStrip');if(strip)strip.scrollLeft=0}
// Builds the Archive entry for one field's loads. Shared by "Summarize Field & Clear Loads" on the
// Reports page and "Clear All Loads" in Settings, so both archive exactly the same detail.
function buildFieldArchiveEntry(field,loads){
  const totalWet=loads.reduce((s,l)=>s+(Number(l.wetWeight)||0),0);
  const totalDry=loads.reduce((s,l)=>s+(Number(l.dryWeight)||0),0);
  const avgDm=totalWet>0?totalDry/totalWet*100:null;
  const fieldObj=(state.fields||[]).find(f=>f.id===field.id)||{};
  const acres=Number(fieldObj.size||fieldObj.acres||fieldObj.fieldSize||0);
  const times=loads.map(l=>new Date(l.time).getTime()).filter(t=>Number.isFinite(t));
  const groupTotals=(keyFn)=>{const map={};loads.forEach(l=>{const name=keyFn(l)||'Unassigned';if(!map[name])map[name]={name,loads:0,wet:0,dry:0};map[name].loads++;map[name].wet+=Number(l.wetWeight)||0;map[name].dry+=Number(l.dryWeight)||0});return Object.values(map).sort((a,b)=>b.wet-a.wet)};
  return {
    id:uid(),
    archivedAt:new Date().toISOString(),
    fieldId:field.id,
    fieldName:field.name,
    fieldNote:fieldObj.note||'',
    commodityId:fieldObj.commodityId||'',
    commodityName:commodityLabel(fieldObj.commodityId)||'',
    unit:state.unit,
    acres,
    loadCount:loads.length,
    totalWet,totalDry,avgDm,
    wetPerAcre:acres>0?totalWet/acres:null,
    dryPerAcre:acres>0?totalDry/acres:null,
    firstLoad:times.length?new Date(Math.min(...times)).toISOString():null,
    lastLoad:times.length?new Date(Math.max(...times)).toISOString():null,
    trucks:groupTotals(l=>truckDisplay(l)),
    storages:groupTotals(l=>storageDisplay(l)),
    notes:groupTotals(l=>noteDisplay(l)||'No note'),
    loads:loads.map(l=>({id:l.id,time:l.time,truckName:truckDisplay(l),driverName:l.driverName||'',fieldNote:noteDisplay(l),inoculated:wasInoculated(l),storageName:storageDisplay(l),type:l.type||'',wetWeight:Number(l.wetWeight)||0,dryWeight:Number(l.dryWeight)||0,dryMatter:Number(l.dryMatter)||0,unit:l.unit||state.unit}))
  };
}
