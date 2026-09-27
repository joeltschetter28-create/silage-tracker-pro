function getLoadFeedback(){try{return Object.assign({audio:false,haptic:false},JSON.parse(localStorage.getItem(FEEDBACK_KEY)||'{}'))}catch(e){return {audio:false,haptic:false}}}
function saveLoadFeedback(s){localStorage.setItem(FEEDBACK_KEY,JSON.stringify(s))}
function initLoadSound(){if(loadSoundPool.length)return;for(let i=0;i<3;i++){const a=new Audio(LOAD_SOUND_SRC);a.preload='auto';a.volume=1;try{a.load()}catch(e){}loadSoundPool.push(a)}}
function playLoadTone(){try{initLoadSound();const a=loadSoundPool[loadSoundIndex++%loadSoundPool.length];try{a.currentTime=0}catch(e){}const p=a.play();if(p&&p.catch)p.catch(()=>{})}catch(e){}}
function doLoadHaptic(){try{if(navigator.vibrate)navigator.vibrate(35)}catch(e){}}
function loadEntryFeedback(btn){const s=getLoadFeedback();if(btn){btn.classList.remove('load-entry-feedback');void btn.offsetWidth;btn.classList.add('load-entry-feedback');clearTimeout(btn._fb);btn._fb=setTimeout(()=>btn.classList.remove('load-entry-feedback'),1000)}if(s.audio)playLoadTone();if(s.haptic)doLoadHaptic()}
function addLoadRecord(args){if(licenseGraceInfo().locked)return requireActivation(()=>addLoadRecord(args));const {truckId,fieldId,storageId=null,fraction=1,customWeight=null,time=null}=args;const truck=state.trucks.find(t=>t.id===truckId),field=state.fields.find(f=>f.id===fieldId),storage=state.storages.find(x=>x.id===(storageId||state.lastStorageId))||state.storages[0];if(!truck||!field)return alert('Choose a truck and field.');const iso=time||new Date().toISOString();const isCustom=customWeight!==null&&customWeight!=='';const commodityId=commodityById(field.commodityId)?field.commodityId:'';const wet=isCustom?Number(customWeight):effectiveLoadWeight(truck.id,iso,commodityId)*Number(fraction);if(!wet||wet<=0)return alert('Enter a valid load weight.');const dmReading=effectiveDMReading(iso),dm=dmReading?Number(dmReading.value):0;state.lastStorageId=storage?storage.id:'';const record={id:uid(),time:iso,fieldId:field.id,fieldName:field.name,fieldNote:String(field.note||'').trim(),commodityId,commodityName:commodityLabel(commodityId),storageId:storage?storage.id:'',storageName:storage?storage.name:'',truckId:truck.id,truckName:truck.name,driverName:truck.driver||'',dmReadingId:dmReading?dmReading.id:null,dmValue:dmReading?Number(dmReading.value):dm,manualDryMatter:null,type:isCustom?'Custom':fraction===1?'Full':fraction===.75?'3/4':fraction===.5?'1/2':'Load',fraction:Number(fraction),loadWeightMode:isCustom?'custom':'history',wetWeight:wet,dryMatter:dm,dryWeight:wet*(dm/100),unit:state.unit,detailsStamped:true};const near=possibleDuplicateLoads(record);if(near.length){openDuplicateLoadPrompt(record,near);return}commitLoadRecord(record)}
function deleteLoad(id){if(licenseGraceInfo().locked)return requireActivation(()=>deleteLoad(id));const l=state.loads.find(x=>x.id===id);if(!l)return;const msg=`Move this load to Trash?\n\n${truckDisplay(l)}${l.driverName?' · '+l.driverName:''}\n${fmtDateTime(l.time)} · ${l.type}`;if(confirm(msg)){state.loads=state.loads.filter(x=>x.id!==id);l.deletedAt=new Date().toISOString();state.trash.unshift(l);save();render();showToast('Moved to Trash')}}
function purgeExpiredTrash(){const cutoff=Date.now()-30*24*60*60*1000;state.trash=(state.trash||[]).filter(l=>!l.deletedAt||new Date(l.deletedAt).getTime()>cutoff)}
function loadEditSnapshot(l){const o={};EDIT_LOG_KEYS.forEach(k=>{o[k]=l[k]});return o}
// The date picker only carries minutes, so re-saving a load with nothing touched drops its
// seconds. Times are compared to the minute so that alone is never logged as an edit.
function editTimeMinute(v){const t=new Date(v).getTime();return Number.isFinite(t)?Math.floor(t/60000):String(v||'')}
function editSnapshotsDiffer(a,b){return EDIT_LOG_KEYS.some(k=>{const x=a[k],y=b[k];if(k==='time')return editTimeMinute(x)!==editTimeMinute(y);if(typeof x==='number'||typeof y==='number')return Math.abs(Number(x||0)-Number(y||0))>0.000001;return String(x==null?'':x)!==String(y==null?'':y)})}
function purgeExpiredEditLogs(){const cutoff=Date.now()-EDIT_LOG_DAYS*24*60*60*1000;state.editLogs=(state.editLogs||[]).filter(e=>!e.at||new Date(e.at).getTime()>cutoff)}
function editLogById(id){return (state.editLogs||[]).find(e=>e.id===id)||null}
// Reads the difference between two copies of one load back in the operator's own words.
function describeLoadEdit(before,after){
  const out=[],txt=v=>v===null||v===undefined?'':String(v).trim();
  if(txt(before.truckName)!==txt(after.truckName))out.push('Truck: '+(txt(before.truckName)||'None')+' → '+(txt(after.truckName)||'None'));
  if(txt(before.fieldName)!==txt(after.fieldName))out.push('Field: '+(txt(before.fieldName)||'None')+' → '+(txt(after.fieldName)||'None'));
  if(txt(before.commodityName)!==txt(after.commodityName)||txt(before.commodityId)!==txt(after.commodityId))out.push('Commodity: '+(txt(before.commodityName)||'None')+' → '+(txt(after.commodityName)||'None'));
  if(txt(before.fieldNote)!==txt(after.fieldNote))out.push('Field note: '+(txt(before.fieldNote)||'None')+' → '+(txt(after.fieldNote)||'None'));
  if(txt(before.storageName)!==txt(after.storageName))out.push('Storage: '+(txt(before.storageName)||'None')+' → '+(txt(after.storageName)||'None'));
  if(editTimeMinute(before.time)!==editTimeMinute(after.time))out.push('Date and time: '+fmtDateTime(before.time)+' → '+fmtDateTime(after.time));
  if(Math.abs(Number(before.wetWeight||0)-Number(after.wetWeight||0))>0.000001)out.push('Weight: '+money(before.wetWeight)+' → '+money(after.wetWeight)+' '+state.unit);
  if(Math.abs(Number(before.dryMatter||0)-Number(after.dryMatter||0))>0.000001)out.push(dmWord()+': '+dmPct(before.dryMatter)+' → '+dmPct(after.dryMatter));
  return out
}
function summariseEditEntries(entries){const seen=[];entries.forEach(e=>describeLoadEdit(e.before,e.after||e.before).forEach(c=>{if(!seen.includes(c))seen.push(c)}));return seen}
// Called with the loads already changed. Entries that came out identical are dropped, so
// a batch that only moved some of the selected loads logs only the loads it touched.
function recordEditLog({kind='single',changes=[],entries=[]}){
  const kept=(entries||[]).filter(e=>e&&e.loadId&&e.before&&(e.deleted||editSnapshotsDiffer(e.before,e.after||e.before)));
  if(!kept.length)return null;
  const times=kept.map(e=>new Date(e.before.time).getTime()).filter(t=>Number.isFinite(t));
  const summary=(changes&&changes.length)?changes.slice():summariseEditEntries(kept);
  if(!summary.length)return null;
  const log={id:uid(),at:new Date().toISOString(),kind,loadCount:kept.length,
    firstLoad:times.length?new Date(Math.min.apply(null,times)).toISOString():null,
    lastLoad:times.length?new Date(Math.max.apply(null,times)).toISOString():null,
    changes:summary,
    entries:kept};
  state.editLogs=[log,...(state.editLogs||[])];
  purgeExpiredEditLogs();
  return log
}
function editLogTitle(log){
  if(log.kind==='batch-delete')return 'Batch delete · '+log.loadCount+' load'+(log.loadCount===1?'':'s');
  if(log.kind==='batch')return 'Batch edit · '+log.loadCount+' load'+(log.loadCount===1?'':'s');
  return 'Single load edit'
}
// The window the affected loads were carted in, which is what identifies them on the list.
function editLogTimeframeText(log){
  const a=log.firstLoad||log.lastLoad,b=log.lastLoad||log.firstLoad;
  if(!a)return 'Timeframe not recorded';
  return new Date(a).getTime()===new Date(b).getTime()?'Load from '+fmtDateTime(a):'Loads from '+fmtDateTime(a)+' to '+fmtDateTime(b)
}
function undoEditLog(id){
  const log=editLogById(id);if(!log)return;
  if(!confirm('Undo this edit?\n\n'+editLogTitle(log)+'\n'+editLogTimeframeText(log)+'\n\nThose loads go back exactly as they were before the edit, and this entry is removed from the list.'))return;
  let restored=0,missing=0;
  (log.entries||[]).forEach(e=>{
    if(e.deleted){
      // A batch delete moved the loads to the Trash, so undo brings them back out of it.
      const t=(state.trash||[]).find(x=>x.id===e.loadId);
      if(!t){missing++;return}
      state.trash=state.trash.filter(x=>x.id!==e.loadId);
      delete t.deletedAt;Object.assign(t,e.before);state.loads.unshift(t);restored++;return
    }
    const l=state.loads.find(x=>x.id===e.loadId)||(state.trash||[]).find(x=>x.id===e.loadId);
    if(!l){missing++;return}
    Object.assign(l,e.before);restored++
  });
  state.editLogs=(state.editLogs||[]).filter(x=>x.id!==id);
  save();render();
  showToast(restored+' load'+(restored===1?'':'s')+' restored'+(missing?' · '+missing+' no longer on this device':''))
}
function deleteEditLog(id){
  const log=editLogById(id);if(!log)return;
  if(!confirm('Delete this log entry?\n\n'+editLogTitle(log)+'\n'+editLogTimeframeText(log)+'\n\nThe changes stay on the loads. Only the entry is removed, and it can no longer be undone from here.'))return;
  state.editLogs=(state.editLogs||[]).filter(x=>x.id!==id);
  save();render();showToast('Log entry deleted')
}
function renderEditLogs(){
  const el=document.getElementById('editLogList');if(!el)return;
  const logs=(state.editLogs||[]).slice().sort((a,b)=>new Date(b.at)-new Date(a.at));
  el.innerHTML=logs.length?logs.map(log=>{
    const changes=log.changes||[],shown=changes.slice(0,8),rest=changes.length-shown.length;
    return '<div class="edit-log"><div class="edit-log-head">'+esc(editLogTitle(log))+'</div>'
      +'<div class="recent-sub">Edited '+esc(new Date(log.at).toLocaleString())+' · '+esc(editLogTimeframeText(log))+'</div>'
      +(shown.length?'<ul class="edit-log-changes">'+shown.map(c=>'<li>'+esc(c)+'</li>').join('')+(rest>0?'<li>and '+rest+' more change'+(rest===1?'':'s')+'</li>':'')+'</ul>':'')
      +'<div class="edit-log-actions"><button class="btn small blue" type="button" onclick="undoEditLog(\''+log.id+'\')">Undo</button>'
      +'<button class="btn small danger" type="button" onclick="deleteEditLog(\''+log.id+'\')">Delete</button></div></div>'
  }).join(''):'<div class="empty">No load edits logged in the last '+EDIT_LOG_DAYS+' days.</div>'
}
function restoreLoad(id){const l=(state.trash||[]).find(x=>x.id===id);if(!l)return;if(l.importedDuplicate){const cands=duplicateCandidatesFor(l);if(cands.length)return openRestoreDuplicatePrompt(l,cands)}commitRestoreLoad(l)}
function deleteForever(id){if(licenseGraceInfo().locked)return requireActivation(()=>deleteForever(id));const l=(state.trash||[]).find(x=>x.id===id);if(!l)return;if(confirm('Delete this load forever? This cannot be undone.')){state.trash=state.trash.filter(x=>x.id!==id);save();render();showToast('Permanently deleted')}}
// ---------------------------------------------------------------------------
// Duplicate load guard
//
// Two windows, both set on the Settings page a minute at a time and both switched off
// at 0. The first watches the Loads page: a second load for the same truck landing
// inside it is held back and confirmed rather than saved on the spot, because the
// commonest bad entry is a truck button caught twice. The second watches loads arriving
// from a CSV or a device snapshot, where a whole run can easily come in a second time;
// those are counted and offered as a group, and the ones not wanted go to the Trash with
// a stamp saying what they are rather than being dropped, so there is always a way back.
//
// Only the truck and the time are compared. Weight is deliberately left out of it: a
// double tap repeats the weight, but so does every honest full load, and a load that
// comes back through an import after being edited will not match on weight at all.
// ---------------------------------------------------------------------------
function dupMaxMinutes(){return 120}
function clampDupMinutes(v){const n=Math.round(Number(v));return Number.isFinite(n)?Math.min(dupMaxMinutes(),Math.max(0,n)):0}
function dupWatch(){if(!state.duplicateWatch||typeof state.duplicateWatch!=='object')state.duplicateWatch={loadMinutes:0,importMinutes:0};return state.duplicateWatch}
function dupLoadMinutes(){return clampDupMinutes(dupWatch().loadMinutes)}
function dupImportMinutes(){return clampDupMinutes(dupWatch().importMinutes)}
function minuteWord(m){return m===1?'1 minute':m+' minutes'}
function loadsNearInTime(pool,truckId,iso,minutes,excludeId){
  if(!(minutes>0)||!truckId||!Array.isArray(pool))return [];
  const t=new Date(iso).getTime();if(!Number.isFinite(t))return [];
  const ms=minutes*60000;
  return pool.filter(l=>l&&l.truckId===truckId&&l.id!==excludeId&&Number.isFinite(new Date(l.time).getTime())&&Math.abs(new Date(l.time).getTime()-t)<=ms)
    .sort((a,b)=>Math.abs(new Date(a.time).getTime()-t)-Math.abs(new Date(b.time).getTime()-t))}
