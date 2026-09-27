function applyVersionLabels(){const set=(id,text)=>{const el=document.getElementById(id);if(el)el.textContent=text};document.title='Silage Tracker Pro '+SHORT_VERSION;set('appTitleText','Silage Tracker Pro '+SHORT_VERSION);set('appVersionText','Version '+VERSION+' · Build '+BUILD+' · Offline');set('menuVersionText','V'+VERSION+' · Build '+BUILD);set('aboutTitleText','Silage Tracker Pro '+SHORT_VERSION);set('aboutVersionText','Version '+VERSION+' · Build '+BUILD)}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
// A stored dry matter of null must stay null. Number(null) is 0, which passed the
// old Number.isFinite() check and turned "no manual reading" into "manual 0%" on
// every reload, wiping the dry matter and dry weight off loads. 0% is never a real
// reading, so it is read back as unset, which also repairs loads already saved that way.
function dmOrNull(v){const n=Number(v);return v===null||v===undefined||v===''||!Number.isFinite(n)||n<=0?null:n}
function loadState(){let s;try{s=JSON.parse(localStorage.getItem(KEY))}catch(e){};s=s||structuredClone(defaults);s.commodities=Array.isArray(s.commodities)?s.commodities:[];s.commodities=s.commodities.filter(c=>c&&String(c.name||'').trim()).map((c,i)=>({id:c.id||uid(),name:String(c.name).trim(),order:Number.isFinite(c.order)?c.order:i}));s.commodities.sort((a,b)=>a.order-b.order);s.commodities.forEach((c,i)=>c.order=i);s.commoditiesEnabled=s.commoditiesEnabled!==false;const commodityIds=new Set(s.commodities.map(c=>c.id));s.fields=Array.isArray(s.fields)?s.fields:[];s.fields.forEach(f=>{f.size=Number(f.size)||0;f.note=f.note||'';f.commodityId=commodityIds.has(f.commodityId)?f.commodityId:''});s.trucks=Array.isArray(s.trucks)?s.trucks:[];s.trucks.forEach((t,i)=>{t.id=t.id||uid();t.primaryColor=t.primaryColor||t.color||['#1f7a3f','#1d4ed8','#b45309','#7e22ce'][i%4];t.secondaryColor=t.secondaryColor||t.primaryColor;t.driver=typeof t.driver==='string'?t.driver:'';t.active=t.active!==false;t.order=Number.isFinite(t.order)?t.order:i});s.trucks.sort((a,b)=>a.order-b.order);s.storages=Array.isArray(s.storages)?s.storages:[];if(!s.storages.length)s.storages=[{id:uid(),name:'Unassigned'}];s.lastStorageId=s.lastStorageId||s.storages[0].id;s.lastFieldId=s.fields.some(f=>f.id===s.lastFieldId)?s.lastFieldId:(s.fields[0]&&s.fields[0].id)||'';s.loads=Array.isArray(s.loads)?s.loads:[];s.trash=Array.isArray(s.trash)?s.trash:[];const cutoff=Date.now()-30*24*60*60*1000;s.trash=s.trash.filter(l=>!l.deletedAt||new Date(l.deletedAt).getTime()>cutoff);s.archive=Array.isArray(s.archive)?s.archive:[];s.archive.forEach(a=>{a.id=a.id||uid();a.loads=Array.isArray(a.loads)?a.loads:[];a.trucks=Array.isArray(a.trucks)?a.trucks:[];a.storages=Array.isArray(a.storages)?a.storages:[]});s.loads.concat(s.trash).forEach(l=>{const lf=s.fields.find(f=>f.id===l.fieldId);if(!l.detailsStamped){if(lf&&!l.commodityId&&typeof l.commodityName!=='string')l.commodityId=lf.commodityId||'';if(typeof l.commodityName!=='string')l.commodityName=l.commodityId?(s.commodities.find(c=>c.id===l.commodityId)?.name||''):'';if(typeof l.fieldNote!=='string')l.fieldNote=lf?String(lf.note||'').trim():'';l.detailsStamped=true}l.commodityId=typeof l.commodityId==='string'?l.commodityId:'';l.commodityName=typeof l.commodityName==='string'?l.commodityName:'';l.fieldNote=String(l.fieldNote||'').trim()});s.loads.forEach(l=>{l.id=l.id||uid();l.storageId=l.storageId||'';l.storageName=l.storageName||'';l.driverName=typeof l.driverName==='string'?l.driverName:(s.trucks.find(t=>t.id===l.truckId)?.driver||'');l.manualDryMatter=dmOrNull(l.manualDryMatter);l.dmReadingId=l.dmReadingId||null;l.dmValue=dmOrNull(l.dmValue);if(!(Number(l.fraction)>0))l.fraction=l.type==='3/4'?.75:l.type==='1/2'?.5:1;if(!l.loadWeightMode)l.loadWeightMode=l.type==='Custom'?'custom':'history'});s.loadWeightHistory=Array.isArray(s.loadWeightHistory)?s.loadWeightHistory:[];s.loadWeightHistory=s.loadWeightHistory.filter(r=>r&&r.truckId&&Number(r.weight)>0&&r.effective).map(r=>({id:r.id||uid(),truckId:r.truckId,commodityId:commodityIds.has(r.commodityId)?r.commodityId:'',weight:Number(r.weight),effective:r.effective,created:r.created||new Date().toISOString()}));s.dmReadings=Array.isArray(s.dmReadings)?s.dmReadings:[];s.dmReadings=s.dmReadings.filter(r=>r&&Number(r.value)>0&&r.effective&&Number.isFinite(new Date(r.effective).getTime())).map(r=>({id:r.id||uid(),value:Number(r.value),effective:r.effective,created:r.created||new Date().toISOString()}));s.unit=['t','Tn','kg','lb'].includes(s.unit)?s.unit:'t';if(!s.dmReadings.length){s.dmReadings=[{id:uid(),value:Number(s.dryMatter)||35,effective:'1970-01-01T00:00:00.000Z',created:new Date().toISOString()}]}s.darkMode=!!s.darkMode;s.keepAwake=!!s.keepAwake;s.theme=sanitizeTheme(s.theme);s.driverMode=!!s.driverMode;s.cycleTimeBreakMinutes=clampCycleBreakMinutes(s.cycleTimeBreakMinutes);s.rateWindowHours=clampRateWindowHours(s.rateWindowHours);s.textScale=clampTextScale(s.textScale);s.licenseFarmName=typeof s.licenseFarmName==='string'?s.licenseFarmName.trim():'';s.licenseActivatedAt=s.licenseActivatedAt&&Number.isFinite(new Date(s.licenseActivatedAt).getTime())?s.licenseActivatedAt:null;s.licenseGraceDays=clampGraceDays(s.licenseGraceDays);
// One-time grandfathering: a device that already had real usage before Annual Activation
// existed shouldn't be retroactively locked out the moment this version reaches it -- only a
// genuinely fresh install (never logged a load, never touched anything) faces the initial gate.
// This check runs exactly once per device, guarded by licenseGrandfathered, so a device that
// legitimately goes on to expire later doesn't get silently re-granted a free pass forever.
if(!s.licenseActivatedAt&&!s.licenseGrandfathered){
  const hasHistory=(s.loads&&s.loads.length)||(s.trash&&s.trash.length)||(s.archive&&s.archive.length)||(s.editLogs&&s.editLogs.length);
  if(hasHistory)s.licenseActivatedAt=new Date().toISOString();
}
s.licenseGrandfathered=true;
s.counter=s.counter&&typeof s.counter==='object'?s.counter:{};
s.counter.enabled=!!s.counter.enabled;s.counter.target=Number(s.counter.target)>0?Number(s.counter.target):250;
s.counter.warning=Number(s.counter.warning)>=0?Number(s.counter.warning):25;s.counter.startAt=s.counter.startAt||null;s.counter.lastResetAt=s.counter.lastResetAt||null;
s.counter.lastNotificationTargetAt=s.counter.lastNotificationTargetAt||null;s.counter.lastNotificationWarningAt=s.counter.lastNotificationWarningAt||null;s.counter.events=Array.isArray(s.counter.events)?s.counter.events:[];
s.counter.alertNumber=typeof s.counter.alertNumber==='string'?s.counter.alertNumber.trim():'';s.counter.alertDismissedAt=s.counter.alertDismissedAt||null;
s.counter.events=s.counter.events.filter(e=>e&&e.at&&Number.isFinite(new Date(e.at).getTime()));
if(s.counter.startAt&&!s.counter.events.some(e=>e.type==='started'||e.type==='reset'))s.counter.events.push({id:uid(),type:'started',at:s.counter.startAt,amount:0,target:Number(s.counter.target)||250});
s.editLogs=Array.isArray(s.editLogs)?s.editLogs:[];s.editLogs=s.editLogs.filter(e=>e&&e.id&&e.at&&Array.isArray(e.entries)&&Number.isFinite(new Date(e.at).getTime()));const editLogCutoff=Date.now()-EDIT_LOG_DAYS*24*60*60*1000;s.editLogs=s.editLogs.filter(e=>new Date(e.at).getTime()>editLogCutoff);
s.dmDisplayMode=s.dmDisplayMode==='moisture'?'moisture':'dm';s.weighEveryLoad=!!s.weighEveryLoad;s.duplicateWatch=s.duplicateWatch&&typeof s.duplicateWatch==='object'?s.duplicateWatch:{};s.duplicateWatch.loadMinutes=clampDupMinutes(s.duplicateWatch.loadMinutes);s.duplicateWatch.importMinutes=clampDupMinutes(s.duplicateWatch.importMinutes);(s.trash||[]).forEach(l=>{l.importedDuplicate=!!l.importedDuplicate;l.duplicateOfIds=Array.isArray(l.duplicateOfIds)?l.duplicateOfIds.filter(x=>typeof x==='string'):[]});s.dmCollapsed=s.dmCollapsed!==false;s.reportSort=reportSortOptions().some(o=>o[0]===s.reportSort)?s.reportSort:'time-desc';return s}
function save(){recalculateLoads();purgeExpiredTrash();purgeExpiredEditLogs();localStorage.setItem(KEY,JSON.stringify(state));document.getElementById('saveStatus').textContent='Saved';showToast('Saved')}
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>t.classList.remove('show'),1000)}
function money(n){return (Number(n)||0).toFixed(2)}
// Dry matter is what every reading, load and total is stored and calculated in.
// Moisture is the same number read the other way round, 100 minus the dry matter, so
// the switch in Settings only changes what is shown on screen and what is typed into
// the reading boxes. Nothing stored changes, and switching back shows the same figures.
function moistureMode(){try{return state&&state.dmDisplayMode==='moisture'}catch(e){return false}}
function dmWord(){return moistureMode()?'Moisture':'Dry Matter'}
function dmWordLower(){return moistureMode()?'moisture':'dry matter'}
function dmAbbr(){return moistureMode()?'MC':'DM'}
function dmToShown(dm){const n=Number(dm);if(!(n>0))return 0;return moistureMode()?100-n:n}
function dmFromShown(v){const n=Number(v);if(!Number.isFinite(n))return NaN;return moistureMode()?100-n:n}
function dmPct(dm){return money(dmToShown(dm))+'%'}
function dmChip(dm){return dmAbbr()+' '+dmPct(dm)}
function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function q(s){return String(s||'').replace(/"/g,'""')}
function truckForLoad(l){return state.trucks.find(t=>t.id===l.truckId)}
function fieldForLoad(l){return state.fields.find(f=>f.id===l.fieldId)}
function storageForLoad(l){return state.storages.find(x=>x.id===l.storageId)}
function truckDisplay(l){return truckForLoad(l)?.name||l.truckName||'Unknown Truck'}
function fieldDisplay(l){return fieldForLoad(l)?.name||l.fieldName||'Unknown Field'}
function storageDisplay(l){return storageForLoad(l)?.name||l.storageName||''}
function commodityById(id){return (state.commodities||[]).find(c=>c.id===id)||null}
function commodityLabel(id){return commodityById(id)?.name||''}
function commodityTabLabel(id){return commodityLabel(id)||DEFAULT_COMMODITY_LABEL}
function fieldCommodityId(fieldId){const f=state.fields.find(x=>x.id===fieldId);return f&&commodityById(f.commodityId)?f.commodityId:''}
function commodityDisplay(l){return commodityLabel(l.commodityId)||l.commodityName||''}
// The commodity feature can be switched off in Settings. It is a visibility switch only:
// commodities, the commodity on each field, and the per-commodity truck weights are all left
// untouched, so nothing is recalculated and everything reappears exactly as it was on switching
// back on. commodityChip is the display-only form used by the pages; commodityDisplay itself
// stays honest so CSV exports keep their Commodity column either way.
function commoditiesOn(){return state.commoditiesEnabled!==false}
function commodityChip(l){return commoditiesOn()?commodityDisplay(l):''}
// The commodity blocks stay in the document and are only hidden, so switching the feature back
// on restores them with whatever was already in them.
function applyDmDisplay(){
  const set=(id,text)=>{const el=document.getElementById(id);if(el)el.textContent=text};
  const moist=moistureMode();
  set('dmCardLabel',dmWord()+' Reading');
  set('reportDmLabel','Average '+dmAbbr());
  set('batchDMLabel',dmWord()+' %');
  set('editLoadDMLabel',dmWord()+' %');
  set('weighLoadDmLabel',dmWord()+' %');
  const input=document.getElementById('dmInput');if(input)input.placeholder=dmAbbr()+' %';
  set('dmCardNote','Set the time the sample was taken, not the time the result came back. The reading applies from that time until the next reading, and because results always arrive after the loads are carted, saving a reading offers to apply it to earlier loads that have no reading from their own day. Loads that already sit inside a reading taken the same day keep the value they have. Backdated loads are recalculated automatically.'+(moist?' Readings are shown and entered as moisture; the app still stores them as dry matter, so nothing is recalculated by the switch.':''));
}
function applyCommodityVisibility(){const on=commoditiesOn();['newFieldCommodityWrap','addCommodityCard','commodityCard','editFieldCommodityWrap','editFieldCommodityNote','editFieldNewCommodityBtn','editLoadCommodityWrap','batchCommodityWrap'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display=on?'':'none'})}
// A load's commodity is a property of its field, so it is refreshed from the field on every
// recalculation. Loads whose field has since been deleted keep the name they were saved with.
// Never called from recalculateLoads any more. A load keeps the commodity and note
// it was carted under, so re-cropping a field leaves the earlier cut's history alone.
function refreshLoadCommodity(l){const f=state.fields.find(x=>x.id===l.fieldId);if(!f)return;l.commodityId=commodityById(f.commodityId)?f.commodityId:'';l.commodityName=commodityLabel(l.commodityId)}
// The note on a field is where cuts get marked down (first cut, second cut, and so on). It is
// stamped onto each load as that load is recorded and then left alone, because re-reading it from
// the field later would relabel every earlier cut the moment the note is changed for the next one.
function fieldNoteFor(fieldId){const f=state.fields.find(x=>x.id===fieldId);return f?String(f.note||'').trim():''}
function noteDisplay(l){return String(l&&l.fieldNote||'').trim()}
// counterPeriods() only describes the run the current total covers, because a reset zeroes the
// count and throws the earlier spans away. Whether a load was inoculated is history, so this walks
// every event and keeps all of them, treating a reset as the run carrying on rather than a new one.
function inoculantPeriods(){const c=state.counter||{};const evs=(c.events||[]).filter(e=>e&&e.at&&Number.isFinite(new Date(e.at).getTime())).slice().sort((a,b)=>new Date(a.at)-new Date(b.at));const periods=[];let open=null;if(c.startAt&&!evs.some(e=>e.type==='started'||e.type==='reset'))open={start:c.startAt,end:null};for(const e of evs){if(e.type==='started'||e.type==='reset'||e.type==='resumed'){if(!open)open={start:e.at,end:null}}else if(e.type==='paused'||e.type==='stopped'){if(open){open.end=e.at;periods.push(open);open=null}}}if(open)periods.push(open);return periods}
function inoculantSpans(){return inoculantPeriods().map(p=>[new Date(p.start).getTime(),p.end===null?Infinity:new Date(p.end).getTime()])}
function wasInoculated(l,spans){if(typeof (l&&l.inoculated)==='boolean')return l.inoculated;const t=new Date(l&&l.time).getTime();if(!Number.isFinite(t))return false;return (spans||inoculantSpans()).some(([a,b])=>t>=a&&t<b)}
// Loads only carry an inoculant marker once the counter has actually been used, so people who
// leave it switched off are not told 'No inoculant' on every row they look at.
function inoculantTracked(){const c=state.counter||{};return !!c.enabled||(c.events||[]).length>0}
function inoculantBadge(l,spans){if(!inoculantTracked())return '';const yes=wasInoculated(l,spans);return `<span class="ino-badge ${yes?'yes':'no'}">${yes?'Inoculant ✓':'No inoculant'}</span>`}
function importedBadge(l){return l.snapshotImported?'<span class="dup-badge">Imported</span>':''}
function inoculantWord(l,spans){return wasInoculated(l,spans)?'Yes':'No'}
function commoditySelectOptions(selected,{noneLabel='No commodity'}={}){return [`<option value="" ${selected?'':'selected'}>${esc(noneLabel)}</option>`].concat((state.commodities||[]).map(c=>`<option value="${c.id}" ${selected===c.id?'selected':''}>${esc(c.name)}</option>`)).join('')}
function unitLabel(u=state.unit){return ({t:'t',Tn:'Tn',kg:'kg',lb:'lb'})[u]||u}
function convertWeight(value,from,to){return Number(value)*UNIT_TO_KG[from]/UNIT_TO_KG[to]}
function changeUnit(newUnit){const old=state.unit;if(newUnit===old)return;if(!UNIT_TO_KG[newUnit])return;state.trucks.forEach(t=>t.fullWeight=convertWeight(t.fullWeight,old,newUnit));state.loadWeightHistory.forEach(r=>r.weight=convertWeight(r.weight,old,newUnit));state.loads.forEach(l=>{const from=l.unit&&UNIT_TO_KG[l.unit]?l.unit:old;l.wetWeight=convertWeight(l.wetWeight,from,newUnit);l.dryWeight=convertWeight(l.dryWeight,from,newUnit);l.unit=newUnit});state.unit=newUnit;save();render();showToast('Units changed')}
function currentField(){const sel=document.getElementById('fieldSelect');return state.fields.find(f=>f.id===sel.value)||state.fields[0]}
function currentStorage(){const sel=document.getElementById('storageSelect');return state.storages.find(x=>x.id===sel.value)||state.storages[0]}
function effectiveDMReading(iso){const when=new Date(iso).getTime();let chosen=null,earliest=null;for(const r of state.dmReadings){const t=new Date(r.effective).getTime();if(!Number.isFinite(t))continue;if(!earliest||t<new Date(earliest.effective).getTime())earliest=r;if(t<=when&&(!chosen||t>new Date(chosen.effective).getTime()))chosen=r}
// A result is only entered once the sample has been tested, so a load carted before
// every reading still belongs to the first reading rather than to no reading at all.
return chosen||earliest}
 function effectiveDM(iso){const r=effectiveDMReading(iso);return r?Number(r.value):0}
function isSeedReading(r){return String(r&&r.effective||'').startsWith('1970-')}
function previousRealReading(reading){const when=new Date(reading.effective).getTime();return state.dmReadings.filter(r=>r.id!==reading.id&&!isSeedReading(r)&&new Date(r.effective).getTime()<when).sort((a,b)=>new Date(a.effective)-new Date(b.effective)).pop()||null}
function sameLocalDay(a,b){const x=new Date(a),y=new Date(b);return x.getFullYear()===y.getFullYear()&&x.getMonth()===y.getMonth()&&x.getDate()===y.getDate()}
function readingForLoad(l){return state.dmReadings.find(r=>r.id===l.dmReadingId)||effectiveDMReading(l.time)}
function loadHasSameDayReading(l){const r=readingForLoad(l);if(!r||isSeedReading(r))return false;if(dmOrNull(l.dryMatter)===null)return false;return sameLocalDay(r.effective,l.time)}
function loadsAwaitingReading(reading){const eff=new Date(reading.effective).getTime();const prev=previousRealReading(reading);const from=prev?new Date(prev.effective).getTime():-Infinity;return state.loads.filter(l=>{if(l.manualDryMatter!==null&&l.manualDryMatter!==undefined)return false;if(l.dmReadingId===reading.id)return false;if(loadHasSameDayReading(l))return false;const t=new Date(l.time).getTime();return Number.isFinite(t)&&t<eff&&t>from})}
function offerBackApply(reading){const pending=loadsAwaitingReading(reading);if(!pending.length)return 0;const times=pending.map(l=>new Date(l.time).getTime());const msg=pending.length+' load(s) were carted before this reading\'s time, between '+fmtDateTime(new Date(Math.min(...times)).toISOString())+' and '+fmtDateTime(new Date(Math.max(...times)).toISOString())+'.\n\nNone of them fall inside a '+dmWordLower()+' reading taken on their own day, so they are still carrying an older reading. Apply '+dmPct(reading.value)+' to them as well?';if(!confirm(msg))return 0;pending.forEach(l=>{l.dmReadingId=reading.id;l.dmValue=Number(reading.value);l.dryMatter=Number(reading.value);l.dryWeight=Number(l.wetWeight)*(Number(reading.value)/100)});return pending.length}
// Every truck keeps a weight tab per commodity plus an "any commodity" tab. A weight entered
// on the commodity's own tab wins; with none entered the truck falls back to the shared tab,
// and then to the base full load weight from Setup.
function effectiveLoadWeight(truckId,iso,commodityId){const truck=state.trucks.find(t=>t.id===truckId);const when=new Date(iso).getTime();const pick=want=>{let chosen=null;(state.loadWeightHistory||[]).forEach(r=>{if(r.truckId!==truckId||(r.commodityId||'')!==want)return;const t=new Date(r.effective).getTime();if(!Number.isFinite(t)||t>when)return;if(!chosen||t>new Date(chosen.effective).getTime())chosen=r});return chosen};const cid=commodityId||'';const chosen=(cid?pick(cid):null)||pick('');return chosen?Number(chosen.weight):Number(truck&&truck.fullWeight)||0}
function recalculateLoads(){state.loads.forEach(l=>{if(l.loadWeightMode!=='custom'){const fraction=Number(l.fraction)>0?Number(l.fraction):(l.type==='3/4'?.75:l.type==='1/2'?.5:1);l.fraction=fraction;l.wetWeight=effectiveLoadWeight(l.truckId,l.time,l.commodityId)*fraction;l.unit=state.unit}if(l.manualDryMatter!==null&&l.manualDryMatter!==undefined){l.dryMatter=Number(l.manualDryMatter)}else if(l.dmReadingId){const source=state.dmReadings.find(r=>r.id===l.dmReadingId);if(source)l.dryMatter=Number(source.value);else{const r=effectiveDMReading(l.time);if(r){l.dmReadingId=r.id;l.dmValue=Number(r.value);l.dryMatter=Number(r.value)}else{l.dmReadingId=null;l.dryMatter=Number(l.dmValue)||Number(l.dryMatter)||0}}}else{const cached=dmOrNull(l.dmValue);if(cached!==null){l.dryMatter=cached}else{const r=effectiveDMReading(l.time);l.dmReadingId=r?r.id:null;l.dmValue=r?Number(r.value):dmOrNull(l.dryMatter);l.dryMatter=Number(l.dmValue)||0}}l.dryWeight=Number(l.wetWeight)*(Number(l.dryMatter)/100)});state.loads.sort((a,b)=>new Date(b.time)-new Date(a.time))}
function localInputValue(date=new Date()){const d=new Date(date.getTime()-date.getTimezoneOffset()*60000);return d.toISOString().slice(0,16)}
function isoFromLocal(value){const d=new Date(value);return isNaN(d)?new Date().toISOString():d.toISOString()}
function fmtTime(iso){return new Date(iso).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}
function fmtDateTime(iso){return new Date(iso).toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}
// Cycle time: the time between one load and the next for the same truck, which
// approximates a round trip (dump, drive back, reload, drive to storage). Only
// loads still on the Loads page count -- Trash is excluded, same as other stats.
// No gap is discarded for being long (a lunch break or overnight stop still shows
// up as a long cycle) so the numbers always mean exactly what they say: the real
// time between two recorded loads.
function clampCycleBreakMinutes(v){const n=Math.round(Number(v));if(!Number.isFinite(n))return 120;return Math.max(0,Math.min(n,1440))}
// How far back the dashboard Rate figure looks, in hours -- 0 means no window, use the field's
// whole history the way it always did. Reports keeps using its own date filters for this instead
// of a rolling window, since a report is a chosen historical period, not a live glance.
function clampRateWindowHours(v){const n=Math.round(Number(v));if(!Number.isFinite(n))return 4;return Math.max(0,Math.min(n,24))}
// Annual activation: entirely offline, no server, no payment processing -- a code entered by
// hand, checked with a fixed formula baked into the app itself. Deliberately not real security
// (anyone reading the code could work out the formula and generate a code for any farm name) --
// it's a per-farm checkpoint, not a lock against a determined bypass. Tying the code to a farm
// name means the SAME code doesn't work if it's passed along to a different farm entirely, while
// every device and every user at one farm can share the one code that farm was given.
// The code itself is deliberately opaque: no visible year prefix or other substructure, so
// nothing about its format hints at the formula. A small avalanche mix (MurmurHash3-style
// finalizer) means codes for consecutive years look nothing alike, and the alphabet excludes
// 0/O/1/I/L so it can't be misread when handwritten -- the same alphabet already used for the
// Driver Mode recovery code.
const CODE_ALPHABET='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function hashFarmName(name){const s=String(name||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');let h=0;for(let i=0;i<s.length;i++)h=(Math.imul(h,31)+s.charCodeAt(i))>>>0;return h}
function encodeActivationDigits(num,length){let s='';for(let i=0;i<length;i++){s=CODE_ALPHABET[num%CODE_ALPHABET.length]+s;num=Math.floor(num/CODE_ALPHABET.length)}return s}
function activationCodeForFarm(farmName,year){
  const fh=hashFarmName(farmName);
  let h=(fh^Math.imul(year,2654435761))>>>0;
  h=Math.imul(h^(h>>>16),2246822507)>>>0;
  h=Math.imul(h^(h>>>13),3266489909)>>>0;
  h^=(h>>>16);h=h>>>0;
  const code=encodeActivationDigits(h,7);
  return code.slice(0,3)+'-'+code.slice(3,7);
}
function clampGraceDays(){return 30}
function licenseExpiry(activatedAt){const d=new Date(activatedAt);d.setFullYear(d.getFullYear()+1);return d}
// No page is ever locked, before or after activation. Instead, the actions that actually matter
// -- logging a load, changing Setup, and the higher-stakes Settings actions -- check this gate
// themselves and prompt for a farm name and code right there if one is needed. Browsing any page,
// including Reports and Setup, is always free. A never-activated device and one whose grace
// period has run out are the same "locked" state here; there's no separate hard wall anymore.
function licenseGraceInfo(){
  const activatedAt=state.licenseActivatedAt;
  if(!activatedAt)return {active:false,inGrace:false,locked:true,daysLeft:0,expiresAt:null};
  const expiry=licenseExpiry(activatedAt);
  if(Date.now()<=expiry.getTime())return {active:true,inGrace:false,locked:false,daysLeft:null,expiresAt:expiry};
  const daysPast=Math.floor((Date.now()-expiry.getTime())/86400000);
  const grace=clampGraceDays();
  if(daysPast<=grace)return {active:true,inGrace:true,locked:false,daysLeft:grace-daysPast,expiresAt:expiry};
  return {active:false,inGrace:false,locked:true,daysLeft:0,expiresAt:expiry};
}
// The one gate every mutating action calls. If not locked, proceeds immediately with zero
// interruption. If locked, opens the on-demand activation prompt and holds onto proceedFn as the
// callback to run automatically the moment a valid farm name and code are entered -- so the
// action that was attempted actually completes right then, rather than just dismissing a notice.
function requireActivation(proceedFn){
  if(!licenseGraceInfo().locked){proceedFn();return}
  openActivationPrompt(proceedFn);
}
function truckCycleGapsMinutes(truckId){const loads=state.loads.filter(l=>l.truckId===truckId).slice().sort((a,b)=>new Date(a.time)-new Date(b.time));const gaps=[];for(let i=1;i<loads.length;i++){const mins=(new Date(loads[i].time).getTime()-new Date(loads[i-1].time).getTime())/60000;if(Number.isFinite(mins)&&mins>0)gaps.push(mins)}return gaps}
// "Last cycle" always shows the real, unfiltered gap since the previous load -- if that gap was
// an overnight stop, that's genuinely true and worth knowing. The average is different: a long
// break isn't a cycle at all, so gaps over the configured threshold are dropped before picking
// the most recent few to average, rather than letting one lunch break drag the number way up.
function truckCycleStats(truckId){
  const gaps=truckCycleGapsMinutes(truckId);
  if(!gaps.length)return {lastMinutes:null,avgMinutes:null,sampleGaps:0};
  const lastMinutes=gaps[gaps.length-1];
  const breakLimit=clampCycleBreakMinutes(state.cycleTimeBreakMinutes);
  const usable=breakLimit>0?gaps.filter(m=>m<=breakLimit):gaps;
  const recent=usable.slice(-4);
  if(!recent.length)return {lastMinutes,avgMinutes:null,sampleGaps:0};
  const avgMinutes=recent.reduce((s,m)=>s+m,0)/recent.length;
  return {lastMinutes,avgMinutes,sampleGaps:recent.length};
}
// "Last five loads" means the four gaps between them. Fewer than five loads still
// gives an average over however many gaps exist; fewer than two loads gives none.
function fmtDuration(mins){if(mins===null||mins===undefined||!Number.isFinite(mins))return '—';const m=Math.round(mins);if(m<60)return m+'m';const h=Math.floor(m/60),r=m%60;return h+'h'+(r?' '+r+'m':'')}
// Same idea as truckCycleStats but for an arbitrary list of load times (e.g. every load logged
// against one field or truck in a report), averaged across every remaining gap in the list rather
// than just the last few -- a report is a historical view, not a live glance, so the full filtered
// range is what matters. Gaps over the configured break threshold are excluded, same reasoning as
// truckCycleStats: an overnight stop or a lunch break isn't a cycle, so it shouldn't skew the average.
function avgCycleMinutesFromTimes(times){
  if(!times||times.length<2)return null;
  const sorted=times.map(t=>new Date(t).getTime()).filter(Number.isFinite).sort((a,b)=>a-b);
  const gaps=[];for(let i=1;i<sorted.length;i++){const mins=(sorted[i]-sorted[i-1])/60000;if(Number.isFinite(mins)&&mins>0)gaps.push(mins)}
  if(!gaps.length)return null;
  const breakLimit=clampCycleBreakMinutes(state.cycleTimeBreakMinutes);
  const usable=breakLimit>0?gaps.filter(m=>m<=breakLimit):gaps;
  if(!usable.length)return null;
  return usable.reduce((s,m)=>s+m,0)/usable.length;
}
// Wet weight harvested per hour, over active working time -- not the raw span from first load to
// last. A gap longer than the same break threshold used for cycle time (an overnight stop, a
// lunch break) is skipped entirely rather than counted as elapsed time, so a big gap dilutes the
// rate the same way it would inflate a cycle time average: it shouldn't, and now it doesn't.
// When no gap exceeds the threshold this reduces to the plain first-to-last span, unchanged.
// A harvest day runs from dawn to dawn, not midnight to midnight, so a load logged at 1am
// still counts as part of the day the harvest started, rather than splitting one continuous
// night's work across two "days." Dawn is fixed at 5:00 AM local time.
const HARVEST_DAY_CUTOFF_HOUR=5;
function harvestDayStart(refDate){
  const d=new Date(refDate);
  const start=new Date(d.getFullYear(),d.getMonth(),d.getDate(),HARVEST_DAY_CUTOFF_HOUR,0,0,0);
  if(d.getTime()<start.getTime())start.setDate(start.getDate()-1);
  return start;
}
function harvestDayEnd(start){const end=new Date(start);end.setDate(end.getDate()+1);return end}
function harvestRatePerHour(times,totalWet){
  if(!times||times.length<2)return null;
  const ms=times.map(t=>new Date(t).getTime()).filter(Number.isFinite).sort((a,b)=>a-b);
  if(ms.length<2)return null;
  const breakLimitMin=clampCycleBreakMinutes(state.cycleTimeBreakMinutes);
  const breakLimitMs=breakLimitMin>0?breakLimitMin*60000:Infinity;
  let activeMs=0;
  for(let i=1;i<ms.length;i++){const gap=ms[i]-ms[i-1];if(gap<=breakLimitMs)activeMs+=gap}
  const hours=activeMs/3600000;
  if(!(hours>0))return null;
  return Number(totalWet)/hours;
}
// Appearance themes: a small palette of accent-colour presets plus a fully custom
// option. Only the accent colours change (--green/--green2) -- light/dark mode is
// a separate, independent switch that still controls background/card/text.
const THEME_PRESETS=[
  {id:'farm',name:'Farm Green',accent:'#1f7a3f',accent2:'#14532d'},
  {id:'harvest',name:'Harvest Gold',accent:'#b45309',accent2:'#7c3609'},
  {id:'sky',name:'Sky Blue',accent:'#1d4ed8',accent2:'#1e3a8a'},
  {id:'rust',name:'Autumn Rust',accent:'#b3541e',accent2:'#7c3a12'},
  {id:'slate',name:'Slate',accent:'#475569',accent2:'#1e293b'},
  {id:'grape',name:'Grape',accent:'#7e22ce',accent2:'#581c87'}
];
function themePreset(id){return THEME_PRESETS.find(t=>t.id===id)}
const HEX_RE=/^#[0-9a-fA-F]{6}$/;
function sanitizeTheme(t){
  if(t&&t.id==='custom'&&HEX_RE.test(t.accent||'')&&HEX_RE.test(t.accent2||''))return {id:'custom',accent:t.accent,accent2:t.accent2};
  const preset=t&&t.id?themePreset(t.id):null;
  if(preset)return {id:preset.id,accent:preset.accent,accent2:preset.accent2};
  return {id:'farm',accent:'#1f7a3f',accent2:'#14532d'};
}
// Set directly on <body> (not <html>) so it wins over both the base :root rule and the
// body.dark override, regardless of which one is currently active.
function applyTheme(){const t=sanitizeTheme(state.theme);document.body.style.setProperty('--green',t.accent);document.body.style.setProperty('--green2',t.accent2)}
// Text size: the viewport is set to user-scalable=no (pinch-zoom deliberately disabled, so a
// stray touch on a truck button mid-tap can't zoom the whole page out), and every font-size in
// this file is a plain px value, so neither pinch-zoom nor an OS "larger text" setting can do
// anything here on their own. This is the actual control that takes their place. Every font-size
// declaration multiplies by this one CSS variable, so one slider (well, one pair of buttons)
// scales the whole app's text together rather than drifting out of proportion piece by piece.
function clampTextScale(v){const n=Number(v);const steps=[0.8,0.9,1,1.1,1.25,1.4,1.6];if(!Number.isFinite(n))return 1;return steps.reduce((closest,s)=>Math.abs(s-n)<Math.abs(closest-n)?s:closest,1)}
function applyTextScale(){document.body.style.setProperty('--text-scale',clampTextScale(state.textScale))}
// Driver Mode unlock: a slide-to-unlock track, not a user-set secret, so there is nothing to
// forget. Dragging the handle the full width of the track unlocks; releasing early snaps it
// back to the start. The point is to stop a phone bouncing in a pocket from opening a locked
// page with a stray tap -- a full deliberate end-to-end drag isn't something fabric reproduces.
let slideDragging=false,slideSuccessCb=null;
function slideUnlockPercent(evt,track){
  const rect=track.getBoundingClientRect(),handleW=44;
  const x=Math.min(Math.max(evt.clientX-rect.left-handleW/2,0),rect.width-handleW);
  return x/(rect.width-handleW);
}
function slideSetHandle(pct){
  const handle=document.getElementById('slideUnlockHandle'),fill=document.getElementById('slideUnlockFill'),track=document.getElementById('slideUnlockTrack');
  if(!handle||!track)return;
  const trackW=track.clientWidth,handleW=44;
  handle.style.left=(pct*(trackW-handleW))+'px';
  if(fill)fill.style.width=(pct*(trackW-handleW)+handleW)+'px';
}
function slideStart(evt){evt.preventDefault();slideDragging=true;slideMove(evt)}
function slideMove(evt){
  if(!slideDragging)return;evt.preventDefault();
  const track=document.getElementById('slideUnlockTrack');if(!track)return;
  const pct=slideUnlockPercent(evt,track);
  slideSetHandle(pct);
  if(pct>=0.92){
    slideDragging=false;
    try{navigator.vibrate&&navigator.vibrate(40)}catch(e){}
    const cb=slideSuccessCb;closeSlideUnlockModal();if(cb)cb();
  }
}
function slideEnd(){if(!slideDragging)return;slideDragging=false;slideSetHandle(0)}
function openSlideUnlockModal(onSuccess){slideSuccessCb=onSuccess;slideDragging=false;document.getElementById('slideUnlockModal')?.classList.add('show');setTimeout(()=>slideSetHandle(0),0)}
function closeSlideUnlockModal(){document.getElementById('slideUnlockModal')?.classList.remove('show');slideDragging=false;slideSuccessCb=null}

