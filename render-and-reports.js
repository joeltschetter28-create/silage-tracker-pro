function archiveEntrySummaryText(e){
  return [
    'Field: '+e.fieldName,
    'Commodity: '+(commoditiesOn()?(e.commodityName||'None'):'Not tracked'),
    'Field note: '+(e.fieldNote?String(e.fieldNote).trim():'None'),
    'Loads: '+e.loadCount,
    ...(showWet()?['Total wet '+e.unit+': '+e.totalWet.toFixed(2)]:[]),
    ...(showDry()?['Total dry '+e.unit+': '+e.totalDry.toFixed(2)]:[]),
    'Average '+dmWordLower()+': '+(e.avgDm===null?'N/A':dmPct(e.avgDm)),
    'Field size: '+(e.acres>0?e.acres+' acres':'N/A'),
    'Yield per acre: '+perAcreText(e.wetPerAcre,e.dryPerAcre,e.unit)
  ].concat((()=>{const d=archiveHarvestDays(e);return d.length?['','Harvested on '+d.length+' day'+(d.length===1?'':'s')+':'].concat(d.map(x=>'  '+x.name+' \u2014 '+x.loads+' load'+(x.loads===1?'':'s')+', '+(weightView()==='dry'?x.dry.toFixed(2)+' dry ':x.wet.toFixed(2)+' wet ')+e.unit)):[]})()).join('\n');
}
// Files the summaries and clears the loads they cover. The loads go to Trash, where they can be
// restored for 30 days, which is what clearing a single field has always done.
function commitArchivedLoads(entries,loads){
  state.archive=[...entries,...(state.archive||[])];
  const ids=new Set(loads.map(l=>l.id));
  state.loads=state.loads.filter(l=>!ids.has(l.id));
  state.trash=state.trash||[];
  const now=new Date().toISOString();
  loads.forEach(l=>state.trash.push({...l,deletedAt:now}));
  save();
}
// Groups loads by the field they were carted from. Loads whose field has since been deleted stay
// together under the name recorded on the load, so nothing is dropped on the way to the Archive.
function groupLoadsByField(loads){
  const groups=new Map();
  loads.forEach(l=>{
    const key=l.fieldId||('name:'+(l.fieldName||''));
    if(!groups.has(key)){
      const f=(state.fields||[]).find(x=>x.id===l.fieldId);
      groups.set(key,{field:{id:l.fieldId||'',name:(f&&f.name)||l.fieldName||'Unassigned'},loads:[]});
    }
    groups.get(key).loads.push(l);
  });
  return [...groups.values()];
}
async function summarizeFieldAndClearLoads(){
  const fields=[...new Set((state.loads||[]).map(l=>l.fieldId).filter(Boolean))].map(id=>{
    const f=(state.fields||[]).find(x=>x.id===id); const c=f&&commoditiesOn()?commodityLabel(f.commodityId):''; return {id,name:f?.name||'Unknown field',commodity:c};
  });
  if(!fields.length){ alert('There are no loads assigned to a field.'); return; }
  const idx=await appChoose({title:'Summarize and clear which field?',options:fields.map(f=>f.name+(f.commodity?' ('+f.commodity+')':''))});
  if(idx<0)return;
  const field=fields[idx];
  if(licenseGraceInfo().locked)return requireActivation(summarizeFieldAndClearLoads);
  const loads=(state.loads||[]).filter(l=>l.fieldId===field.id);
  if(!loads.length){alert('No loads found for that field.');return;}
  const entry=buildFieldArchiveEntry(field,loads);
  alert(archiveEntrySummaryText(entry)+'\n\nThis summary is saved on the Archive page.');
  if(!(await uiConfirm(`Clear all ${loads.length} load(s) from "${field.name}"? The summary is kept on the Archive page and the loads are moved to Trash.`)))return;
  commitArchivedLoads([entry],loads);
  render();
  showToast('Field summary archived');
}
// End of season in one step: every field is summarised onto the Archive page and its loads cleared.
// Fields and their acres, trucks and their weights, storage locations, commodities and settings are
// all left exactly as they are, so the next season starts on the same setup.
async function clearAllLoadsToArchive(){
  if(licenseGraceInfo().locked)return requireActivation(clearAllLoadsToArchive);
  const loads=(state.loads||[]).slice();
  if(!loads.length){alert('There are no loads to clear.');return;}
  const entries=groupLoadsByField(loads).map(g=>buildFieldArchiveEntry(g.field,g.loads));
  const totalWet=entries.reduce((s,e)=>s+e.totalWet,0);
  const totalDry=entries.reduce((s,e)=>s+e.totalDry,0);
  const avgDm=totalWet>0?totalDry/totalWet*100:null;
  const lines=entries.map(e=>e.fieldName+(e.acres>0?' ('+e.acres+' acres)':'')+' — '+e.loadCount+' load(s), '+wd(e.totalWet,e.totalDry,e.unit)+(e.wetPerAcre===null?'':', '+perAcreText(e.wetPerAcre,e.dryPerAcre,e.unit))+(()=>{const d=archiveHarvestDays(e);return d.length?' · harvested '+d.map(x=>x.name).join(' · '):''})());
  alert('Clear All Loads\n\n'+lines.join('\n')+
    '\n\nAll fields: '+loads.length+' load(s), '+wd(totalWet,totalDry,state.unit)+', '+(avgDm===null?'N/A':dmPct(avgDm)+' average '+dmWordLower())+
    '\n\nEach field above is saved as its own summary on the Archive page.');
  if(!(await uiConfirm('Summarize '+entries.length+' field(s) to the Archive and clear all '+loads.length+' load(s)?\n\nFields and their acres, trucks and their weights, storage locations and commodities are all kept as they are. The cleared loads are moved to Trash, where they can be restored for 30 days.')))return;
  commitArchivedLoads(entries,loads);
  render();
  showToast(entries.length+' field'+(entries.length===1?'':'s')+' archived · '+loads.length+' load(s) cleared');
}
function toggleArchiveDetail(id){if(openArchiveDetails.has(id))openArchiveDetails.delete(id);else openArchiveDetails.add(id);renderArchive()}
function archiveRangeText(a){if(!a.firstLoad&&!a.lastLoad)return 'No load dates recorded';const first=a.firstLoad?fmtDateTime(a.firstLoad):'',last=a.lastLoad?fmtDateTime(a.lastLoad):'';return first===last?first:first+' – '+last}
function renderArchive(){
  const el=document.getElementById('archiveList');if(!el)return;
  const rows=(state.archive||[]).slice().sort((a,b)=>new Date(b.archivedAt)-new Date(a.archivedAt));
  if(!rows.length){el.innerHTML='<div class="card"><div class="empty">No archived fields yet. Use “Summarize Field &amp; Clear Loads” on the Reports page to archive one field, or “Clear All Loads” in Settings to archive every field at once.</div></div>';return}
  el.innerHTML=rows.map(a=>{
    const u=a.unit||state.unit,open=openArchiveDetails.has(a.id);
    const breakdown=(title,list)=>list&&list.length?'<div class="archive-breakdown"><label>'+title+'</label>'+list.map(x=>`<div class="field-total"><b>${esc(x.name)}</b><span>${x.loads} loads</span><span>${wd(x.wet,x.dry,esc(u))}</span></div>`).join('')+'</div>':'';
    const detail=a.loads&&a.loads.length?a.loads.slice().sort((x,y)=>new Date(y.time)-new Date(x.time)).map(l=>`<div class="recent-item"><div><div class="recent-main">${new Date(l.time).toLocaleString()} · ${esc(l.truckName)}${l.driverName?' · '+esc(l.driverName):''}</div><div class="recent-sub">${noteDisplay(l)?esc(noteDisplay(l))+' · ':''}${l.storageName?esc(l.storageName)+' · ':''}${esc(l.type)} · ${wLoadDetail(l,esc(l.unit||u))}${inoculantBadge(l)}</div></div></div>`).join(''):'<div class="empty">No individual loads were stored with this summary.</div>';
    return `<div class="card">
      <div class="recent-main" style="font-size:calc(19px * var(--text-scale))">${esc(a.fieldName)}${a.acres>0?' · '+money(a.acres)+' acres':''}</div>
      <div class="recent-sub">${a.commodityName&&commoditiesOn()?esc(a.commodityName)+' · ':''}Archived ${new Date(a.archivedAt).toLocaleString()} · Loads from ${esc(archiveRangeText(a))}</div>
      ${a.fieldNote?'<div class="recent-sub">'+esc(a.fieldNote)+'</div>':''}
      <div class="report-summary" style="margin-top:10px">
        <div class="stat"><small>Loads</small><span>${a.loadCount||0}</span></div>
        <div class="stat w-wet"><small>Wet ${esc(u)}</small><span>${money(a.totalWet)}</span></div>
        <div class="stat w-dry"><small>Dry ${esc(u)}</small><span>${money(a.totalDry)}</span></div>
        <div class="stat"><small>Average ${dmAbbr()}</small><span>${a.avgDm===null||a.avgDm===undefined?'N/A':dmPct(a.avgDm)}</span></div>
      </div>
      <div class="field-total" style="margin-top:10px"><b>Yield per acre</b><span class="w-wet">${a.wetPerAcre?money(a.wetPerAcre)+' wet '+esc(u):'N/A'}</span><span class="w-dry">${a.dryPerAcre?money(a.dryPerAcre)+' dry '+esc(u):'N/A'}</span></div>
      ${breakdown('Harvest Days',archiveHarvestDays(a))}
      ${breakdown('By Note',(a.notes||[]).length>1?a.notes:null)}
      ${breakdown('By Truck',a.trucks)}
      ${breakdown('By Storage',a.storages)}
      <button type="button" class="collapse-head" style="margin-top:12px" aria-expanded="${open}" onclick="toggleArchiveDetail('${a.id}')"><label style="margin:0">Loads in this summary (${(a.loads||[]).length})</label><span class="collapse-chevron">${open?'▴':'▾'}</span></button>
      <div class="collapse-body${open?' open':''}">${detail}</div>
      <div class="actions"><button class="btn small blue" onclick="exportArchiveCsv('${a.id}')">Export CSV</button><button class="btn small danger" onclick="deleteArchiveEntry('${a.id}')">Delete Summary</button></div>
    </div>`
  }).join('')
}
async function deleteArchiveEntry(id){
  if(licenseGraceInfo().locked)return requireActivation(()=>deleteArchiveEntry(id));
  const a=(state.archive||[]).find(x=>x.id===id);if(!a)return;
  if(!(await uiConfirm(`Delete the archived summary for "${a.fieldName}"? This cannot be undone.`)))return;
  state.archive=state.archive.filter(x=>x.id!==id);
  openArchiveDetails.delete(id);
  save();render();showToast('Archived summary deleted');
}
function exportArchiveCsv(id){
  const a=(state.archive||[]).find(x=>x.id===id);if(!a)return;
  const u=a.unit||state.unit;
  const lines=[
    'Field,'+q(a.fieldName),
    'Commodity,'+q(a.commodityName||''),
    'Field note,"'+q(a.fieldNote||'')+'"',
    'Archived,'+q(new Date(a.archivedAt).toLocaleString()),
    'Loads,'+(a.loadCount||0),
    'Total wet ('+u+'),'+money(a.totalWet),
    'Total dry ('+u+'),'+money(a.totalDry),
    'Average DM (%),'+(a.avgDm===null||a.avgDm===undefined?'':money(a.avgDm)),
    'Field size (acres),'+(a.acres||''),
    'Wet per acre,'+(a.wetPerAcre?money(a.wetPerAcre):''),
    'Dry per acre,'+(a.dryPerAcre?money(a.dryPerAcre):''),
    '',
    'Date,Truck,Driver,Field Note,Storage,Type,Wet ('+u+'),DM (%),Dry ('+u+'),Inoculant'
  ];
  const spans=inoculantSpans();
  (a.loads||[]).forEach(l=>lines.push([new Date(l.time).toLocaleString(),l.truckName,l.driverName,noteDisplay(l),l.storageName,l.type,money(l.wetWeight),money(l.dryMatter),money(l.dryWeight),inoculantWord(l,spans)].map(v=>'"'+q(v)+'"').join(',')));
  const blob=new Blob([lines.join('\n')],{type:'text/csv'}),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download='Silage_Archive_'+String(a.fieldName||'field').replace(/[^a-z0-9]+/gi,'_')+'_'+safeFileDate()+'.csv';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  showToast('Archive CSV exported');
}
async function restoreAllTrash(){
  const items=state.trash||[];
  if(!items.length){alert('Trash is already empty.');return;}
  if(!(await uiConfirm(`Restore all ${items.length} deleted load(s)?`)))return;
  state.loads=state.loads||[];
  items.forEach(l=>{const c={...l};delete c.deletedAt;state.loads.push(c);});
  state.trash=[];
  save();render();
}
async function deleteAllTrash(){
  const n=(state.trash||[]).length;
  if(!n){alert('Trash is already empty.');return;}
  if(!(await uiConfirm(`Permanently delete all ${n} load(s) in Trash? This cannot be undone.`)))return;
  if(!(await uiConfirm('FINAL WARNING: Permanently erase every load in Trash?')))return;
  state.trash=[];
  save();render();
}
async function clearInoculantEvents(){
  if(licenseGraceInfo().locked)return requireActivation(clearInoculantEvents);
  const n=(state.counter?.events||[]).length;
  if(!n){alert('There are no inoculant events to clear.');return;}
  if(!(await uiConfirm(`Clear all ${n} inoculant event(s)? This cannot be undone unless you have a backup.`)))return;
  if(state.counter)state.counter.events=[];
  save();render();
}
function render(){
  bindV18SettingsPage();bindAppearancePage();applySettings();applyCommodityVisibility();applyDmDisplay();applyTopStats();recalculateLoads();syncCounterState();renderFields();renderStorages();renderTrucks();applyTruckLayout();renderLastLoadCards();renderRecent();renderSetup();renderReports();renderTrash();renderManualSelects();renderDataSafety();renderCounter();renderCounterLog();renderEditLogs();renderArchive();renderLicenseBanner();renderHeaderFarmName();updateBatchSelection();bindFloatFields();bindTodayPage();renderTodayPage();applyTopStatsOrder();applyTopStatsLayout();applyTodayStatOrder();renderDayStartChoices();applyWeightViewAppearance();if(pageEditingTruckId&&document.getElementById('truckEdit')?.classList.contains('active'))renderPageTruckWeightHistory()
}
// A purely informational reminder on the Loads page during the grace period -- nothing is
// blocked yet, so there's nothing to explain beyond "renew soon." Once actually locked, there's
// no special page state to announce; the prompt shows itself the moment something is attempted.
function renderLicenseBanner(){
  const info=licenseGraceInfo();
  const loadsEl=document.getElementById('licenseBanner');
  if(!loadsEl)return;
  if(info.inGrace){loadsEl.style.display='block';const t=document.getElementById('licenseBannerText');if(t){const left=info.daysLeft===0?'last day':info.daysLeft+' day'+(info.daysLeft===1?'':'s')+' left';t.textContent=info.legacy?(info.daysLeft===0?'Free use ends today. Activate with your farm name and code in Settings.':'Free use ends '+fmtLicenseDate(info.expiresAt)+' \u2014 '+left+'. Activate with your farm name and code in Settings.'):'Activation expired '+fmtLicenseDate(info.expiresAt)+' \u2014 '+(info.daysLeft===0?'today is the last day':left)+' before a code is needed to log a load or make changes. Enter a new code in Settings.'}}
  else{loadsEl.style.display='none'}
}
function renderStorages(){const sel=document.getElementById('storageSelect'),old=sel.value||state.lastStorageId;sel.innerHTML=state.storages.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');if(state.storages.some(x=>x.id===old))sel.value=old;else if(state.storages[0])sel.value=state.storages[0].id}
function renderFields(){const sel=document.getElementById('fieldSelect'),old=sel.value||state.lastFieldId;sel.innerHTML=state.fields.map(f=>`<option value="${f.id}">${esc(f.name)}</option>`).join('');if(state.fields.some(f=>f.id===old))sel.value=old;else if(state.fields[0])sel.value=state.fields[0].id;state.lastFieldId=sel.value||'';renderCurrentCommodityNote()}
function renderCurrentCommodityNote(){const el=document.getElementById('currentCommodityNote');if(!el)return;const f=currentField();if(!f){el.innerHTML='';return}const cid=fieldCommodityId(f.id);const main=!commoditiesOn()?'':cid?('Carting '+commodityLabel(cid)+' — truck weights come from the '+commodityLabel(cid)+' tab.'):((state.commodities||[]).length?'This field has no commodity, so trucks use their '+DEFAULT_COMMODITY_LABEL+' weights. Set one in Setup → Fields → Edit.':'No commodities set up yet. Add them in Setup to keep a separate truck weight per commodity.');const note=fieldNoteFor(f.id);el.innerHTML=(main?esc(main)+'<br>':'')+(note?'Loads recorded now are marked <b>'+esc(note)+'</b>.':'This field has no note, so nothing marks which cut these loads belong to. Add one in Setup → Fields → Edit.')}
function renderTrucks(){const g=document.getElementById('truckGrid');const active=state.trucks.filter(t=>t.active!==false).sort((a,b)=>a.order-b.order);g.innerHTML=active.length?active.map(t=>{const loads=state.loads.filter(x=>x.truckId===t.id).sort((a,b)=>new Date(b.time)-new Date(a.time));const last=loads[0]||null;const today=new Date();const stamp=l=>{if(!l)return '';const d=new Date(l.time);if(d.getFullYear()!==today.getFullYear()||d.getMonth()!==today.getMonth()||d.getDate()!==today.getDate())return '';return d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});};const lastStamp=stamp(last);return `<button class="truck-button" data-id="${t.id}" style="border-color:${t.primaryColor}"><div class="truck-head" style="background:${t.primaryColor}">${esc(t.name)}</div><div class="truck-action" style="background:${t.secondaryColor};color:${contrast(t.secondaryColor)}"><div>${t.driver?esc(t.driver):'No driver assigned'}${lastStamp?`<span class="truck-last-load">${esc(lastStamp)}</span>`:''}</div></div></button>`}).join(''):'<div class="empty">No active trucks. Activate one in Setup.</div>';bindTruckPresses()}
function contrast(hex){hex=String(hex||'#000').replace('#','');if(hex.length===3)hex=hex.split('').map(x=>x+x).join('');const n=parseInt(hex,16),r=(n>>16)&255,g=(n>>8)&255,b=n&255;return (r*299+g*587+b*114)/1000>150?'#111':'#fff'}
function dayLabel(iso){const d=new Date(iso);if(!Number.isFinite(d.getTime()))return '';const startOf=x=>new Date(x.getFullYear(),x.getMonth(),x.getDate()).getTime();const now=new Date();const diff=Math.round((startOf(now)-startOf(d))/86400000);if(diff===0)return '';if(diff===1)return 'Yesterday';if(diff===-1)return 'Tomorrow';const opts={month:'short',day:'numeric'};if(d.getFullYear()!==now.getFullYear())opts.year='numeric';return d.toLocaleDateString([],opts)}
function renderLastLoadCards(){const active=state.trucks.filter(t=>t.active!==false).sort((a,b)=>(a.order||0)-(b.order||0));const el=document.getElementById('lastLoadCards');if(!el)return;el.innerHTML=active.length?active.map(t=>{const loads=state.loads.filter(x=>x.truckId===t.id).sort((a,b)=>new Date(b.time)-new Date(a.time)).slice(0,2);const stamp=(l,label)=>{if(!l)return `<div class="last-load-entry"><span class="last-load-label">${label}</span><span class="last-load-time">—</span><div class="last-load-meta">No load</div></div>`;const day=dayLabel(l.time);return `<div class="last-load-entry"><span class="last-load-label">${label}</span><span class="last-load-time">${new Date(l.time).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</span>${day?`<div class="last-load-day">${esc(day)}</div>`:''}<div class="last-load-meta">${esc(l.type)} · ${esc(loadWText(l))}</div></div>`};const cyc=truckCycleStats(t.id);const cycleLine=cyc.sampleGaps?`<div class="last-load-cycle"><span title="Time since the previous load">Cycle ${esc(fmtDuration(cyc.lastMinutes))}</span><span title="Average of the last ${cyc.sampleGaps} cycle${cyc.sampleGaps===1?'':'s'}">Avg ${esc(fmtDuration(cyc.avgMinutes))}</span></div>`:'';return `<div class="last-load-card" style="border-color:${esc(t.primary||'#1f7a3f')}"><div class="last-load-truck">${esc(t.name)}</div>${stamp(loads[0],'Last')}${stamp(loads[1],'Previous')}${cycleLine}</div>`}).join(''):'<div class="empty">No active trucks.</div>'}
function renderRecent(){const spans=inoculantSpans();const f=currentField(),loads=f?state.loads.filter(l=>l.fieldId===f.id):[];const totalWet=loads.reduce((s,l)=>s+Number(l.wetWeight),0);document.getElementById('fieldLoads').textContent=loads.length;document.getElementById('fieldTonnes').textContent=money(totalWet);const rateEl=document.getElementById('fieldRate');if(rateEl){const windowHrs=clampRateWindowHours(state.rateWindowHours);const rateLoads=windowHrs>0?loads.filter(l=>Date.now()-new Date(l.time).getTime()<=windowHrs*3600000):loads;const rateWet=wSum(rateLoads);const rate=harvestRatePerHour(rateLoads.map(l=>l.time),rateWet);rateEl.textContent=rate!==null?money(rate)+' '+state.unit+'/hr':'—'}const dryEl=document.getElementById('fieldDryTonnes');if(dryEl)dryEl.textContent=money(loads.reduce((s,l)=>s+Number(l.dryWeight),0));const r=state.loads.slice(0,12);document.getElementById('recentLoads').innerHTML=r.length?r.map(l=>`<div class="recent-item" data-load-id="${l.id}"><div style="display:flex;align-items:flex-start;gap:7px"><input class="load-select${loadSelectionMode?'':' selection-hidden'}" type="checkbox" data-load-select="${l.id}" onchange="updateBatchSelection()"><div><div class="recent-main">${fmtDateTime(l.time)} · ${esc(truckDisplay(l))}${l.driverName?' · '+esc(l.driverName):''} · ${esc(l.type)} · ${esc(loadWText(l))}</div><div class="recent-sub">${esc(fieldDisplay(l))}${commodityChip(l)?' · '+esc(commodityChip(l)):''}${noteDisplay(l)?' · '+esc(noteDisplay(l)):''}${storageDisplay(l)?' · '+esc(storageDisplay(l)):''} · ${dmChip(l.dryMatter)}${inoculantBadge(l,spans)}${importedBadge(l)}</div></div></div><div class="edit-load-actions"><button class="btn small grey delete" onclick="openEditLoad('${l.id}')">Edit</button><button class="btn small danger delete" onclick="deleteLoad('${l.id}')">Delete</button></div></div>`).join(''):'<div class="empty">No loads yet.</div>'}
function renderSetup(){document.getElementById('truckList').innerHTML=state.trucks.length?state.trucks.slice().sort((a,b)=>(a.order||0)-(b.order||0)).map(t=>`<div class="rowitem truck-setup-row" data-truck-id="${t.id}" onclick="openTruckEditPage('${t.id}')"><div><b>${esc(t.name)}</b><div class="recent-sub">${esc(t.driver||'Not assigned')} · Full load ${money(t.fullWeight)} ${state.unit}</div></div><div class="truck-setup-actions" onclick="event.stopPropagation()"><label class="switch" title="Activate/deactivate"><input type="checkbox" ${t.active!==false?'checked':''} onchange="toggleTruckActive('${t.id}')"><span class="slider"></span></label><button class="btn small grey" onclick="moveTruck('${t.id}',-1)">↑</button><button class="btn small grey" onclick="moveTruck('${t.id}',1)">↓</button></div></div>`).join(''):'<div class="empty">No trucks.</div>';document.getElementById('fieldList').innerHTML=state.fields.length?state.fields.map(f=>`<div class="rowitem"><div><b>${esc(f.name)}</b><div class="recent-sub">${f.size?money(f.size)+' acres':'Size not entered'}${commoditiesOn()?' · '+(f.commodityId?esc(commodityLabel(f.commodityId)):'No commodity'):''}${f.note?' · '+esc(f.note):''}</div></div><div><button class="btn small grey" onclick="editField('${f.id}')">Edit</button> <button class="btn small danger" onclick="deleteField('${f.id}')">Delete</button></div></div>`).join(''):'<div class="empty">No fields.</div>';renderCommoditySetup();const list=state.dmReadings.slice().sort((a,b)=>new Date(b.effective)-new Date(a.effective));document.getElementById('dmList').innerHTML=list.map(r=>`<div class="dm-reading"><div class="dm-value">${dmPct(r.value)} ${dmAbbr()}</div><div class="recent-sub">Effective ${new Date(r.effective).toLocaleString()}</div>${r.effective.startsWith('1970-')?'':`<button class="btn small danger" onclick="deleteDM('${r.id}')">Delete</button>`}</div>`).join('');document.getElementById('unitSelect').value=state.unit;document.getElementById('storageList').innerHTML=state.storages.length?state.storages.map(x=>`<div class="rowitem"><b>${esc(x.name)}</b><div><button class="btn small grey" onclick="editStorage('${x.id}')">Edit</button> <button class="btn small danger" onclick="deleteStorage('${x.id}')">Delete</button></div></div>`).join(''):'<div class="empty">No storage locations.</div>';if(!document.getElementById('dmEffective').value)document.getElementById('dmEffective').value=localInputValue(new Date(Date.now()-60*60000));renderDmSummary(list)}
function renderDmSummary(list){const readings=list||state.dmReadings.slice().sort((a,b)=>new Date(b.effective)-new Date(a.effective));const active=effectiveDMReading(new Date().toISOString())||readings[0]||null;const v=document.getElementById('dmCurrentValue'),m=document.getElementById('dmCurrentMeta');if(v)v.textContent=active?dmPct(active.value)+' '+dmAbbr():'No reading';if(m)m.textContent=active?(String(active.effective).startsWith('1970-')?'Starting default · tap to add a reading':'Effective '+new Date(active.effective).toLocaleString()):'Tap to add your first reading';applyDmCollapse()}
function applyDmCollapse(){const body=document.getElementById('dmBody'),head=document.getElementById('dmToggle'),ch=document.getElementById('dmChevron');const open=!state.dmCollapsed;if(body)body.classList.toggle('open',open);if(head)head.setAttribute('aria-expanded',open?'true':'false');if(ch)ch.textContent=open?'▴':'▾'}
function toggleDmSection(){state.dmCollapsed=!state.dmCollapsed;localStorage.setItem(KEY,JSON.stringify(state));applyDmCollapse()}
function updateTruckPreview(prefix){const name=document.getElementById(prefix+'Name')?.value.trim()||'Truck Preview',driver=document.getElementById(prefix+'Driver')?.value.trim()||'Assigned Driver',p=document.getElementById(prefix+'Primary')?.value||'#1f7a3f',q=document.getElementById(prefix+'Secondary')?.value||'#14532d',box=document.getElementById(prefix+'Preview');if(!box)return;box.style.borderColor=p;const h=box.querySelector('.truck-preview-head'),b=box.querySelector('.truck-preview-body');h.textContent=name;h.style.background=p;h.style.color=contrastText(p);b.textContent=driver;b.style.background=q;b.style.color=contrastText(q)}
 function editTruck(id){const t=state.trucks.find(x=>x.id===id);if(!t)return;editingTruckId=id;document.getElementById('editTruckName').value=t.name;document.getElementById('editTruckDriver').value=t.driver||'';document.getElementById('editTruckWeight').value=t.fullWeight;document.getElementById('editTruckPrimary').value=t.primaryColor||'#1f7a3f';document.getElementById('editTruckSecondary').value=t.secondaryColor||'#14532d';updateTruckPreview('editTruck');bindFloatFields();document.getElementById('editTruckModal').classList.add('show')}
 function saveEditedTruck(){const t=state.trucks.find(x=>x.id===editingTruckId);if(!t)return;const n=document.getElementById('editTruckName').value.trim(),w=Number(document.getElementById('editTruckWeight').value);if(!n||!w||w<=0)return alert('Check truck name and full load weight.');t.name=n;t.driver=document.getElementById('editTruckDriver').value.trim();t.fullWeight=w;t.primaryColor=document.getElementById('editTruckPrimary').value;t.secondaryColor=document.getElementById('editTruckSecondary').value;editingTruckId=null;save();closeModal('editTruckModal');render()}
