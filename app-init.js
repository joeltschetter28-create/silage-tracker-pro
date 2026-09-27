const VERSION='3.1.5';
const BUILD='2026.09.25.003';
// The banner used to carry the version as hard-coded text, so it drifted behind
// VERSION on every release. Everything on screen is now stamped from these two.
const SHORT_VERSION='V'+VERSION.split('.').slice(0,2).join('.');
applyVersionLabels();
const KEY='colony_silage_tracker_v1';
const SNAPSHOT_KEY=KEY+'_safety_snapshot';
let optionTruckId=null, weighTruckId=null, weighButton=null, selectedFraction=1, manualFraction=1, wakeLock=null, dimTimer=null, editingLoadId=null, editingHistoryId=null;
const DEFAULT_COMMODITY_LABEL='Any commodity';
const NO_COMMODITY='__none__';
const NO_NOTE='__nonote__';
// Chosen when a load carries a commodity that is no longer on the list: leave it as it is.
const KEEP_COMMODITY='__keep__';
// Load edit logs are kept on the Reports page for 60 days, then drop off on their own.
const EDIT_LOG_DAYS=60;
const defaults={unit:'t',dryMatter:35,commodities:[],commoditiesEnabled:true,dmDisplayMode:'dm',weighEveryLoad:false,duplicateWatch:{loadMinutes:0,importMinutes:0},fields:[{id:uid(),name:'North Field',size:0,note:'',commodityId:''},{id:uid(),name:'South Field',size:0,note:'',commodityId:''}],trucks:[{id:uid(),name:'Truck 1',driver:'',active:true,order:0,fullWeight:12,primaryColor:'#1f7a3f',secondaryColor:'#14532d'},{id:uid(),name:'Truck 2',driver:'',active:true,order:1,fullWeight:14,primaryColor:'#1d4ed8',secondaryColor:'#1e3a8a'}],storages:[{id:uid(),name:'Bunker 1'}],loads:[],dmReadings:[],loadWeightHistory:[],trash:[],archive:[],editLogs:[],darkMode:false,keepAwake:false,driverMode:false,textScale:1,rateWindowHours:4,licenseFarmName:'',licenseActivatedAt:null,licenseGraceDays:30,counter:{enabled:false,target:250,warning:25,startAt:null,lastResetAt:null,lastNotificationTargetAt:null,lastNotificationWarningAt:null,events:[]}};
let state=loadState();
const UNIT_TO_KG={t:1000,Tn:907.18474,kg:1,lb:0.45359237};
// Dry matter is always entered after the sample has been tested, which takes at least
// an hour, so loads keep arriving while the result is still unknown. Those loads sit
// on the previous reading even though the new result describes them, so saving a
// reading offers to pull them onto it. The window reaches back to the previous real
// reading, or 24 hours, whichever is nearer, so a first reading cannot silently
// restamp weeks of history.
// A load that already sits inside a reading window opened on its own day has a real
// dry matter for that day and must be left alone - a second or third sample taken later
// in the day describes the loads after it, not the ones already measured. Only loads
// with no window from their own day (still carrying an older reading, or nothing at
// all) are offered to the new reading, back as far as the previous real reading --
// however long that gap actually was, a week or more included.
const FEEDBACK_KEY='silageTrackerLoadFeedback';
const LOAD_SOUND_SRC='load-sound.mp3';
let loadSoundPool=[],loadSoundIndex=0;
// ---- Load edit logs ------------------------------------------------------------
// Every edit made to a load, on its own or as part of a batch, is written here with a
// copy of the load as it stood before and after. Undo puts the "before" copies back and
// drops the entry; Delete drops the entry and leaves the changes in place. Entries fall
// off the list on their own once they are EDIT_LOG_DAYS old.
const EDIT_LOG_KEYS=['truckId','truckName','driverName','fieldId','fieldName','commodityId','commodityName','fieldNote','storageId','storageName','time','wetWeight','loadWeightMode','fraction','type','manualDryMatter','dmReadingId','dmValue','dryMatter','dryWeight'];
// Loads page: hold the load, show what it looks like, and only save it on Confirm.
let pendingDuplicateLoad=null,pendingDuplicateButton=null;
// Imports: gathered while the file is being read, then offered once as a group.
let pendingImportDuplicates=[];
// Restoring a stamped duplicate: show what it looks like a copy of, and let it either
// take that load's place or sit beside it.
let pendingRestore=null,pendingRestoreChoice='';
const PAGE_TITLES={today:'Today',main:'Loads',setup:'Setup',reports:'Reports',settings:'Settings',trash:'Deleted Loads',archive:'Archive',truckEdit:'Edit Truck'};
const PAGE_ORDER=['today','main','reports','setup','settings','trash','archive'];
const HOME_PAGE='main';
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
document.getElementById('menuBtn')?.addEventListener('click',openMenu);
document.getElementById('menuBackdrop')?.addEventListener('click',closeMenu);
// Mobile swipe navigation and browser/device back-button behavior.
// Loads is always the home page. Swiping left/right moves through the app pages.
(function setupPageNavigation(){
  let startX=0,startY=0,startTime=0;
  const app=document.querySelector('.app');
  if(!app)return;
  app.addEventListener('touchstart',e=>{
    if(e.touches.length!==1)return;
    if(e.target.closest('input,select,button,textarea,.modal,.side-menu,.report-tab-strip'))return;
    startX=e.touches[0].clientX; startY=e.touches[0].clientY; startTime=Date.now();
  },{passive:true});
  app.addEventListener('touchend',e=>{
    if(!startTime||e.changedTouches.length!==1)return;
    const dx=e.changedTouches[0].clientX-startX;
    const dy=e.changedTouches[0].clientY-startY;
    const elapsed=Date.now()-startTime; startTime=0;
    if(elapsed>700||Math.abs(dx)<60||Math.abs(dx)<Math.abs(dy)*1.2)return;
    const current=document.querySelector('.panel.active')?.id||HOME_PAGE;
    const index=PAGE_ORDER.indexOf(current); if(index<0)return;
    const nextIndex=dx<0?(index+1)%PAGE_ORDER.length:(index-1+PAGE_ORDER.length)%PAGE_ORDER.length;
    switchTab(PAGE_ORDER[nextIndex]);
  },{passive:true});

  // Keep an entry inside the app so Back always returns/stays on Loads.
  history.replaceState({silageTrackerPage:HOME_PAGE},'',location.href);
  history.pushState({silageTrackerPage:HOME_PAGE},'',location.href);
  window.addEventListener('popstate',()=>{
    switchTab(HOME_PAGE,false);
    history.pushState({silageTrackerPage:HOME_PAGE},'',location.href);
  });
})();
document.getElementById('fieldSelect').onchange=()=>{state.lastFieldId=document.getElementById('fieldSelect').value;save();render()};
document.getElementById('storageSelect').onchange=e=>{state.lastStorageId=e.target.value;save()};
function handleAddTruck(){if(licenseGraceInfo().locked)return requireActivation(handleAddTruck);const n=document.getElementById('newTruckName').value.trim(),w=Number(document.getElementById('newTruckWeight').value);if(!n)return alert('Enter truck name.');if(!w||w<=0)return alert('Enter full load tonnes.');state.trucks.push({id:uid(),name:n,driver:document.getElementById('newTruckDriver').value.trim(),active:true,fullWeight:w,primaryColor:document.getElementById('newTruckPrimary').value,secondaryColor:document.getElementById('newTruckSecondary').value,order:state.trucks.length});document.getElementById('newTruckName').value='';document.getElementById('newTruckWeight').value='';document.getElementById('newTruckDriver').value='';save();render()}
document.getElementById('addTruckBtn').onclick=handleAddTruck;
function handleAddField(){if(licenseGraceInfo().locked)return requireActivation(handleAddField);const n=document.getElementById('newFieldName').value.trim(),size=Number(document.getElementById('newFieldSize').value)||0,note=document.getElementById('newFieldNote').value.trim();if(!n)return alert('Enter field name.');if(size<0)return alert('Enter a valid field size.');state.fields.push({id:uid(),name:n,size,note,commodityId:document.getElementById('newFieldCommodity')?.value||''});document.getElementById('newFieldName').value='';document.getElementById('newFieldSize').value='';document.getElementById('newFieldNote').value='';save();render()}
document.getElementById('addFieldBtn').onclick=handleAddField;
function handleAddStorage(){if(licenseGraceInfo().locked)return requireActivation(handleAddStorage);const n=document.getElementById('newStorageName').value.trim();if(!n)return alert('Enter storage name.');state.storages.push({id:uid(),name:n});document.getElementById('newStorageName').value='';save();render()}
document.getElementById('addStorageBtn').onclick=handleAddStorage;
function handleAddCommodity(){if(licenseGraceInfo().locked)return requireActivation(handleAddCommodity);const input=document.getElementById('newCommodityName');const c=createCommodity(input.value);if(!c)return;input.value='';save();render();showToast('Commodity added')}
document.getElementById('addCommodityBtn')?.addEventListener('click',handleAddCommodity);
document.getElementById('saveDmBtn').onclick=()=>{const raw=String(document.getElementById('dmInput').value||'').trim(),shown=Number(raw),v=dmFromShown(shown),eff=document.getElementById('dmEffective').value;if(raw===''||!Number.isFinite(shown)||shown<0||shown>100||!(v>0)||v>100)return alert('Enter a '+dmWordLower()+' between 0 and 100.');if(!eff)return alert('Choose the time this reading started.');const reading={id:uid(),value:v,effective:isoFromLocal(eff),created:new Date().toISOString()};state.dmReadings.push(reading);state.dryMatter=v;state.loads.forEach(l=>{if(l.manualDryMatter===null||l.manualDryMatter===undefined){const r=effectiveDMReading(l.time);if(r){l.dmReadingId=r.id;l.dmValue=Number(r.value);l.dryMatter=Number(r.value);l.dryWeight=Number(l.wetWeight)*(l.dryMatter/100)}}});const backfilled=offerBackApply(reading);save();render();showToast(backfilled?dmWord()+' applied to '+backfilled+' earlier load(s)':dmWord()+' saved and matched to loads')};
document.getElementById('dmNowBtn').onclick=()=>document.getElementById('dmEffective').value=localInputValue();
// Testing takes an hour at minimum, so the sample time is almost never "now".
document.getElementById('dmHourAgoBtn').onclick=()=>document.getElementById('dmEffective').value=localInputValue(new Date(Date.now()-60*60000));
document.getElementById('darkToggle').onchange=e=>{state.darkMode=e.target.checked;applySettings();save()};
document.getElementById('wakeToggle').onchange=async e=>{state.keepAwake=e.target.checked;applySettings();save();if(state.keepAwake)await requestWakeLock();else releaseWakeLock()};
document.getElementById('downloadBackupBtn').onclick=downloadFullBackup;
document.getElementById('restoreBackupBtn').onclick=()=>document.getElementById('backupFileInput').click();
document.getElementById('backupFileInput').onchange=e=>importBackupFile(e.target.files&&e.target.files[0]);
document.getElementById('unitSelect').onchange=e=>changeUnit(e.target.value);
document.querySelectorAll('#loadModal .choice').forEach(b=>b.onclick=()=>{selectedFraction=Number(b.dataset.fraction);document.querySelectorAll('#loadModal .choice').forEach(x=>x.classList.toggle('selected',x===b))});
document.getElementById('saveLoadOptionsBtn').onclick=()=>{const field=currentField();addLoadRecord({truckId:optionTruckId,fieldId:field&&field.id,storageId:currentStorage()&&currentStorage().id,fraction:selectedFraction,customWeight:document.getElementById('customWeight').value,time:isoFromLocal(document.getElementById('loadDateTime').value)});closeModal('loadModal')};
document.getElementById('loadTime5MinAgoBtn').onclick=()=>{document.getElementById('loadDateTime').value=localInputValue(new Date(Date.now()-5*60000))};
document.getElementById('loadTime10MinAgoBtn').onclick=()=>{document.getElementById('loadDateTime').value=localInputValue(new Date(Date.now()-10*60000))};
document.getElementById('cancelLoadBtn').onclick=()=>closeModal('loadModal');
document.getElementById('saveWeighLoadBtn').onclick=saveWeighLoad;
document.getElementById('cancelWeighLoadBtn').onclick=()=>{weighButton=null;closeModal('weighLoadModal')};
document.getElementById('manualLoadBtn').onclick=()=>openManual();
document.querySelectorAll('#manualChoices .choice').forEach(b=>b.onclick=()=>{manualFraction=Number(b.dataset.fraction);document.querySelectorAll('#manualChoices .choice').forEach(x=>x.classList.toggle('selected',x===b))});
document.getElementById('saveManualBtn').onclick=()=>{addLoadRecord({truckId:document.getElementById('manualTruck').value,fieldId:document.getElementById('manualField').value,storageId:document.getElementById('manualStorage').value,fraction:manualFraction,customWeight:document.getElementById('manualWeight').value,time:isoFromLocal(document.getElementById('manualDateTime').value)});closeModal('manualModal')};
document.getElementById('cancelManualBtn').onclick=()=>closeModal('manualModal');
let lastLoadEntryButton=null;
let timePickerHandler=null;
const COUNTER_EVENT_LABELS={started:'Counter started',stopped:'Counter stopped',paused:'Counter paused',resumed:'Counter resumed',reset:'Counter reset'};
// The truck's weights are split into one tab per commodity, plus a shared tab used by any
// commodity that has no weight of its own.
let truckWeightTabCommodityId='';
let pageEditingTruckId=null;
let batchSelectedLoadIds=new Set();
let loadSelectionMode=false;
let reportSelectionMode=false;
document.getElementById('confirmDuplicateLoadBtn')?.addEventListener('click',confirmPendingDuplicateLoad);
document.getElementById('cancelDuplicateLoadBtn')?.addEventListener('click',cancelPendingDuplicateLoad);
document.getElementById('importDuplicateKeepBtn')?.addEventListener('click',keepImportedDuplicates);
document.getElementById('importDuplicateTrashBtn')?.addEventListener('click',trashImportedDuplicates);
document.getElementById('restoreDuplicateReplaceBtn')?.addEventListener('click',replaceRestoreDuplicate);
document.getElementById('restoreDuplicateBothBtn')?.addEventListener('click',keepBothRestoreDuplicate);
document.getElementById('restoreDuplicateCancelBtn')?.addEventListener('click',cancelRestoreDuplicate);
document.querySelectorAll('.report-tab').forEach(b=>b.addEventListener('click',()=>{selectReportTab(b.dataset.reportTab);b.scrollIntoView({block:'nearest',inline:'nearest'})}));
let openArchiveDetails=new Set();
let editingTruckId=null;
let editingFieldId=null;
document.getElementById('saveEditFieldBtn')?.addEventListener('click',saveEditedField);
document.getElementById('editLoadField')?.addEventListener('change',e=>{const n=document.getElementById('editLoadNote');if(n)n.value=fieldNoteFor(e.target.value);const c=document.getElementById('editLoadCommodity');if(c){const f=state.fields.find(x=>x.id===e.target.value);c.innerHTML=commoditySelectOptions(f&&commodityById(f.commodityId)?f.commodityId:'')}});
document.getElementById('cancelEditFieldBtn')?.addEventListener('click',()=>{editingFieldId=null;closeModal('editFieldModal')});
function handleAddCommodityFromEditField(){if(licenseGraceInfo().locked)return requireActivation(handleAddCommodityFromEditField);const n=prompt('New commodity name');if(n===null)return;const c=createCommodity(n);if(!c)return;localStorage.setItem(KEY,JSON.stringify(state));fillEditFieldCommodity(c.id);renderCommoditySetup();showToast('Commodity added')}
document.getElementById('editFieldNewCommodityBtn')?.addEventListener('click',handleAddCommodityFromEditField);
// Each filter holds a set rather than one value, so a report can be pulled for two drivers
// across three fields at once. An empty set means the filter is not narrowing anything.
let reportSelections={fields:[],commodities:[],notes:[],storages:[],trucks:[],drivers:[]};
let openFilterKeys=new Set();
// Two ways in. From the Loads page the commodity is already known - it is whatever the
// current field is carting - so it is shown as settled. From Setup there is no field in play,
// so the commodity tab has to be asked for before a weight can be saved.
let historyCommodityFixed=false,historyCommodityValue='';
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&state.keepAwake)requestWakeLock()});
['pointerdown','keydown','touchstart'].forEach(evt=>document.addEventListener(evt,resetDimTimer,{passive:true}));
document.getElementById('loadSelectAllBtn')?.addEventListener('click',()=>selectAllVisibleLoads('loads'));
document.getElementById('reportSelectAllBtn')?.addEventListener('click',()=>selectAllVisibleLoads('reports'));
document.getElementById('clearAllLoadsBtn')?.addEventListener('click',clearAllLoadsToArchive);
document.getElementById('clearAllDataBtn')?.addEventListener('click',clearAllData);
document.getElementById('historyTruck').onchange=()=>{cancelWeightHistoryEdit();renderWeightHistory()};
document.getElementById('historyCommodity')?.addEventListener('change',()=>{cancelWeightHistoryEdit();renderWeightHistory()});
document.getElementById('saveHistoryBtn').onclick=saveWeightHistory;
document.getElementById('cancelHistoryEditBtn').onclick=cancelWeightHistoryEdit;
document.getElementById('closeHistoryBtn').onclick=()=>closeModal('weightHistoryModal');
document.getElementById('exportType').onchange=updateExportOptions;
document.getElementById('runExportBtn').onclick=exportCSV;
document.getElementById('cancelExportBtn').onclick=()=>closeModal('exportModal');
document.getElementById('saveEditLoadBtn').onclick=saveEditedLoad;
document.getElementById('deleteEditLoadBtn')?.addEventListener('click',deleteEditedLoad);
document.getElementById('saveEditTruckBtn')?.addEventListener('click',saveEditedTruck);
document.getElementById('cancelEditLoadBtn').onclick=()=>closeModal('editLoadModal');
document.getElementById('saveEditTruckBtn')?.addEventListener('click',saveEditedTruck);
document.getElementById('cancelEditTruckBtn')?.addEventListener('click',()=>{editingTruckId=null;closeModal('editTruckModal')});
['reportFrom','reportTo'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>{refreshFilterLabels();renderReportResults()}));
bindReportFilterEvents();
document.getElementById('reportSort')?.addEventListener('change',()=>{state.reportSort=currentReportSort();saveCounterStateOnly();renderReports()});
document.getElementById('clearReportFilters')?.addEventListener('click',()=>{clearReportSelections();['reportFrom','reportTo'].forEach(id=>{const e=document.getElementById(id);if(e)e.value=''});renderReports()});
document.getElementById('fieldSummaryBtn')?.addEventListener('click',summarizeFieldAndClearLoads);
document.getElementById('saveSnapshotBtn')?.addEventListener('click',shareDeviceSnapshot);
document.getElementById('saveFieldSnapshotBtn')?.addEventListener('click',shareFieldSnapshot);
(function(){
  const track=document.getElementById('slideUnlockTrack'),handle=document.getElementById('slideUnlockHandle'),cancelBtn=document.getElementById('slideUnlockCancelBtn');
  if(handle){handle.addEventListener('pointerdown',slideStart);}
  if(track){track.addEventListener('pointerdown',slideStart);}
  window.addEventListener('pointermove',slideMove);
  window.addEventListener('pointerup',slideEnd);
  cancelBtn?.addEventListener('click',closeSlideUnlockModal);
})();
document.getElementById('restoreSnapshotBtn')?.addEventListener('click',()=>document.getElementById('snapshotFileInput')?.click());
document.getElementById('snapshotFileInput')?.addEventListener('change',e=>importDeviceSnapshotFile(e.target.files&&e.target.files[0]));
document.getElementById('reportCsvBtn')?.addEventListener('click',exportFilteredCSV);
document.getElementById('importLoadsBtn')?.addEventListener('click',()=>document.getElementById('importLoadsFileInput')?.click());
document.getElementById('importLoadsFileInput')?.addEventListener('change',e=>importLoadsCsvFile(e.target.files?.[0]));
document.getElementById('counterStat')?.addEventListener('click',openCounter);
document.getElementById('rateStat')?.addEventListener('click',openRateWindowSetting);
document.querySelector('.topgrid')?.addEventListener('click',e=>{const b=e.target.closest('#counterStat');if(b&&state.counter?.enabled)openCounter();});
document.getElementById('updateWeightFromLoadBtn')?.addEventListener('click',()=>{const id=optionTruckId;const f=currentField();const cid=f?fieldCommodityId(f.id):'';closeModal('loadModal');openWeightHistory(id,{commodityId:cid,fixed:true,fixedReason:f?('Taken from the current field, '+f.name+', so the weight is filed under this tab.'):'Taken from the current field.'})});
document.getElementById('closeCounterBtn')?.addEventListener('click',()=>closeModal('counterModal'));
document.getElementById('saveCounterSettingsBtn')?.addEventListener('click',saveCounterSettings);
document.getElementById('counterAlertSmsBtn')?.addEventListener('click',openCounterAlertSms);
document.getElementById('counterAlertWhatsAppBtn')?.addEventListener('click',openCounterAlertWhatsApp);
document.getElementById('counterAlertDismissBtn')?.addEventListener('click',dismissCounterAlert);
document.getElementById('counterMissedStartBtn')?.addEventListener('click',setMissedCounterStart);
document.getElementById('counterPauseBtn')?.addEventListener('click',toggleCounterPause);
document.getElementById('resetCounterBtn')?.addEventListener('click',resetCounter);
document.getElementById('dmToggle')?.addEventListener('click',toggleDmSection);
document.getElementById('dmPickBtn')?.addEventListener('click',()=>pickDateTime({title:dmWord()+' Reading Time',label:'This reading applies from',value:document.getElementById('dmEffective').value||new Date(),onSave:iso=>{document.getElementById('dmEffective').value=localInputValue(new Date(iso))}}));
document.querySelectorAll('#timePickerModal [data-quick]').forEach(b=>b.addEventListener('click',()=>{const mins=Number(b.dataset.quick)||0;document.getElementById('timePickerInput').value=localInputValue(new Date(Date.now()-mins*60000))}));
document.getElementById('timePickerSaveBtn')?.addEventListener('click',()=>{const v=document.getElementById('timePickerInput').value;if(!v)return alert('Choose a date and time.');const d=new Date(v);if(!Number.isFinite(d.getTime()))return alert('Choose a valid date and time.');const fn=timePickerHandler;timePickerHandler=null;closeModal('timePickerModal');if(fn)fn(d.toISOString())});
document.getElementById('timePickerCancelBtn')?.addEventListener('click',()=>{timePickerHandler=null;closeModal('timePickerModal')});
document.getElementById('loadSelectBtn')?.addEventListener('click',()=>setSelectionMode('loads',!loadSelectionMode));
document.getElementById('reportSelectBtn')?.addEventListener('click',()=>setSelectionMode('reports',!reportSelectionMode));
document.getElementById('batchEditBtn')?.addEventListener('click',openBatchEdit);
document.getElementById('reportBatchEditBtn')?.addEventListener('click',openBatchEdit);
document.getElementById('reviewBatchEditBtn')?.addEventListener('click',reviewBatchEdit);
document.getElementById('confirmBatchEditBtn')?.addEventListener('click',applyBatchEdit);
document.getElementById('cancelBatchEditBtn')?.addEventListener('click',()=>closeModal('batchEditModal'));
document.getElementById('cancelBatchConfirmBtn')?.addEventListener('click',()=>closeModal('batchConfirmModal'));
document.getElementById('savePageTruckBtn')?.addEventListener('click',savePageTruck);
document.getElementById('deletePageTruckBtn')?.addEventListener('click',deletePageTruck);
['pageTruckName','pageTruckDriver','pageTruckPrimary','pageTruckSecondary'].forEach(id=>document.getElementById(id)?.addEventListener('input',updatePageTruckPreview));
['newTruckName','newTruckDriver','newTruckPrimary','newTruckSecondary'].forEach(id=>document.getElementById(id)?.addEventListener('input',updateNewTruckPreview));
['editTruckName','editTruckDriver','editTruckPrimary','editTruckSecondary'].forEach(id=>document.getElementById(id)?.addEventListener('input',()=>updateTruckPreview('editTruck')));
updateNewTruckPreview();
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
bindActivationPromptModal();
render();
if(state.keepAwake)requestWakeLock();
document.getElementById("pdfBtn")?.addEventListener("click",()=>window.print());
document.getElementById("reportPrintBtn")?.addEventListener("click",()=>{document.body.classList.add("print-reports-only");window.print()});
window.addEventListener("afterprint",()=>document.body.classList.remove("print-reports-only"));
