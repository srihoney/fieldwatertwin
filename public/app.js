const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
const S={lat:null,lon:null,field:null,soil:null,satellite:null,weather:null,cropKey:'generic',crop:null,model:null,fieldLayer:null,marker:null,waterChart:null,etChart:null,sourceStatus:{}};
const CONUS=[39.2,-98.6];
const map=L.map('map',{zoomControl:true,preferCanvas:true}).setView(CONUS,5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);

proj4.defs('EPSG:5070','+proj=aea +lat_1=29.5 +lat_2=45.5 +lat_0=23 +lon_0=-96 +x_0=0 +y_0=0 +datum=NAD83 +units=m +no_defs');

initCropSelect(); wire(); restoreLocal();
map.on('click',e=>selectLocation(e.latlng.lat,e.latlng.lng));

function wire(){
  $('#searchBtn').onclick=searchPlace; $('#placeSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchPlace();}});
  $('#locateBtn').onclick=()=>navigator.geolocation?navigator.geolocation.getCurrentPosition(p=>selectLocation(p.coords.latitude,p.coords.longitude),()=>toast('Location permission was not available. Click the map instead.')):toast('Browser geolocation is not available.');
  $('#clearBtn').onclick=resetAll; $('#recalculateBtn').onclick=()=>{applyAssumptions();buildModel();};
  $('#cropSelect').onchange=()=>{S.cropKey=$('#cropSelect').value;S.crop=structuredClone(CROP_PRESETS[S.cropKey]);syncInputs();};
  $('#exportProjectBtn').onclick=exportProject; $('#importProjectInput').onchange=importProject; $('#downloadCsvBtn').onclick=downloadCsv;
}

function initCropSelect(){
  $('#cropSelect').innerHTML=Object.entries(CROP_PRESETS).map(([k,v])=>`<option value="${k}">${v.name}</option>`).join('');
}

async function searchPlace(){
  const q=$('#placeSearch').value.trim(); if(!q)return; const box=$('#searchResults'); box.classList.remove('hidden');box.innerHTML='<div class="search-result">Searching…</div>';
  try{const r=await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);const d=await r.json();if(!d.results?.length){box.innerHTML='<div class="search-result">No U.S. matches found.</div>';return}
    box.innerHTML=d.results.map((x,i)=>`<div class="search-result" data-i="${i}">${escapeHtml(x.label)}</div>`).join('');
    $$('.search-result[data-i]').forEach(el=>el.onclick=()=>{const x=d.results[Number(el.dataset.i)];box.classList.add('hidden');map.setView([x.lat,x.lon],15);selectLocation(x.lat,x.lon)});
  }catch{box.innerHTML='<div class="search-result">Search service unavailable. Click the map instead.</div>'}
}

async function selectLocation(lat,lon){
  S.lat=lat;S.lon=lon; $('#coordsBadge').textContent=`${lat.toFixed(5)}, ${lon.toFixed(5)}`; $('#mapHelp').classList.add('hidden');
  if(S.marker)map.removeLayer(S.marker);S.marker=L.marker([lat,lon]).addTo(map);
  $('#emptyState').classList.add('hidden');$('#dashboard').classList.add('hidden');$('#assumptionsPanel').classList.add('hidden');
  setAllWaiting();
  setStep('field','loading','Finding boundary…');setStep('soil','loading','Reading soil…');setStep('satellite','loading','Reading satellite…');setStep('weather','loading','Loading weather…');
  const end=todayMinus(2), start=daysBefore(end,75); let xy;
  try{xy=proj4('EPSG:4326','EPSG:5070',[lon,lat]);}catch{xy=[null,null]}
  const tasks=[loadField(lat,lon),loadSoil(lat,lon),loadSatellite(xy,start,end),loadWeather(lat,lon)];
  await Promise.all(tasks);
  chooseCrop(); syncInputs(); buildModel(); $('#assumptionsPanel').classList.remove('hidden'); saveLocal();
}