function toggleTruckActive(id){const t=state.trucks.find(x=>x.id===id);if(!t)return;t.active=t.active===false;save();render();showToast(t.active?'Truck activated':'Truck hidden from Loads')}
function moveTruck(id,dir){const i=state.trucks.findIndex(x=>x.id===id),j=i+dir;if(i<0||j<0||j>=state.trucks.length)return;[state.trucks[i],state.trucks[j]]=[state.trucks[j],state.trucks[i]];state.trucks.forEach((t,k)=>t.order=k);save();render()}
async function deleteTruck(id){if(licenseGraceInfo().locked)return requireActivation(()=>deleteTruck(id));const t=state.trucks.find(x=>x.id===id);if((await uiConfirm('Delete '+(t?t.name:'truck')+'? Old loads stay in history.'))){state.trucks=state.trucks.filter(x=>x.id!==id);save();render();return true}return false}
function renderCommoditySetup(){const el=document.getElementById('commodityList');if(el){const list=state.commodities||[];el.innerHTML=list.length?list.map(c=>{const fields=state.fields.filter(f=>f.commodityId===c.id).length,weights=(state.loadWeightHistory||[]).filter(r=>r.commodityId===c.id).length;return `<div class="rowitem"><div><b>${esc(c.name)}</b><div class="recent-sub">${fields} field${fields===1?'':'s'} · ${weights} truck weight${weights===1?'':'s'}</div></div><div class="truck-setup-actions"><button class="btn small grey" onclick="moveCommodity('${c.id}',-1)">↑</button><button class="btn small grey" onclick="moveCommodity('${c.id}',1)">↓</button><button class="btn small grey" onclick="editCommodity('${c.id}')">Edit</button> <button class="btn small danger" onclick="deleteCommodity('${c.id}')">Delete</button></div></div>`}).join(''):'<div class="empty">No commodities yet. Add one to give fields a commodity and trucks a weight tab.</div>'}const add=document.getElementById('newFieldCommodity');if(add){const old=add.value;add.innerHTML=commoditySelectOptions(old,{noneLabel:'No commodity'});add.value=commodityById(old)?old:''}}
function editField(id){const f=state.fields.find(x=>x.id===id);if(!f)return;editingFieldId=id;document.getElementById('editFieldTitle').textContent='Edit '+f.name;document.getElementById('editFieldName').value=f.name;document.getElementById('editFieldSize').value=f.size||'';document.getElementById('editFieldNote').value=f.note||'';fillEditFieldCommodity(f.commodityId||'');document.getElementById('editFieldModal').classList.add('show')}
function fillEditFieldCommodity(selected){const sel=document.getElementById('editFieldCommodity');if(!sel)return;sel.innerHTML=commoditySelectOptions(selected,{noneLabel:'No commodity'});sel.value=commodityById(selected)?selected:''}
function saveEditedField(){if(licenseGraceInfo().locked)return requireActivation(saveEditedField);const f=state.fields.find(x=>x.id===editingFieldId);if(!f)return;const name=document.getElementById('editFieldName').value.trim();if(!name)return alert('Enter a field name.');const size=Number(document.getElementById('editFieldSize').value||0);if(!Number.isFinite(size)||size<0)return alert('Enter a valid field size in acres.');f.name=name;f.size=size;f.note=document.getElementById('editFieldNote').value.trim();f.commodityId=document.getElementById('editFieldCommodity').value||'';editingFieldId=null;save();closeModal('editFieldModal');render();showToast('Field saved')}
async function deleteField(id){if(licenseGraceInfo().locked)return requireActivation(()=>deleteField(id));const f=state.fields.find(x=>x.id===id);if((await uiConfirm('Delete '+(f?f.name:'field')+'? Old loads stay in history.'))){state.fields=state.fields.filter(x=>x.id!==id);if(state.lastFieldId===id)state.lastFieldId=state.fields[0]?.id||'';save();render()}}
async function deleteDM(id){if(licenseGraceInfo().locked)return requireActivation(()=>deleteDM(id));if((await uiConfirm('Delete this '+dmWordLower()+' reading? Existing loads will keep their stored result; future loads will use the remaining readings.'))){state.dmReadings=state.dmReadings.filter(r=>r.id!==id);save();render()}}
function renderManualSelects(){document.getElementById('manualField').innerHTML=state.fields.map(f=>`<option value="${f.id}">${esc(f.name)}</option>`).join('');document.getElementById('manualStorage').innerHTML=state.storages.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');document.getElementById('manualStorage').value=state.lastStorageId||'';if(state.fields.some(f=>f.id===state.lastFieldId))document.getElementById('manualField').value=state.lastFieldId;document.getElementById('manualTruck').innerHTML=state.trucks.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('')}
// The filtered load list is read for very different questions - what came in last, which
// load was heaviest, how one field compares - so the order is a saved view preference
// rather than a filter, and it survives reloads and page switches.
function reportSortOptions(){return [['time-desc','Newest first'],['time-asc','Oldest first'],['wet-desc','Wet weight (high to low)'],['wet-asc','Wet weight (low to high)'],['dry-desc','Dry weight (high to low)'],['dry-asc','Dry weight (low to high)'],['dm-desc',dmWord()+' % (high to low)'],['dm-asc',dmWord()+' % (low to high)'],['field-asc','Field (A to Z)'],['truck-asc','Truck (A to Z)'],['driver-asc','Driver (A to Z)']]}
function currentReportSort(){const el=document.getElementById('reportSort');const v=(el&&el.value)||state.reportSort||'time-desc';return reportSortOptions().some(o=>o[0]===v)?v:'time-desc'}
function loadDriverName(l){return l.driverName||truckForLoad(l)?.driver||''}
function sortReportRows(rows,key){const time=l=>new Date(l.time).getTime()||0;const num=(l,f)=>Number(f(l))||0;const text=(a,b)=>String(a||'').localeCompare(String(b||''),undefined,{sensitivity:'base'});const byTimeDesc=(a,b)=>time(b)-time(a);const out=rows.slice();switch(key){
case 'time-asc':out.sort((a,b)=>time(a)-time(b));break;
case 'wet-desc':out.sort((a,b)=>num(b,l=>l.wetWeight)-num(a,l=>l.wetWeight)||byTimeDesc(a,b));break;
case 'wet-asc':out.sort((a,b)=>num(a,l=>l.wetWeight)-num(b,l=>l.wetWeight)||byTimeDesc(a,b));break;
case 'dry-desc':out.sort((a,b)=>num(b,l=>l.dryWeight)-num(a,l=>l.dryWeight)||byTimeDesc(a,b));break;
case 'dry-asc':out.sort((a,b)=>num(a,l=>l.dryWeight)-num(b,l=>l.dryWeight)||byTimeDesc(a,b));break;
case 'dm-desc':out.sort((a,b)=>num(b,l=>l.dryMatter)-num(a,l=>l.dryMatter)||byTimeDesc(a,b));break;
case 'dm-asc':out.sort((a,b)=>num(a,l=>l.dryMatter)-num(b,l=>l.dryMatter)||byTimeDesc(a,b));break;
case 'field-asc':out.sort((a,b)=>text(fieldDisplay(a),fieldDisplay(b))||byTimeDesc(a,b));break;
case 'truck-asc':out.sort((a,b)=>text(truckDisplay(a),truckDisplay(b))||byTimeDesc(a,b));break;
case 'driver-asc':out.sort((a,b)=>text(loadDriverName(a),loadDriverName(b))||byTimeDesc(a,b));break;
default:out.sort(byTimeDesc)}
return out}
function reportFilterDefs(){
  const drivers=[...new Set(state.trucks.map(t=>t.driver).concat(state.loads.map(l=>loadDriverName(l))).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),undefined,{sensitivity:'base'}));
  const commodityItems=(state.commodities||[]).map(c=>({value:c.id,label:c.name}));
  if(state.loads.some(l=>!l.commodityId))commodityItems.push({value:NO_COMMODITY,label:'No commodity'});
  // Notes come from the fields as they read now plus the notes already stamped on loads, so a cut
  // stays filterable after its field has been renamed, re-noted, or deleted outright.
  const noteItems=[...new Set(state.fields.map(f=>String(f.note||'').trim()).concat(state.loads.map(l=>noteDisplay(l))).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{sensitivity:'base',numeric:true})).map(n=>({value:n,label:n}));
  if(state.loads.some(l=>!noteDisplay(l)))noteItems.push({value:NO_NOTE,label:'No note'});
  return [
    {key:'fields',label:'Field',allLabel:'All fields',plural:'fields',items:state.fields.map(f=>({value:f.id,label:f.name}))},
    {key:'commodities',label:'Commodity',allLabel:'All commodities',plural:'commodities',items:commodityItems},
    {key:'notes',label:'Field Note',allLabel:'All notes',plural:'notes',items:noteItems},
    {key:'storages',label:'Storage',allLabel:'All storage',plural:'locations',items:state.storages.map(x=>({value:x.id,label:x.name}))},
    {key:'trucks',label:'Truck',allLabel:'All trucks',plural:'trucks',items:state.trucks.map(t=>({value:t.id,label:t.name}))},
    {key:'drivers',label:'Driver',allLabel:'All drivers',plural:'drivers',items:drivers.map(d=>({value:d,label:d}))}
  ].filter(def=>def.key!=='commodities'||commoditiesOn());
}
function selectionFor(def){return (reportSelections[def.key]||[]).filter(v=>def.items.some(i=>i.value===v))}
function msToggleText(def){const sel=selectionFor(def);if(!sel.length)return def.allLabel;if(sel.length===1)return def.items.find(i=>i.value===sel[0]).label;return sel.length+' '+def.plural}
function reportFilterSummaryText(){const parts=reportFilterDefs().map(def=>{const sel=selectionFor(def);if(!sel.length)return '';return def.label+': '+def.items.filter(i=>sel.includes(i.value)).map(i=>i.label).join(', ')}).filter(Boolean);const from=document.getElementById('reportFrom')?.value||'',to=document.getElementById('reportTo')?.value||'';if(from||to)parts.push('Dates: '+(from?new Date(from+'T00:00:00').toLocaleDateString():'start')+' to '+(to?new Date(to+'T00:00:00').toLocaleDateString():'today'));return parts.length?'Filtering by '+parts.join(' · '):'No filters applied — every load is included.'}
function renderReportFilters(){
  const grid=document.getElementById('reportFilterGrid');
  if(grid)grid.innerHTML=reportFilterDefs().map(def=>{
    const sel=selectionFor(def);reportSelections[def.key]=sel;
    const open=openFilterKeys.has(def.key);
    const options=def.items.length?def.items.map(i=>`<label class="ms-option"><input type="checkbox" data-ms-key="${def.key}" value="${esc(i.value)}"${sel.includes(i.value)?' checked':''}><span>${esc(i.label)}</span></label>`).join(''):`<div class="ms-empty">Nothing to filter on yet.</div>`;
    return `<div class="ms" data-ms="${def.key}"><label>${esc(def.label)}</label><button type="button" class="ms-toggle${sel.length?' ms-has-selection':''}" data-ms-toggle="${def.key}" aria-expanded="${open?'true':'false'}"><span class="ms-text">${esc(msToggleText(def))}</span><span class="ms-caret">${open?'▴':'▾'}</span></button><div class="ms-panel${open?' open':''}"><div class="ms-tools"><button type="button" class="btn small grey" data-ms-all="${def.key}">Select all</button><button type="button" class="btn small grey" data-ms-none="${def.key}">Clear</button></div>${options}</div></div>`
  }).join('');
  const se=document.getElementById('reportSort');if(se){const cur=currentReportSort();const opts=reportSortOptions();if(se.options.length!==opts.length||se.dataset.dmMode!==state.dmDisplayMode){se.innerHTML=opts.map(o=>`<option value="${o[0]}">${esc(o[1])}</option>`).join('');se.dataset.dmMode=state.dmDisplayMode}se.value=cur}
  const sum=document.getElementById('reportFilterSummary');if(sum)sum.textContent=reportFilterSummaryText();
}
function refreshFilterLabels(){reportFilterDefs().forEach(def=>{const box=document.querySelector(`.ms[data-ms="${def.key}"]`);if(!box)return;const txt=box.querySelector('.ms-text'),btn=box.querySelector('.ms-toggle');if(txt)txt.textContent=msToggleText(def);if(btn)btn.classList.toggle('ms-has-selection',selectionFor(def).length>0)});const sum=document.getElementById('reportFilterSummary');if(sum)sum.textContent=reportFilterSummaryText()}
function clearReportSelections(){Object.keys(reportSelections).forEach(k=>reportSelections[k]=[]);openFilterKeys.clear()}
function bindReportFilterEvents(){
  const grid=document.getElementById('reportFilterGrid');if(!grid)return;
  grid.addEventListener('click',e=>{
    const toggle=e.target.closest('[data-ms-toggle]');
    if(toggle){const k=toggle.dataset.msToggle;if(openFilterKeys.has(k))openFilterKeys.delete(k);else{openFilterKeys.clear();openFilterKeys.add(k)}renderReportFilters();return}
    const all=e.target.closest('[data-ms-all]');
    if(all){const def=reportFilterDefs().find(d=>d.key===all.dataset.msAll);if(def)reportSelections[def.key]=def.items.map(i=>i.value);renderReportFilters();renderReportResults();return}
    const none=e.target.closest('[data-ms-none]');
    if(none){reportSelections[none.dataset.msNone]=[];renderReportFilters();renderReportResults()}
  });
  grid.addEventListener('change',e=>{
    const box=e.target.closest('input[data-ms-key]');if(!box)return;
    const key=box.dataset.msKey,value=box.value,cur=reportSelections[key]||[];
    reportSelections[key]=box.checked?[...new Set([...cur,value])]:cur.filter(v=>v!==value);
    refreshFilterLabels();renderReportResults();
  });
  document.addEventListener('click',e=>{if(!openFilterKeys.size)return;if(e.target.closest('.ms'))return;openFilterKeys.clear();renderReportFilters()});
}
function reportRows(){let rows=state.loads.slice();const sel=reportSelections,from=document.getElementById('reportFrom')?.value||'',to=document.getElementById('reportTo')?.value||'';if(sel.fields.length)rows=rows.filter(l=>sel.fields.includes(l.fieldId));if(commoditiesOn()&&sel.commodities.length)rows=rows.filter(l=>sel.commodities.includes(l.commodityId||NO_COMMODITY));if(sel.notes.length)rows=rows.filter(l=>sel.notes.includes(noteDisplay(l)||NO_NOTE));if(sel.storages.length)rows=rows.filter(l=>sel.storages.includes(l.storageId));if(sel.trucks.length)rows=rows.filter(l=>sel.trucks.includes(l.truckId));if(sel.drivers.length)rows=rows.filter(l=>sel.drivers.includes(loadDriverName(l)));if(from)rows=rows.filter(l=>harvestDayKey(l.time)>=from);if(to)rows=rows.filter(l=>harvestDayKey(l.time)<=to);return sortReportRows(rows,currentReportSort())}
function renderReports(){renderReportFilters();renderReportResults()}
function renderReportResults(){const spans=inoculantSpans();const rows=reportRows(),wet=rows.reduce((s,l)=>s+Number(l.wetWeight),0),dry=rows.reduce((s,l)=>s+Number(l.dryWeight),0),avg=wet?dry/wet*100:0;document.getElementById('reportLoadCount').textContent=rows.length;document.getElementById('reportWet').textContent=money(wet)+' '+state.unit;document.getElementById('reportDry').textContent=money(dry)+' '+state.unit;document.getElementById('reportDm').textContent=dmPct(avg);// Grouped by field and note together, because one field carted over two cuts is two separate
// harvests and lumping them into a single total is exactly what the notes are there to prevent.
// Two different numbers, on purpose. "Time between loads" is the gap between one dump at the
// pile and the next, whoever hauled it -- with several trucks staggered, this is shorter than
// any single truck's own trip, since the pile sees a delivery far more often than one truck
// makes it back. "Average Cycle Time" is what a truck actually experiences: each truck's own
// average time between its own consecutive loads for this field (time out and back, including
// the drive), then averaged across every truck that worked the field so one number represents
// a typical round trip here -- the figure worth weighing against the field's real distance.
const totals={};rows.forEach(l=>{const key=(l.fieldId||('legacy:'+l.fieldName))+'|'+noteDisplay(l);if(!totals[key])totals[key]={loads:0,wet:0,dry:0,fieldId:l.fieldId,name:fieldDisplay(l),commodity:commodityChip(l),note:noteDisplay(l),times:[],trucks:{}};totals[key].loads++;totals[key].wet+=Number(l.wetWeight);totals[key].dry+=Number(l.dryWeight);totals[key].times.push(l.time);const tk=l.truckId||('legacy:'+l.truckName);if(!totals[key].trucks[tk])totals[key].trucks[tk]=[];totals[key].trucks[tk].push(l.time)});const keys=Object.keys(totals);
document.getElementById('fieldTotals').innerHTML=keys.length?keys.map(k=>{const row=totals[k],f=state.fields.find(x=>x.id===row.fieldId),size=Number(f&&f.size)||0,perAcre=size?' \u00b7 '+wd(row.wet/size,row.dry/size)+' per acre':'';const betweenLoads=avgCycleMinutesFromTimes(row.times);const perTruckAvgs=Object.values(row.trucks).map(avgCycleMinutesFromTimes).filter(v=>v!==null);const avgCycleTime=perTruckAvgs.length?perTruckAvgs.reduce((s,m)=>s+m,0)/perTruckAvgs.length:null;const rate=harvestRatePerHour(row.times,weightView()==='dry'?row.dry:row.wet);const cycleBits=[];if(betweenLoads!==null)cycleBits.push('Time between loads: '+fmtDuration(betweenLoads));if(avgCycleTime!==null)cycleBits.push('Average Cycle Time: '+fmtDuration(avgCycleTime));if(rate!==null)cycleBits.push('Rate: '+money(rate)+' '+state.unit+'/hr');{const hd=harvestDaysText(row.times);if(hd)cycleBits.push('Harvested: '+esc(hd))}const cycleLine=cycleBits.length?`<div class="field-cycle-line">${cycleBits.map(b=>`<span>${b}</span>`).join('')}</div>`:'';return `<div class="field-total${cycleLine?' no-border':''}"><b>${esc(row.name)}${row.note?' — '+esc(row.note):''}${size?` (${money(size)} acres)`:''}</b><span>${row.commodity?esc(row.commodity)+' · ':''}${row.loads} loads</span><span>${wd(row.wet,row.dry)}${perAcre}</span></div>${cycleLine}`}).join(''):'<div class="empty">No totals for these filters.</div>';
document.getElementById('allLoads').innerHTML=rows.length?rows.map(l=>`<div class="recent-item" data-load-id="${l.id}"><div style="display:flex;align-items:flex-start;gap:7px"><input class="report-load-select${reportSelectionMode?'':' selection-hidden'}" type="checkbox" data-load-select="${l.id}" onchange="updateBatchSelection()"><div><div class="recent-main">${new Date(l.time).toLocaleString()} · ${esc(fieldDisplay(l))} · ${esc(truckDisplay(l))}${l.driverName?' · '+esc(l.driverName):''}</div><div class="recent-sub">${commodityChip(l)?esc(commodityChip(l))+' · ':''}${noteDisplay(l)?esc(noteDisplay(l))+' · ':''}${storageDisplay(l)?esc(storageDisplay(l))+' · ':''}${esc(l.type)} · ${wLoadDetail(l)}${inoculantBadge(l,spans)}${importedBadge(l)}</div></div></div><div class="edit-load-actions"><button class="btn small grey delete" onclick="openEditLoad('${l.id}')">Edit</button><button class="btn small danger delete" onclick="deleteLoad('${l.id}')">Trash</button></div></div>`).join(''):'<div class="empty">No loads for these filters.</div>'}
function renderTrash(){purgeExpiredTrash();const spans=inoculantSpans();const rows=state.trash||[];document.getElementById('trashLoads').innerHTML=rows.length?rows.map(l=>{const expires=new Date(new Date(l.deletedAt).getTime()+30*24*60*60*1000);return `<div class="recent-item"><div><div class="recent-main">${esc(truckDisplay(l))}${l.driverName?' · '+esc(l.driverName):''} · ${esc(l.type)} · ${esc(loadWText(l))}${l.importedDuplicate?'<span class="dup-badge">Imported duplicate</span>':''}${l.replacedByImport?'<span class="dup-badge">Replaced by import</span>':''}</div><div class="recent-sub">${fmtDateTime(l.time)} · ${esc(fieldDisplay(l))}${noteDisplay(l)?' · '+esc(noteDisplay(l)):''}${storageDisplay(l)?' · '+esc(storageDisplay(l)):''}${inoculantBadge(l,spans)}</div><div class="trash-meta">Deleted ${new Date(l.deletedAt).toLocaleString()} · Expires ${expires.toLocaleDateString()}</div></div><div class="edit-load-actions"><button class="btn small blue" onclick="restoreLoad('${l.id}')">Restore</button><button class="btn small danger" onclick="deleteForever('${l.id}')">Delete Forever</button></div></div>`}).join(''):'<div class="empty">Trash is empty.</div>'}
function parseCsvLine(line){const out=[];let cur='',quoted=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(quoted&&line[i+1]==='"'){cur+='"';i++;}else{quoted=!quoted}}else if(ch===','&&!quoted){out.push(cur);cur=''}else{cur+=ch}}out.push(cur);return out}
