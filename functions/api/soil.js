const SDA='https://SDMDataAccess.sc.egov.usda.gov/Tabular/post.rest';
export async function onRequestGet({request}){
  const u=new URL(request.url); const lat=Number(u.searchParams.get('lat')), lon=Number(u.searchParams.get('lon'));
  if(!Number.isFinite(lat)||!Number.isFinite(lon)) return json({error:'lat and lon are required'},400);
  const d=0.00003;
  const wkt=`polygon((${lon-d} ${lat-d},${lon-d} ${lat+d},${lon+d} ${lat+d},${lon+d} ${lat-d},${lon-d} ${lat-d}))`;
  const sql=`SELECT TOP 80 mu.mukey,mu.muname,c.compname,c.comppct_r,ch.hzname,ch.hzdept_r,ch.hzdepb_r,ch.sandtotal_r,ch.silttotal_r,ch.claytotal_r,ch.wthirdbar_r,ch.wfifteenbar_r,ch.awc_r,ch.ksat_r,ch.dbthirdbar_r FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('${wkt}') mk INNER JOIN mapunit mu ON mu.mukey=mk.mukey INNER JOIN component c ON c.mukey=mu.mukey INNER JOIN chorizon ch ON ch.cokey=c.cokey WHERE c.majcompflag='Yes' AND ch.hzdept_r < 200 ORDER BY c.comppct_r DESC,ch.hzdept_r ASC`;
  try{
    const r=await fetch(SDA,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({query:sql,format:'JSON+COLUMNNAME'})});
    if(!r.ok) throw new Error(`SDA ${r.status}`);
    const data=await r.json(); const table=data.Table||data.table||[];
    if(table.length<2) return json(fallback('No mapped SSURGO soil returned for this point.'));
    const cols=table[0]; const rows=table.slice(1).map(a=>Object.fromEntries(cols.map((c,i)=>[c,a[i]])));
    const maxPct=Math.max(...rows.map(r=>num(r.comppct_r)||0));
    const dom=rows.filter(r=>(num(r.comppct_r)||0)===maxPct);
    const profile=summarize(dom);
    return json({...profile,status:'live',source:'USDA NRCS Soil Data Access / SSURGO',horizons:dom.map(cleanHorizon)});
  }catch(e){ return json(fallback(e.message)); }
}
function summarize(rows){
  let wt=0,fcSum=0,wpSum=0,sand=0,silt=0,clay=0,awc=0;
  for(const r of rows){ const top=num(r.hzdept_r)||0,bottom=Math.min(150,num(r.hzdepb_r)||top),th=Math.max(0,bottom-top); if(!th)continue;
    let fc=num(r.wthirdbar_r),wp=num(r.wfifteenbar_r); if(fc>1)fc/=100;if(wp>1)wp/=100;
    if(!Number.isFinite(fc)||!Number.isFinite(wp)){ const a=num(r.awc_r); if(Number.isFinite(a)){wp=0.10;fc=wp+a;} }
    if(Number.isFinite(fc)&&Number.isFinite(wp)&&fc>wp){fcSum+=fc*th;wpSum+=wp*th;wt+=th;}
    sand+=(num(r.sandtotal_r)||0)*th;silt+=(num(r.silttotal_r)||0)*th;clay+=(num(r.claytotal_r)||0)*th;awc+=(num(r.awc_r)||0)*th;
  }
  let fc=wt?fcSum/wt:0.27,wp=wt?wpSum/wt:0.12;
  fc=bound(fc,0.12,0.50);wp=bound(wp,0.03,Math.min(0.35,fc-0.03));
  const denom=rows.reduce((s,r)=>s+Math.max(0,Math.min(150,num(r.hzdepb_r)||0)-(num(r.hzdept_r)||0)),0)||1;
  return {mukey:rows[0]?.mukey||'',mapunit:rows[0]?.muname||'Mapped soil',component:rows[0]?.compname||'',fc,wp,awc:fc-wp,sand:sand/denom,silt:silt/denom,clay:clay/denom};
}
function cleanHorizon(r){return {name:r.hzname,top_cm:num(r.hzdept_r),bottom_cm:num(r.hzdepb_r),sand_pct:num(r.sandtotal_r),silt_pct:num(r.silttotal_r),clay_pct:num(r.claytotal_r),field_capacity:scale(r.wthirdbar_r),wilting_point:scale(r.wfifteenbar_r),awc:num(r.awc_r)}}
function scale(v){v=num(v);return Number.isFinite(v)&&v>1?v/100:v}
function fallback(message){return {status:'fallback',source:'Generic loam fallback',message,mapunit:'Generic loam',component:'Fallback',fc:0.27,wp:0.12,awc:0.15,sand:40,silt:40,clay:20,horizons:[]}}
function num(v){const n=Number(v);return Number.isFinite(n)?n:null}function bound(v,a,b){return Math.min(b,Math.max(a,v))}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json;charset=UTF-8','cache-control':'public,max-age=604800','access-control-allow-origin':'*'}})}
