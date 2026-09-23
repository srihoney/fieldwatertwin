export async function onRequestGet({request}){
  const u=new URL(request.url),q=(u.searchParams.get('q')||'').trim(); if(q.length<2)return json({results:[]});
  const url='https://nominatim.openstreetmap.org/search?'+new URLSearchParams({q,format:'jsonv2',limit:'6',countrycodes:'us',addressdetails:'1'});
  try{
    const r=await fetch(url,{headers:{'User-Agent':'FieldWaterTwin-V1 research prototype','Accept-Language':'en-US,en;q=0.8'}}); if(!r.ok)throw new Error(`Geocoder ${r.status}`);
    const data=await r.json(); return json({results:data.map(x=>({label:x.display_name,lat:Number(x.lat),lon:Number(x.lon),type:x.type}))});
  }catch(e){return json({results:[],message:e.message})}
}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json;charset=UTF-8','cache-control':'public,max-age=86400','access-control-allow-origin':'*'}})}