async function loadField(lat,lon){
  try{const r=await fetch(`/api/field?lat=${lat}&lon=${lon}`);const d=await r.json();S.field=d.feature;S.sourceStatus.field={status:d.status==='live'?'live':'fallback',source:d.source,note:d.feature?'Synthetic USDA field boundary and 2017–2024 crop-history attributes.':'No CSB polygon matched; using the clicked point only.'};
    if(S.field?.geometry){if(S.fieldLayer)map.removeLayer(S.fieldLayer);S.fieldLayer=L.geoJSON(S.field,{style:{color:'#16754f',weight:3,fillColor:'#3fa375',fillOpacity:.14}}).addTo(map);try{map.fitBounds(S.fieldLayer.getBounds(),{padding:[30,30],maxZoom:17})}catch{}}
    setStep('field',S.field?'done':'warn',S.field?'Boundary found':'Point mode');
  }catch(e){S.field=null;S.sourceStatus.field={status:'fallback',source:'Point selection',note:'USDA field-boundary service unavailable.'};setStep('field','warn','Point mode')}
}

async function loadSoil(lat,lon){
  try{const r=await fetch(`/api/soil?lat=${lat}&lon=${lon}`);S.soil=await r.json();S.sourceStatus.soil={status:S.soil.status,source:S.soil.source,note:S.soil.status==='live'?`Dominant mapped component: ${S.soil.component||S.soil.mapunit}.`:'Generic loam values used because mapped soil data were unavailable.'};setStep('soil',S.soil.status==='live'?'done':'warn',S.soil.status==='live'?'SSURGO ready':'Fallback soil')}
  catch{S.soil={status:'fallback',source:'Generic loam fallback',mapunit:'Generic loam',fc:.27,wp:.12};S.sourceStatus.soil={status:'fallback',source:'Generic loam fallback',note:'Soil service unavailable.'};setStep('soil','warn','Fallback soil')}
}

async function loadSatellite(xy,start,end){
  if(!Number.isFinite(xy?.[0])){S.satellite={ndvi:{status:'unavailable',series:[]},smap:{status:'unavailable',series:[]}};setStep('satellite','warn','Unavailable');return}
  try{const r=await fetch(`/api/casma?x=${xy[0]}&y=${xy[1]}&start=${start}&end=${end}`);S.satellite=await r.json();const live=S.satellite.ndvi?.status==='live'||S.satellite.smap?.status==='live';S.sourceStatus.satellite={status:live?'live':'fallback',source:S.satellite.source||'USDA NASS Crop-CASMA',note:live?'Recent MODIS NDVI and/or NASA SMAP root-zone soil moisture used when available.':'Satellite service did not return a recent series; crop curve and conservative depletion fallback are used.'};setStep('satellite',live?'done':'warn',live?'Satellite ready':'Fallback')}
  catch{S.satellite={ndvi:{status:'unavailable',series:[]},smap:{status:'unavailable',series:[]}};S.sourceStatus.satellite={status:'fallback',source:'No live satellite anchor',note:'Satellite service unavailable.'};setStep('satellite','warn','Fallback')}
}

