const WPS='https://cloud.csiss.gmu.edu/smap_service';
export async function onRequestGet({request}){
  const u=new URL(request.url); const x=Number(u.searchParams.get('x')),y=Number(u.searchParams.get('y'));
  const start=u.searchParams.get('start'),end=u.searchParams.get('end');
  if(!Number.isFinite(x)||!Number.isFinite(y)||!start||!end) return json({error:'x,y,start,end are required'},400);
  const s=start.replaceAll('-','.'),e=end.replaceAll('-','.');
  const [ndvi,smap]=await Promise.all([
    profile('NDVI-DAILY',x,y,s,e),
    profile('SMAP-9KM-DAILY-SUB',x,y,s,e)
  ]);
  return json({ndvi,smap,source:'USDA NASS Crop-CASMA (NASA MODIS NDVI + SMAP root-zone soil moisture)'});
}
async function profile(productId,x,y,start,end){
  const qs=new URLSearchParams({service:'WPS',version:'1.0.0',request:'Execute',identifier:'GetProfileByDate',DataInputs:`productId=${productId};x=${x};y=${y};startDate=${start};endDate=${end}`});
  try{
    let r=await fetch(`${WPS}?${qs.toString()}`,{headers:{accept:'application/xml,text/xml,*/*'}}); if(!r.ok)throw new Error(`WPS ${r.status}`);
    let text=await r.text();
    const status=(text.match(/statusLocation="([^"]+)"/i)||[])[1];
    if(status && !findCsv(text)){ const sr=await fetch(decode(status)); if(sr.ok) text=await sr.text(); }
    const csvUrl=findCsv(text);
    if(!csvUrl) return {status:'unavailable',productId,message:'No CSV output URL returned by Crop-CASMA.'};
    const cr=await fetch(csvUrl); if(!cr.ok)throw new Error(`CSV ${cr.status}`); const csv=await cr.text();
    const series=parseCsv(csv,productId);
    return {status:series.length?'live':'unavailable',productId,series,csvUrl:series.length?csvUrl:undefined};
  }catch(e){return {status:'unavailable',productId,message:e.message,series:[]}}
}
function findCsv(text){
  const clean=decode(text).replace(/&amp;/g,'&');
  const m=clean.match(/https?:\/\/[^\s"'<>]+\.csv(?:\?[^\s"'<>]*)?/i); return m?m[0]:null;
}
function parseCsv(text,productId){
  const lines=text.trim().split(/\r?\n/).filter(Boolean); if(lines.length<2)return [];
  const header=parseLine(lines[0]);
  let dateIdx=header.findIndex(h=>/date|time/i.test(h)); if(dateIdx<0)dateIdx=0;
  let valueIdx=header.findIndex(h=>/average|mean|value|pixel/i.test(h) && !/date|time/i.test(h));
  const out=[];
  for(const line of lines.slice(1)){
    const row=parseLine(line); let date=normalizeDate(row[dateIdx]);
    if(!date)continue;
    let value=null;
    if(valueIdx>=0) value=Number(row[valueIdx]);
    if(!Number.isFinite(value)){
      for(let i=0;i<row.length;i++){if(i===dateIdx)continue;const n=Number(row[i]);if(Number.isFinite(n)){value=n;break;}}
    }
    if(!Number.isFinite(value))continue;
    if(productId.startsWith('NDVI')){
      if(value>1.2) value=(value-125)/125;
      value=Math.max(-1,Math.min(1,value));
    }
    out.push({date,value});
  }
  return out.sort((a,b)=>a.date.localeCompare(b.date));
}
function parseLine(line){const out=[];let cur='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(q&&line[i+1]==='"'){cur+='"';i++;}else q=!q;}else if(c===','&&!q){out.push(cur.trim());cur='';}else cur+=c;}out.push(cur.trim());return out}
function normalizeDate(v){if(!v)return null;const m=String(v).match(/(20\d{2})[.\/-](\d{1,2})[.\/-](\d{1,2})/);if(!m)return null;return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`}
function decode(s){try{return decodeURIComponent(s)}catch{return s}}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json;charset=UTF-8','cache-control':'public,max-age=21600','access-control-allow-origin':'*'}})}
