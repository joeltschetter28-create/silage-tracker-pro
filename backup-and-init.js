async function requestWakeLock(){if(!state.keepAwake||!('wakeLock' in navigator))return;try{wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener('release',()=>wakeLock=null)}catch(e){}}
function releaseWakeLock(){if(wakeLock){wakeLock.release().catch(()=>{});wakeLock=null}}
function backupEnvelope(){return {app:'Silage Tracker Pro',version:VERSION,build:BUILD,exportedAt:new Date().toISOString(),state:structuredClone(state)}}
function downloadJsonFile(name,data){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function safeFileDate(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+'_'+String(d.getHours()).padStart(2,'0')+'-'+String(d.getMinutes()).padStart(2,'0')}
function downloadFullBackup(){downloadJsonFile('Silage_Tracker_Pro_Backup_'+safeFileDate()+'.json',backupEnvelope());showToast('Backup downloaded')}
// Internal undo point taken before any restore or merge. Not the shareable snapshot.
function saveSafetySnapshot(silent=false){const snap=backupEnvelope();try{localStorage.setItem(SNAPSHOT_KEY,JSON.stringify(snap))}catch(e){}renderDataSafety();if(!silent)showToast('Safety snapshot saved')}
function getSafetySnapshot(){try{return JSON.parse(localStorage.getItem(SNAPSHOT_KEY)||'null')}catch(e){return null}}
function clearAllData(){
  const warning='WARNING: This will erase ALL Silage Tracker data on this device, including loads, Trash, archived field summaries, trucks, fields, storage locations, dry-matter history, weight history, inoculant events, and saved settings. This cannot be undone unless you have a backup.\n\nAre you sure you want to continue?';
  if(!confirm(warning))return;
  if(!confirm('FINAL WARNING: All data will now be erased. Press OK to permanently clear this device.'))return;
  if(licenseGraceInfo().locked)return requireActivation(clearAllData);
  try{
    localStorage.removeItem(SNAPSHOT_KEY);
    state={unit:'t',dryMatter:35,commodities:[],commoditiesEnabled:true,dmDisplayMode:'dm',weighEveryLoad:false,duplicateWatch:{loadMinutes:0,importMinutes:0},fields:[],trucks:[],storages:[{id:uid(),name:'Unassigned'}],loads:[],dmReadings:[],loadWeightHistory:[],trash:[],archive:[],darkMode:false,keepAwake:false,counter:{enabled:false,target:250,warning:25,startAt:null,lastResetAt:null,lastNotificationTargetAt:null,lastNotificationWarningAt:null,events:[]}};
    save();
    render();
    renderDataSafety();
    showToast('All data cleared');
  }catch(e){alert('The data could not be cleared.');}
}
function renderDataSafety(){const box=document.getElementById('dataHealth');if(!box)return;box.innerHTML='<b>Current data:</b> '+state.loads.length+' active loads · '+(state.trash||[]).length+' in Trash · '+(state.archive||[]).length+' archived fields · '+state.trucks.length+' trucks · '+state.fields.length+' fields'}
function validBackupPayload(raw){const candidate=raw&&raw.state?raw.state:raw;return !!(candidate&&typeof candidate==='object'&&Array.isArray(candidate.loads)&&Array.isArray(candidate.trucks)&&Array.isArray(candidate.fields))}
function restoreStateCandidate(candidate,label){if(!validBackupPayload(candidate))return alert('That file is not a valid Silage Tracker backup.');const incoming=candidate.state||candidate;const loadCount=Array.isArray(incoming.loads)?incoming.loads.length:0,truckCount=Array.isArray(incoming.trucks)?incoming.trucks.length:0,fieldCount=Array.isArray(incoming.fields)?incoming.fields.length:0;if(!confirm('Restore '+label+'?\n\nIncoming data: '+loadCount+' loads, '+truckCount+' trucks, '+fieldCount+' fields.\n\nThis will replace the current data on this device.'))return;if(licenseGraceInfo().locked)return requireActivation(()=>restoreStateCandidate(candidate,label));saveSafetySnapshot(true);try{localStorage.setItem(KEY,JSON.stringify(incoming));state=loadState();save();render();showToast('Backup restored')}catch(e){alert('The backup could not be restored. Your safety snapshot is still available.')}}
// ---- Shareable device snapshot -------------------------------------------------
// Hands the whole working profile to a replacement operator: trucks and their
// weights, every field with its acres, note and commodity, the loads with their
// recorded weights and dry matter, storage, dry-matter history and the archive.
// Importing merges rather than replaces, so the snapshot can be passed back later.
function snapshotEnvelope(){recalculateLoads();state.loads.forEach(l=>{if(typeof l.inoculated!=='boolean')l.inoculated=wasInoculated(l,inoculantSpans())});return {app:'Silage Tracker Pro',kind:'device-snapshot',version:VERSION,build:BUILD,unit:state.unit,exportedAt:new Date().toISOString(),state:structuredClone(state)}}
function snapshotFileName(){const f=currentField(),part=f?String(f.name).replace(/[^a-z0-9]+/gi,'_').replace(/^_|_$/g,''):'';return 'Silage_Snapshot_'+(part?part+'_':'')+safeFileDate()+'.json'}
function snapshotSummaryText(snap){const st=snap.state||{},f=(st.fields||[]).find(x=>x.id===st.lastFieldId);return 'Silage Tracker Pro snapshot · '+(st.trucks||[]).length+' trucks · '+(st.fields||[]).length+' fields · '+(st.loads||[]).length+' loads'+(f?' · current field '+f.name:'')+'. Open Setup, then Import Device Snapshot, to carry on from here.'}
async function shareDeviceSnapshot(){
  const snap=snapshotEnvelope(),name=snapshotFileName(),text=JSON.stringify(snap,null,2),summary=snapshotSummaryText(snap);
  // Saved to Files first on purpose, so the snapshot survives a cancelled share.
  downloadJsonFile(name,snap);
  showToast('Snapshot saved');
  try{
    const file=new File([text],name,{type:'application/json'});
    if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'Silage Tracker snapshot',text:summary});showToast('Snapshot shared');return}
    if(navigator.share){await navigator.share({title:'Silage Tracker snapshot',text:summary});return}
  }catch(e){if(e&&(e.name==='AbortError'||e.name==='NotAllowedError'))return}
  alert('Snapshot saved to this device as\n'+name+'\n\n'+summary+'\n\nSharing is not available in this browser, so send the saved file on by email or messaging app.');
}
function snapshotLoadKey(l){return [new Date(l.time).getTime(),String(l.truckName||'').trim().toLowerCase(),String(l.fieldName||'').trim().toLowerCase(),Number(l.wetWeight||0).toFixed(3),String(l.type||'').trim().toLowerCase()].join('|')}
// A field snapshot is the same state-shaped envelope as a full Device Snapshot, just filtered
// down to one field and only what its loads actually reference. Because mergeDeviceSnapshot()
// already tolerates a sparse/partial incoming state (empty arrays, missing keys), it can import
// a field snapshot with no changes at all -- the Import Device Snapshot button already handles it.
function fieldSnapshotEnvelope(field){
  recalculateLoads();
  const loads=state.loads.filter(l=>l.fieldId===field.id);
  loads.forEach(l=>{if(typeof l.inoculated!=='boolean')l.inoculated=wasInoculated(l,inoculantSpans())});
  const truckIds=new Set(loads.map(l=>l.truckId).filter(Boolean));
  const storageIds=new Set(loads.map(l=>l.storageId).filter(Boolean));
  const dmIds=new Set(loads.map(l=>l.dmReadingId).filter(Boolean));
  const commodityIds=new Set([field.commodityId].concat(loads.map(l=>l.commodityId)).filter(Boolean));
  const weightHistory=(state.loadWeightHistory||[]).filter(r=>truckIds.has(r.truckId)&&(!r.commodityId||commodityIds.has(r.commodityId)));
  return {app:'Silage Tracker Pro',kind:'field-snapshot',version:VERSION,build:BUILD,unit:state.unit,exportedAt:new Date().toISOString(),
    state:{unit:state.unit,
      fields:[structuredClone(field)],
      loads:structuredClone(loads),
      trucks:structuredClone(state.trucks.filter(t=>truckIds.has(t.id))),
      storages:structuredClone(state.storages.filter(s=>storageIds.has(s.id))),
      commodities:structuredClone(state.commodities.filter(c=>commodityIds.has(c.id))),
      dmReadings:structuredClone(state.dmReadings.filter(r=>dmIds.has(r.id))),
      loadWeightHistory:structuredClone(weightHistory),trash:[],archive:[],lastFieldId:field.id}};
}
function fieldSnapshotFileName(field){const part=String(field.name).replace(/[^a-z0-9]+/gi,'_').replace(/^_|_$/g,'');return 'Silage_Field_Snapshot_'+(part?part+'_':'')+safeFileDate()+'.json'}
function fieldSnapshotSummaryText(env,field){const st=env.state;const totalWet=st.loads.reduce((s,l)=>s+(Number(l.wetWeight)||0),0);return 'Silage Tracker Pro field snapshot \u00b7 '+field.name+' \u00b7 '+st.loads.length+' load'+(st.loads.length===1?'':'s')+' \u00b7 '+totalWet.toFixed(2)+' wet '+st.unit+' total. Open Setup, then Import Device Snapshot, to bring it in.'}
async function shareFieldSnapshot(){
  const field=currentField();
  if(!field)return alert('Add a field first.');
  const loads=state.loads.filter(l=>l.fieldId===field.id);
  if(!loads.length&&!confirm(field.name+' has no loads recorded yet. Save a snapshot with just the field\u2019s own details anyway?'))return;
  const env=fieldSnapshotEnvelope(field),name=fieldSnapshotFileName(field),text=JSON.stringify(env,null,2),summary=fieldSnapshotSummaryText(env,field);
  downloadJsonFile(name,env);
  showToast('Field snapshot saved: '+field.name);
  try{
    const file=new File([text],name,{type:'application/json'});
    if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'Silage Tracker field snapshot',text:summary});showToast('Snapshot shared');return}
    if(navigator.share){await navigator.share({title:'Silage Tracker field snapshot',text:summary});return}
  }catch(e){if(e&&(e.name==='AbortError'||e.name==='NotAllowedError'))return}
  alert('Field snapshot saved to this device as\n'+name+'\n\n'+summary+'\n\nSharing is not available in this browser, so send the saved file on by email or messaging app.');
}
// One decision covers everything a snapshot brought that this device hadn't seen, rather than
// a separate prompt per reading or per weight change. "Merge" applies each new reading or weight
// to loads carted in its window -- but only loads sharing the field and commodity the incoming
// loads themselves were carted under in that window, so a reading meant for one field's corn
// never bleeds into another field's hay just because the timing overlaps. Declining leaves every
// load exactly as it was entered and marks the newly-arrived ones as imported instead.
function fieldCommodityKey(l){return (l.fieldId||'')+'|'+(l.commodityId||'')}
function applyMergedReadings(newReadings,incomingIds){
  let touched=0;
  const sorted=state.dmReadings.slice().sort((a,b)=>new Date(a.effective)-new Date(b.effective));
  newReadings.forEach(reading=>{
    const eff=new Date(reading.effective).getTime();
    const next=sorted.find(r=>r.id!==reading.id&&new Date(r.effective).getTime()>eff);
    const until=next?new Date(next.effective).getTime():Infinity;
    const context=new Set();
    state.loads.forEach(l=>{if(!incomingIds.has(l.id))return;const t=new Date(l.time).getTime();if(t>=eff&&t<until)context.add(fieldCommodityKey(l))});
    if(!context.size)return;
    state.loads.forEach(l=>{
      if(l.manualDryMatter!==null&&l.manualDryMatter!==undefined)return;
      const t=new Date(l.time).getTime();
      if(!(t>=eff&&t<until))return;
      if(!context.has(fieldCommodityKey(l)))return;
      if(l.dmReadingId===reading.id)return;
      l.dmReadingId=reading.id;l.dmValue=Number(reading.value);l.dryMatter=Number(reading.value);l.dryWeight=Number(l.wetWeight)*(Number(reading.value)/100);
      touched++;
    });
  });
  return touched;
}
// Weight has a drift risk DM readings don't: a load in 'history' weight mode always pulls
// whatever the CURRENT latest weight is for its truck+commodity, live, on every render --
// with no field awareness at all in that lookup. So importing a new weight record would
// silently reach into a different field's loads the next time the page renders, regardless
// of any merge choice made here, unless every load it could touch is explicitly frozen.
// Loads actually being merged get the new value locked in as 'custom'; loads outside the
// chosen field+commodity get their current value locked in as 'custom' instead, protecting
// them from ever drifting just because this truck+commodity now has a newer weight on record.
function protectAndMergeWeights(newWeights,incomingIds,shouldMerge){
  let touched=0;
  newWeights.forEach(rec=>{
    const eff=new Date(rec.effective).getTime();
    const sameTruckCommodity=state.loadWeightHistory.filter(r=>r.id!==rec.id&&r.truckId===rec.truckId&&(r.commodityId||'')===(rec.commodityId||''));
    const next=sameTruckCommodity.filter(r=>new Date(r.effective).getTime()>eff).sort((a,b)=>new Date(a.effective)-new Date(b.effective))[0];
    const until=next?new Date(next.effective).getTime():Infinity;
    const context=new Set();
    if(shouldMerge)state.loads.forEach(l=>{if(!incomingIds.has(l.id))return;if(l.truckId!==rec.truckId)return;if((l.commodityId||'')!==(rec.commodityId||''))return;const t=new Date(l.time).getTime();if(t>=eff&&t<until)context.add(l.fieldId||'')});
    state.loads.forEach(l=>{
      if(l.truckId!==rec.truckId)return;
      if((l.commodityId||'')!==(rec.commodityId||''))return;
      if(l.loadWeightMode==='custom')return;
      const t=new Date(l.time).getTime();
      if(!(t>=eff&&t<until))return;
      if(shouldMerge&&context.has(l.fieldId||'')){
        const fraction=Number(l.fraction)>0?Number(l.fraction):1;
        l.wetWeight=Number(rec.weight)*fraction;l.dryWeight=Number(l.wetWeight)*(Number(l.dryMatter)/100);
        l.loadWeightMode='custom';
        touched++;
      }else{
        l.loadWeightMode='custom';
      }
    });
  });
  return touched;
}
function mergeDeviceSnapshot(payload){
  const incoming=payload.state||payload;
  const from=UNIT_TO_KG[incoming.unit]?incoming.unit:state.unit,to=state.unit;
  const w=v=>from===to?(Number(v)||0):convertWeight(Number(v)||0,from,to);
  const out={loads:0,duplicates:0,held:0,restored:0,restamped:0,trucks:0,fields:0,storages:0,commodities:0,archive:0};
  const priorLoadIds=new Set(state.loads.concat(state.trash||[]).map(l=>l.id));
  const newlyImportedLoadIds=new Set();
  // Only the loads that were here before the merge count as something to duplicate, so a
  // snapshot carrying a legitimate run of quick loads is not flagged against its own rows.
  resetImportDuplicates();
  const priorLoads=state.loads.slice();

  state.commodities=state.commodities||[];
  const commodityMap={};
  (incoming.commodities||[]).forEach(c=>{const name=String(c&&c.name||'').trim();if(!name)return;let local=state.commodities.find(x=>String(x.name).toLowerCase()===name.toLowerCase());if(!local){local={id:uid(),name,order:state.commodities.length};state.commodities.push(local);out.commodities++}commodityMap[c.id]=local.id});
  const cid=id=>commodityMap[id]||(state.commodities.some(c=>c.id===id)?id:'');

  const storageMap={};
  (incoming.storages||[]).forEach(x=>{const name=String(x&&x.name||'').trim();if(!name)return;let local=state.storages.find(y=>String(y.name).toLowerCase()===name.toLowerCase());if(!local){local={id:uid(),name};state.storages.push(local);out.storages++}storageMap[x.id]=local.id});
  const sid=id=>storageMap[id]||(state.storages.some(x=>x.id===id)?id:'');

  const truckMap={};
  (incoming.trucks||[]).forEach(t=>{const name=String(t&&t.name||'').trim();if(!name)return;let local=state.trucks.find(x=>String(x.name).toLowerCase()===name.toLowerCase());
    if(!local){const i=state.trucks.length;local={id:uid(),name,driver:String(t.driver||'').trim(),active:t.active!==false,order:i,fullWeight:w(t.fullWeight),primaryColor:t.primaryColor||['#1f7a3f','#1d4ed8','#b45309','#7e22ce'][i%4],secondaryColor:t.secondaryColor||t.primaryColor||['#14532d','#1e3a8a','#78350f','#581c87'][i%4]};state.trucks.push(local);out.trucks++}
    else{if(String(t.driver||'').trim())local.driver=String(t.driver).trim();if(Number(t.fullWeight)>0)local.fullWeight=w(t.fullWeight);if(t.primaryColor)local.primaryColor=t.primaryColor;if(t.secondaryColor)local.secondaryColor=t.secondaryColor}
    truckMap[t.id]=local.id});
  const tid=id=>truckMap[id]||(state.trucks.some(t=>t.id===id)?id:'');

  const fieldMap={};
  (incoming.fields||[]).forEach(f=>{const name=String(f&&f.name||'').trim();if(!name)return;let local=state.fields.find(x=>String(x.name).toLowerCase()===name.toLowerCase());
    if(!local){local={id:uid(),name,size:Number(f.size)||0,note:String(f.note||'').trim(),commodityId:cid(f.commodityId)};state.fields.push(local);out.fields++}
    else{if(!Number(local.size)&&Number(f.size))local.size=Number(f.size);if(!local.note&&f.note)local.note=String(f.note).trim();if(!local.commodityId&&f.commodityId)local.commodityId=cid(f.commodityId)}
    fieldMap[f.id]=local.id});
  const fid=id=>fieldMap[id]||(state.fields.some(f=>f.id===id)?id:'');

  state.dmReadings=state.dmReadings||[];
  const dmMap={},dmKey=r=>Number(r.value).toFixed(3)+'|'+new Date(r.effective).getTime();
  const dmSeen=new Map(),newReadings=[];state.dmReadings.forEach(r=>dmSeen.set(dmKey(r),r.id));
  (incoming.dmReadings||[]).forEach(r=>{if(!r||!(Number(r.value)>0)||!r.effective)return;const k=dmKey(r);let id=dmSeen.get(k);if(!id){id=uid();const rec={id,value:Number(r.value),effective:r.effective,created:r.created||new Date().toISOString()};state.dmReadings.push(rec);newReadings.push(rec);dmSeen.set(k,id)}dmMap[r.id]=id});

  state.loadWeightHistory=state.loadWeightHistory||[];
  const whKey=r=>[r.truckId,r.commodityId||'',new Date(r.effective).getTime(),Number(r.weight).toFixed(3)].join('|');
  const whSeen=new Set(state.loadWeightHistory.map(whKey)),newWeights=[];
  (incoming.loadWeightHistory||[]).forEach(r=>{if(!r||!r.truckId||!(Number(r.weight)>0)||!r.effective)return;const rec={id:uid(),truckId:tid(r.truckId),commodityId:cid(r.commodityId),weight:w(r.weight),effective:r.effective,created:r.created||new Date().toISOString()};if(!rec.truckId)return;const k=whKey(rec);if(whSeen.has(k))return;whSeen.add(k);state.loadWeightHistory.push(rec);newWeights.push(rec)});

  // Loads are matched on their id and on what they actually record, so a snapshot
  // that travels out and comes back never lands the same load twice.
  const byId=new Map(),byKey=new Map();
  const indexLoad=(l,inTrash)=>{const e={load:l,inTrash};if(!byId.has(l.id))byId.set(l.id,e);const k=snapshotLoadKey(l);if(!byKey.has(k))byKey.set(k,e)};
  // Active copies are indexed first so a load held both here and in the Trash matches the live one.
  state.loads.forEach(l=>indexLoad(l,false));
  (state.trash||[]).forEach(l=>indexLoad(l,true));
  (incoming.loads||[]).forEach(src=>{
    if(!src||!src.time)return;
    const l=structuredClone(src);
    l.fieldId=fid(l.fieldId);l.truckId=tid(l.truckId);l.storageId=sid(l.storageId);l.commodityId=cid(l.commodityId);
    l.wetWeight=w(l.wetWeight);l.dryWeight=w(l.dryWeight);l.unit=to;
    l.fieldName=String(l.fieldName||'').trim()||(state.fields.find(f=>f.id===l.fieldId)?.name||'');
    l.truckName=String(l.truckName||'').trim()||(state.trucks.find(t=>t.id===l.truckId)?.name||'');
    l.storageName=String(l.storageName||'').trim()||(state.storages.find(x=>x.id===l.storageId)?.name||'');
    l.commodityName=typeof l.commodityName==='string'?l.commodityName:'';
    l.fieldNote=String(l.fieldNote||'').trim();
    if(l.dmReadingId){const mapped=dmMap[l.dmReadingId];if(mapped)l.dmReadingId=mapped;else{if(Number(l.dryMatter)>0)l.manualDryMatter=Number(l.dryMatter);l.dmReadingId=null}}
    l.detailsStamped=true;
    const key=snapshotLoadKey(l);
    const match=byId.get(l.id)||byKey.get(key);
    if(match){
      // The load is already here. If this device has it in the Trash while the snapshot
      // still holds it as a live load, the deletion never travelled - so the copy already
      // here comes back out of the Trash rather than a second copy landing beside it.
      if(match.inTrash&&!l.deletedAt){
        state.trash=(state.trash||[]).filter(x=>x.id!==match.load.id);
        delete match.load.deletedAt;
        state.loads.push(match.load);
        match.inTrash=false;
        out.restored++;
      }else out.duplicates++;
      return;
    }
    const entry={load:l,inTrash:false};byId.set(l.id,entry);byKey.set(key,entry);
    const near=loadsNearInTime(priorLoads,l.truckId,l.time,dupImportMinutes(),l.id);
    if(near.length){noteImportDuplicate(l,near,'snapshot');out.held++;return}
    if(typeof l.inoculated!=='boolean')l.inoculated=wasInoculated(l,inoculantSpans());
    l.snapshotImported=true;
    state.loads.push(l);out.loads++;newlyImportedLoadIds.add(l.id)});

  // Asked once per reading the snapshot brought that this device had not seen, and only
  // ever about loads that were already logged here - imported loads keep the reading they
  // were carted under on the device they came from.
  if(newReadings.length||newWeights.length){
    const doMerge=confirm('This snapshot brought new '+(newReadings.length?dmWordLower()+' readings':'')+(newReadings.length&&newWeights.length?' and ':'')+(newWeights.length?'truck weight changes':'')+'.\n\nMerge them into matching loads already on this device \u2014 same field and commodity, during the time each applies?\n\nChoose Cancel to keep every load exactly as entered instead. Either way, newly-imported loads are marked as imported.')
    if(doMerge)out.restamped+=applyMergedReadings(newReadings,newlyImportedLoadIds);
    out.restamped+=protectAndMergeWeights(newWeights,newlyImportedLoadIds,doMerge);
  }

  state.archive=state.archive||[];
  const archiveIds=new Set(state.archive.map(a=>a.id));
  (incoming.archive||[]).forEach(a=>{if(!a||!a.id||archiveIds.has(a.id))return;archiveIds.add(a.id);state.archive.push(structuredClone(a));out.archive++});

  const landField=fid(incoming.lastFieldId);if(landField)state.lastFieldId=landField;
  const landStorage=sid(incoming.lastStorageId);if(landStorage)state.lastStorageId=landStorage;
  if(Number(incoming.dryMatter)>0&&!Number(state.dryMatter))state.dryMatter=Number(incoming.dryMatter);
  save();render();
  return out;
}
function importDeviceSnapshotFile(file){
  if(!file)return;
  if(licenseGraceInfo().locked)return requireActivation(()=>importDeviceSnapshotFile(file));
  const reader=new FileReader();
  const clear=()=>{const el=document.getElementById('snapshotFileInput');if(el)el.value=''};
  reader.onload=()=>{
    try{
      const payload=JSON.parse(String(reader.result||''));
      if(!validBackupPayload(payload))return alert('That file is not a valid Silage Tracker snapshot.');
      const incoming=payload.state||payload;
      const detail=(incoming.loads||[]).length+' loads, '+(incoming.trucks||[]).length+' trucks and '+(incoming.fields||[]).length+' fields';
      if(!confirm('Import this device snapshot?\n\nIt holds '+detail+'.\n\nEverything already on this device is kept, loads already recorded here will not be entered twice, and anything the snapshot still holds that has been moved to the Trash here is brought back instead of duplicated.'))return;
      saveSafetySnapshot(true);
      const r=mergeDeviceSnapshot(payload);
      showToast('Snapshot imported');
      alert('Snapshot imported.\n\nLoads added: '+r.loads+'\nDuplicate loads skipped: '+r.duplicates+'\nPossible duplicates held to check: '+r.held+'\nLoads restored from Trash: '+r.restored+'\nLoads updated by merged readings or weights: '+r.restamped+'\nTrucks added: '+r.trucks+'\nFields added: '+r.fields+'\nStorage locations added: '+r.storages+'\nArchived summaries added: '+r.archive);
      offerImportDuplicates();
    }catch(e){alert('That file could not be read as a Silage Tracker snapshot.')}
    finally{clear()}
  };
  reader.onerror=()=>{alert('The snapshot file could not be read.');clear()};
  reader.readAsText(file);
}
function importBackupFile(file){if(!file)return;const reader=new FileReader();reader.onload=()=>{try{restoreStateCandidate(JSON.parse(reader.result),'this backup file')}catch(e){alert('That file could not be read as a Silage Tracker backup.')}finally{document.getElementById('backupFileInput').value=''}};reader.onerror=()=>alert('The backup file could not be read.');reader.readAsText(file)}
function resetDimTimer(){document.getElementById('dimLayer').classList.remove('on');clearTimeout(dimTimer);dimTimer=setTimeout(()=>document.getElementById('dimLayer').classList.add('on'),60000)}
function updateNewTruckPreview(){const name=document.getElementById('newTruckName')?.value.trim()||'Truck Preview',driver=document.getElementById('newTruckDriver')?.value.trim()||'Assigned Driver',p=document.getElementById('newTruckPrimary')?.value||'#1f7a3f',q=document.getElementById('newTruckSecondary')?.value||'#ffffff',box=document.getElementById('newTruckPreview');if(!box)return;box.style.borderColor=p;const h=box.querySelector('.truck-preview-head'),b=box.querySelector('.truck-preview-body');h.textContent=name;h.style.background=p;h.style.color=q;b.textContent=driver;b.style.background=q;b.style.color=contrastText(q)}
function contrastText(hex){const h=(hex||'#ffffff').replace('#','');const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return (r*299+g*587+b*114)/1000>145?'#17221b':'#ffffff'}