async function loadWeather(lat,lon){
  const endHist=todayMinus(1),startHist=daysBefore(endHist,14);
  const daily='temperature_2m_max,temperature_2m_min,precipitation_sum,et0_fao_evapotranspiration';
  const hist=`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startHist}&end_date=${endHist}&daily=${daily}&timezone=auto`;
  const fcst=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=${daily}&timezone=auto&forecast_days=14`;
  try{const [h,f]=await Promise.all([fetch(hist).then(r=>r.json()),fetch(fcst).then(r=>r.json())]);S.weather={history:dailyRows(h),forecast:dailyRows(f),timezone:f.timezone};S.sourceStatus.weather={status:'live',source:'Open-Meteo',note:'Historical/reanalysis weather and 14-day forecast; ETo is FAO-56 Penman–Monteith from the weather provider.'};setStep('weather','done','Forecast ready')}
  catch{S.weather={history:[],forecast:syntheticWeather()};S.sourceStatus.weather={status:'fallback',source:'Synthetic safe fallback',note:'Live weather failed. Placeholder weather is shown only to keep the interface testable; do not use it operationally.'};setStep('weather','warn','Fallback')}
}

function dailyRows(d){const x=d?.daily;if(!x?.time)return[];return x.time.map((date,i)=>({date,eto:Number(x.et0_fao_evapotranspiration?.[i])||0,precip:Number(x.precipitation_sum?.[i])||0,tmax:Number(x.temperature_2m_max?.[i]),tmin:Number(x.temperature_2m_min?.[i])}))}

function chooseCrop(){
  const p=S.field?.properties||{};const years=Object.keys(p).filter(k=>/^CDL20\d\d$/.test(k)).sort();let code=null,year=null;
  for(let i=years.length-1;i>=0;i--){const c=Number(p[years[i]]);if(Number.isFinite(c)&&c>0&&c!==61&&c!==81){code=c;year=years[i].slice(3);break}}
  S.cropEvidence={code,year,name:code?CDL_NAMES[code]||`CDL class ${code}`:'Unknown'};
  S.cropKey=CDL_TO_PRESET[code]||'generic';S.crop=structuredClone(CROP_PRESETS[S.cropKey]);$('#cropSelect').value=S.cropKey;
  S.sourceStatus.crop={status:S.cropKey==='generic'?'fallback':'live',source:'USDA NASS Crop Sequence Boundary crop history',note:code?`${S.cropEvidence.name} was the latest mapped crop in ${year}. Current-year annual crop should be confirmed by the user.`:'No crop-history class was available; generic crop defaults are used.'};
}

function syncInputs(){
  const ndvi=latestValue(S.satellite?.ndvi?.series);const zr=FAO56V1.inferCurrentRootDepth(S.crop,ndvi);
  $('#rootDepthInput').value=zr.toFixed(2);$('#pInput').value=S.crop.p.toFixed(2);$('#fcInput').value=(S.soil?.fc??.27).toFixed(3);$('#wpInput').value=(S.soil?.wp??.12).toFixed(3);$('#cropSelect').value=S.cropKey;
}
function applyAssumptions(){
  S.cropKey=$('#cropSelect').value;S.crop=structuredClone(CROP_PRESETS[S.cropKey]);
  S.crop.zr=Number($('#rootDepthInput').value)||S.crop.zr;S.crop.p=Number($('#pInput').value)||S.crop.p;
  S.soil.fc=Number($('#fcInput').value)||S.soil.fc;S.soil.wp=Number($('#wpInput').value)||S.soil.wp;
}

function buildModel(){
  setStep('model','loading','Calculating…');const ndviSeries=S.satellite?.ndvi?.series||[];const smapSeries=S.satellite?.smap?.series||[];const ndvi=latestValue(ndviSeries);const smap=latestValue(smapSeries);
  const zr=Number($('#rootDepthInput').value)||FAO56V1.inferCurrentRootDepth(S.crop,ndvi);const p=Number($('#pInput').value)||S.crop.p;const fc=Number($('#fcInput').value)||S.soil.fc;const wp=Number($('#wpInput').value)||S.soil.wp;const eff=Number($('#efficiencyInput').value)||.9;
  const result=FAO56V1.runForecast({weather:S.weather?.forecast||[],crop:S.crop,fc,wp,zr,p,ndviSeries,smap,efficiency:eff});
  S.model={...result,inputs:{zr,p,fc,wp,eff,ndvi,smap}};S.sourceStatus.model={status:'live',source:'Browser-side FAO-56-style root-zone balance',note:'Single crop-coefficient root-zone balance with FAO-56 depletion stress logic; satellite NDVI dynamically nudges Kc and SMAP anchors initial root-zone water status when available.'};
  setStep('model','done','Decision ready');render();saveLocal();
}

function render(){
  if(!S.model?.summary)return;$('#dashboard').classList.remove('hidden');const s=S.model.summary,i=S.model.inputs,p=S.field?.properties||{};const conf=confidenceScore();
  const due=s.currentDr>=s.raw; const near=!due && s.firstCrossDays>=0&&s.firstCrossDays<=2; const noCross=s.firstCrossDays<0;
  $('#decisionTitle').textContent=due?'Irrigation is indicated now':near?`Irrigation is likely within ${s.firstCrossDays+1} day${s.firstCrossDays? 's':''}`:noCross?'No threshold crossing in the 14-day forecast':`Threshold crossing in about ${s.firstCrossDays+1} days`;
  $('#decisionSubtitle').textContent=due?'Estimated root-zone depletion is at or above the readily available water threshold.':near?'Forecast atmospheric demand is expected to push depletion across the management threshold soon.':'Continue monitoring; the estimate remains below the selected management threshold.';
  $('#grossIrrigation').textContent=s.grossIrrigation>0?s.grossIrrigation.toFixed(1):'0.0';$('#currentDepletion').textContent=s.currentDr.toFixed(1);$('#rawThreshold').textContent=s.raw.toFixed(1);$('#threeDayEt').textContent=s.et3.toFixed(1);
  $('#confidenceValue').textContent=`${conf}%`;$('#confidenceRing').style.background=`conic-gradient(#91e0bb 0deg,#91e0bb ${conf*3.6}deg,rgba(255,255,255,.16) ${conf*3.6}deg)`;
  $('#decisionExplain').textContent=`Estimated TAW is ${s.taw.toFixed(0)} mm at a ${i.zr.toFixed(2)} m root depth. The current depletion estimate is ${s.currentDr.toFixed(1)} mm; the RAW threshold is ${s.raw.toFixed(1)} mm. Forecast crop ET over the next 3 days is ${s.et3.toFixed(1)} mm and forecast precipitation totals ${s.rain3.toFixed(1)} mm.`;
  $('#fieldName').textContent=p.CNTY?`${p.CNTY} field estimate`:'Selected point/field';$('#fieldArea').textContent=p.CSBACRES?`${Number(p.CSBACRES).toFixed(1)} acres`:'Not available';$('#cropEvidence').textContent=S.cropEvidence?.code?`${S.cropEvidence.name} (${S.cropEvidence.year})`:'Not available';$('#modelCrop').textContent=S.crop.name;
  $('#soilName').textContent=S.soil?.mapunit||'Soil estimate';$('#soilFc').textContent=i.fc.toFixed(3);$('#soilWp').textContent=i.wp.toFixed(3);$('#soilTaw').textContent=`${s.taw.toFixed(0)} mm`;
  $('#satelliteStatus').textContent=S.sourceStatus.satellite?.status==='live'?'Recent remote observations':'Satellite fallback mode';$('#ndviValue').textContent=Number.isFinite(i.ndvi)?i.ndvi.toFixed(2):'Unavailable';$('#smapValue').textContent=Number.isFinite(i.smap)?`${i.smap.toFixed(3)} m³/m³`:'Unavailable';$('#dynamicKc').textContent=S.model.rows[0]?.kc?.toFixed(2)||'--';
  renderCharts();renderEvidence(conf);renderProvenance();
}

function confidenceScore(){let score=20;score+=S.field?12:4;score+=S.soil?.status==='live'?18:7;score+=S.weather?.forecast?.length>=7?20:5;score+=S.satellite?.ndvi?.status==='live'?13:3;score+=S.satellite?.smap?.status==='live'?13:3;score+=S.cropKey!=='generic'?10:3;return Math.min(96,Math.round(score))}
function renderEvidence(conf){
  const s=S.model.summary,i=S.model.inputs;const items=[
    ['Soil-water capacity',S.soil?.status==='live'?'Mapped':'Fallback',`TAW ${s.taw.toFixed(0)} mm from FC ${i.fc.toFixed(3)}, WP ${i.wp.toFixed(3)}, and ${i.zr.toFixed(2)} m root depth.`],
    ['Plant / canopy',Number.isFinite(i.ndvi)?'Observed':'Estimated',Number.isFinite(i.ndvi)?`Recent MODIS NDVI ${i.ndvi.toFixed(2)} nudges the crop coefficient toward observed canopy development.`:'No recent NDVI was returned, so the standard crop curve drives Kc.'],
    ['Current root-zone water',Number.isFinite(i.smap)?'Satellite anchor':'Conservative fallback',Number.isFinite(i.smap)?`SMAP root-zone moisture ${i.smap.toFixed(3)} m³/m³ anchors starting depletion.`:'Starting depletion is initialized conservatively because SMAP was unavailable.'],
    ['Atmospheric demand','Forecast',`Three-day modeled crop ET ${s.et3.toFixed(1)} mm; forecast rain ${s.rain3.toFixed(1)} mm.`],
    ['Overall evidence',`${conf}%`,conf>=80?'Multiple live public datasets agree strongly enough for a high-confidence first estimate.':conf>=60?'Useful first estimate, but confirming crop/soil/current wetness would materially improve it.':'Use as screening only; important data sources are missing or on fallback.']
  ];
  $('#evidenceList').innerHTML=items.map(x=>`<div class="evidence-item"><b>${x[0]}<span class="evidence-score">${x[1]}</span></b><p>${x[2]}</p></div>`).join('');
}
function renderProvenance(){
  const rows=[['Field boundary',S.sourceStatus.field],['Crop history',S.sourceStatus.crop],['Soil',S.sourceStatus.soil],['Plant + satellite',S.sourceStatus.satellite],['Weather',S.sourceStatus.weather],['Water-balance model',S.sourceStatus.model]];
  $('#provenanceTable').innerHTML=['Dataset','Source','Status','How it is used'].map(x=>`<div class="prov-cell prov-head">${x}</div>`).join('')+rows.map(([name,o])=>`<div class="prov-cell"><b>${name}</b></div><div class="prov-cell">${escapeHtml(o?.source||'--')}</div><div class="prov-cell prov-status ${o?.status==='live'?'status-live':o?.status==='fallback'?'status-fallback':'status-missing'}">${o?.status||'--'}</div><div class="prov-cell">${escapeHtml(o?.note||'')}</div>`).join('');
}
function renderCharts(){
  const rows=S.model.rows,labels=rows.map(r=>r.date.slice(5));const css=getComputedStyle(document.documentElement);const green=css.getPropertyValue('--green').trim(),amber=css.getPropertyValue('--amber').trim(),blue=css.getPropertyValue('--blue').trim();
  S.waterChart?.destroy();S.waterChart=new Chart($('#waterChart'),{type:'line',data:{labels,datasets:[{label:'Depletion (mm)',data:rows.map(r=>r.drEnd),borderColor:green,backgroundColor:'rgba(23,107,74,.10)',fill:true,tension:.28,pointRadius:2},{label:'RAW (mm)',data:rows.map(r=>r.raw),borderColor:amber,borderDash:[7,5],pointRadius:0,tension:0}]},options:chartOptions('mm')});
  S.etChart?.destroy();S.etChart=new Chart($('#etChart'),{type:'bar',data:{labels,datasets:[{label:'ETo',data:rows.map(r=>r.eto),backgroundColor:'rgba(50,118,168,.32)',borderColor:blue,borderWidth:1},{label:'Crop ET',data:rows.map(r=>r.etc),backgroundColor:'rgba(23,107,74,.45)',borderColor:green,borderWidth:1}]},options:chartOptions('mm/day')});
}
function chartOptions(unit){return{responsive:true,maintainAspectRatio:true,plugins:{legend:{labels:{boxWidth:11,font:{size:10}}},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${Number(c.raw).toFixed(1)} ${unit}`}}},scales:{x:{ticks:{font:{size:9}},grid:{display:false}},y:{beginAtZero:true,ticks:{font:{size:9}},grid:{color:'#edf2ef'}}}}}

function setStep(name,state,text){const el=$(`.step[data-step="${name}"]`);if(!el)return;el.classList.remove('loading','done','warn');if(state)el.classList.add(state);el.querySelector('.step-state').textContent=text}
function setAllWaiting(){$$('.step').forEach(el=>{el.classList.remove('loading','done','warn');el.querySelector('.step-state').textContent='Waiting'})}
function latestValue(series){const x=Array.isArray(series)?[...series].filter(p=>Number.isFinite(p.value)).sort((a,b)=>a.date.localeCompare(b.date)).at(-1):null;return x?.value}
function todayMinus(n){const d=new Date();d.setUTCDate(d.getUTCDate()-n);return d.toISOString().slice(0,10)}function daysBefore(s,n){const d=new Date(`${s}T00:00:00Z`);d.setUTCDate(d.getUTCDate()-n);return d.toISOString().slice(0,10)}
function syntheticWeather(){const a=[];for(let i=0;i<14;i++){const d=new Date();d.setUTCDate(d.getUTCDate()+i);a.push({date:d.toISOString().slice(0,10),eto:5,precip:0,tmax:30,tmin:15})}return a}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.remove('hidden');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.add('hidden'),3600)}
function escapeHtml(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]))}

function exportProject(){
  if(!S.model){toast('Select a field first.');return}const data={version:'1.0',savedAt:new Date().toISOString(),lat:S.lat,lon:S.lon,field:S.field,soil:S.soil,satellite:S.satellite,weather:S.weather,cropKey:S.cropKey,crop:S.crop,model:S.model,cropEvidence:S.cropEvidence,sourceStatus:S.sourceStatus};downloadBlob(JSON.stringify(data,null,2),'field-water-twin-project.json','application/json')
}
async function importProject(e){const f=e.target.files?.[0];if(!f)return;try{const d=JSON.parse(await f.text());Object.assign(S,d);if(S.lat&&S.lon){map.setView([S.lat,S.lon],15);if(S.marker)map.removeLayer(S.marker);S.marker=L.marker([S.lat,S.lon]).addTo(map);if(S.field?.geometry){if(S.fieldLayer)map.removeLayer(S.fieldLayer);S.fieldLayer=L.geoJSON(S.field,{style:{color:'#16754f',weight:3,fillColor:'#3fa375',fillOpacity:.14}}).addTo(map);map.fitBounds(S.fieldLayer.getBounds(),{maxZoom:17})}syncInputs();render();$('#emptyState').classList.add('hidden');$('#dashboard').classList.remove('hidden');$('#assumptionsPanel').classList.remove('hidden');toast('Project imported.')}}catch{toast('That JSON file could not be read as a Field Water Twin project.')}e.target.value=''}
function downloadCsv(){if(!S.model?.rows?.length)return;const h=['date','eto_mm','precip_mm','effective_rain_mm','kc','ks','etc_mm','depletion_start_mm','depletion_end_mm','taw_mm','raw_mm'];const rows=S.model.rows.map(r=>[r.date,r.eto,r.precip,r.peff,r.kc,r.ks,r.etc,r.drStart,r.drEnd,r.taw,r.raw].map(x=>typeof x==='number'?x.toFixed(4):x).join(','));downloadBlob([h.join(','),...rows].join('\n'),'field-water-twin-forecast.csv','text/csv')}
function downloadBlob(text,name,type){const b=new Blob([text],{type}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
function saveLocal(){if(!S.lat)return;try{localStorage.setItem('fwt-v1-last',JSON.stringify({lat:S.lat,lon:S.lon,cropKey:S.cropKey}))}catch{}}
function restoreLocal(){try{const d=JSON.parse(localStorage.getItem('fwt-v1-last')||'null');if(d?.lat&&d?.lon){map.setView([d.lat,d.lon],11);}}catch{}}
function resetAll(){location.reload()}