function possibleDuplicateLoads(record){return loadsNearInTime(state.loads,record.truckId,record.time,dupLoadMinutes(),record.id)}
function dupLoadLine(l){return `<div class="dup-main">${esc(truckDisplay(l))}${l.driverName?' · '+esc(l.driverName):''} · ${esc(l.type)} · ${money(l.wetWeight)} ${esc(l.unit||state.unit)}</div><div class="dup-sub">${fmtDateTime(l.time)} · ${esc(fieldDisplay(l))}${storageDisplay(l)?' · '+esc(storageDisplay(l)):''}</div>`}
function dupApart(a,b){const mins=Math.abs(new Date(a).getTime()-new Date(b).getTime())/60000;if(!Number.isFinite(mins))return 'time unknown';if(mins<1)return 'under a minute apart';if(mins<1.5)return 'about a minute apart';return Math.round(mins)+' minutes apart'}
function commitLoadRecord(record){if(licenseGraceInfo().locked)return requireActivation(()=>commitLoadRecord(record));if(typeof record.inoculated!=='boolean')record.inoculated=wasInoculated(record,inoculantSpans());state.loads.unshift(record);loadEntryFeedback(lastLoadEntryButton);lastLoadEntryButton=null;save();render();showToast('Load saved')}
function openDuplicateLoadPrompt(record,near){
  pendingDuplicateLoad=record;pendingDuplicateButton=lastLoadEntryButton;lastLoadEntryButton=null;
  const t=state.trucks.find(x=>x.id===record.truckId),mins=dupLoadMinutes();
  document.getElementById('duplicateLoadTitle').textContent=(t?t.name:'Truck')+' — Possible Duplicate';
  document.getElementById('duplicateLoadCount').textContent=(near.length===1?'1 load is':near.length+' loads are')+' already recorded for this truck within '+minuteWord(mins)+'.';
  document.getElementById('duplicateLoadNote').textContent='The closest is '+dupApart(near[0].time,record.time)+'. Confirm it if this is a load of its own, or cancel it if the truck was tapped twice.';
  document.getElementById('duplicateLoadNew').innerHTML='<div class="dup-sub" style="margin:0 0 5px">This load</div>'+dupLoadLine(record);
  document.getElementById('duplicateLoadList').innerHTML=near.map(l=>`<div class="dup-row">${dupLoadLine(l)}<div class="dup-sub">${dupApart(l.time,record.time)}</div></div>`).join('');
  document.getElementById('duplicateLoadModal').classList.add('show');
}
function confirmPendingDuplicateLoad(){const r=pendingDuplicateLoad;if(!r)return;pendingDuplicateLoad=null;lastLoadEntryButton=pendingDuplicateButton;pendingDuplicateButton=null;closeModal('duplicateLoadModal');commitLoadRecord(r)}
function cancelPendingDuplicateLoad(){pendingDuplicateLoad=null;pendingDuplicateButton=null;closeModal('duplicateLoadModal');showToast('Load not saved')}
function resetImportDuplicates(){pendingImportDuplicates=[]}
function noteImportDuplicate(load,candidates,source){
  load.importedDuplicate=true;
  load.duplicateOfIds=candidates.map(c=>c.id);
  load.importedFrom=source;
  load.importedAt=load.importedAt||new Date().toISOString();
  pendingImportDuplicates.push({load,candidates});
}
function offerImportDuplicates(){
  if(!pendingImportDuplicates.length)return false;
  const n=pendingImportDuplicates.length;
  document.getElementById('importDuplicateCount').textContent=n===1?'1 imported load may already be recorded here.':n+' imported loads may already be recorded here.';
  document.getElementById('importDuplicateNote').textContent='Each lands within '+minuteWord(dupImportMinutes())+' of a load already on this device for the same truck. Import them to put them on the Loads page, or move them to the Trash, where they are stamped Imported duplicate and can be restored at any time.';
  document.getElementById('importDuplicateList').innerHTML=pendingImportDuplicates.map(pd=>`<div class="dup-row">${dupLoadLine(pd.load)}<div class="dup-sub">${pd.candidates.length===1?'1 load already here':pd.candidates.length+' loads already here'} · closest ${dupApart(pd.candidates[0].time,pd.load.time)}</div></div>`).join('');
  document.getElementById('importDuplicateModal').classList.add('show');
  return true;
}
function keepImportedDuplicates(){
  if(licenseGraceInfo().locked)return requireActivation(keepImportedDuplicates);
  const rows=pendingImportDuplicates;pendingImportDuplicates=[];closeModal('importDuplicateModal');if(!rows.length)return;
  rows.forEach(pd=>{const l=pd.load;l.importedDuplicate=false;l.duplicateOfIds=[];l.snapshotImported=true;state.loads.push(l)});
  save();render();showToast(rows.length+' load'+(rows.length===1?'':'s')+' imported');
}
function trashImportedDuplicates(){
  if(licenseGraceInfo().locked)return requireActivation(trashImportedDuplicates);
  const rows=pendingImportDuplicates;pendingImportDuplicates=[];closeModal('importDuplicateModal');if(!rows.length)return;
  const now=new Date().toISOString();
  state.trash=state.trash||[];
  rows.forEach(pd=>{const l=pd.load;l.deletedAt=now;l.importedDuplicate=true;state.trash.unshift(l)});
  save();render();showToast(rows.length+' load'+(rows.length===1?'':'s')+' moved to Trash');
}
function duplicateCandidatesFor(l){
  const named=(l.duplicateOfIds||[]).map(id=>state.loads.find(x=>x.id===id)).filter(Boolean);
  const seen=new Set(named.map(x=>x.id));
  const near=loadsNearInTime(state.loads,l.truckId,l.time,Math.max(dupImportMinutes(),dupLoadMinutes()),l.id).filter(x=>!seen.has(x.id));
  return named.concat(near);
}
function openRestoreDuplicatePrompt(l,cands){
  pendingRestore=l;pendingRestoreChoice=cands[0].id;
  document.getElementById('restoreDuplicateNew').innerHTML='<div class="dup-sub" style="margin:0 0 5px">Restoring this imported load</div>'+dupLoadLine(l);
  document.getElementById('restoreDuplicateNote').textContent=(cands.length===1?'1 load on the Loads page':cands.length+' loads on the Loads page')+' may be what this one duplicates. Pick the one it replaces and that load moves to the Trash in its place, or keep both and nothing else is touched.';
  renderRestoreDuplicateList(cands);
  document.getElementById('restoreDuplicateModal').classList.add('show');
}
function renderRestoreDuplicateList(cands){
  const l=pendingRestore;
  document.getElementById('restoreDuplicateList').innerHTML=cands.map(c=>`<button type="button" class="dup-row pick${c.id===pendingRestoreChoice?' selected':''}" onclick="pickRestoreDuplicate('${c.id}')">${dupLoadLine(c)}<div class="dup-sub">${l?dupApart(c.time,l.time):''}</div></button>`).join('');
}
function pickRestoreDuplicate(id){if(!pendingRestore)return;pendingRestoreChoice=id;renderRestoreDuplicateList(duplicateCandidatesFor(pendingRestore))}
function replaceRestoreDuplicate(){
  const l=pendingRestore;if(!l)return;
  if(licenseGraceInfo().locked)return requireActivation(replaceRestoreDuplicate);
  const existing=state.loads.find(x=>x.id===pendingRestoreChoice);
  if(!existing)return alert('That load is no longer on the Loads page. Keep both instead.');
  state.loads=state.loads.filter(x=>x.id!==existing.id);
  existing.deletedAt=new Date().toISOString();existing.replacedByImport=true;
  state.trash=state.trash||[];state.trash.unshift(existing);
  pendingRestore=null;pendingRestoreChoice='';
  closeModal('restoreDuplicateModal');
  commitRestoreLoad(l);
  showToast('Load replaced');
}
function keepBothRestoreDuplicate(){const l=pendingRestore;if(!l)return;pendingRestore=null;pendingRestoreChoice='';closeModal('restoreDuplicateModal');commitRestoreLoad(l);showToast('Both loads kept')}
function cancelRestoreDuplicate(){pendingRestore=null;pendingRestoreChoice='';closeModal('restoreDuplicateModal')}
function commitRestoreLoad(l){if(licenseGraceInfo().locked)return requireActivation(()=>commitRestoreLoad(l));state.trash=(state.trash||[]).filter(x=>x.id!==l.id);delete l.deletedAt;l.importedDuplicate=false;l.duplicateOfIds=[];delete l.replacedByImport;state.loads.unshift(l);save();render();showToast('Load restored')}
