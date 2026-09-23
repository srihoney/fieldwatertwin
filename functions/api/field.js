const SERVICES = [
  {year:2025,url:'https://services3.arcgis.com/g6eV2CrSSwCZj8Mc/arcgis/rest/services/NASS_Crop_Sequence_Boundaries_2025/FeatureServer/0/query'},
  {year:2024,url:'https://services3.arcgis.com/g6eV2CrSSwCZj8Mc/arcgis/rest/services/NASS_Crop_Sequence_Boundaries_2024/FeatureServer/0/query'}
];

export async function onRequestGet({request}){
  const u=new URL(request.url); const lat=Number(u.searchParams.get('lat')), lon=Number(u.searchParams.get('lon'));
  if(!Number.isFinite(lat)||!Number.isFinite(lon)) return json({error:'lat and lon are required'},400);
  for(const svc of SERVICES){
    try{
      const p=new URLSearchParams({
        f:'geojson',where:'1=1',geometry:`${lon},${lat}`,geometryType:'esriGeometryPoint',inSR:'4326',
        spatialRel:'esriSpatialRelIntersects',
        outFields:'CSBID,CSBACRES,CDL2017,CDL2018,CDL2019,CDL2020,CDL2021,CDL2022,CDL2023,CDL2024,CDL2025,CNTY,CNTYFIPS,STATEFIPS',
        returnGeometry:'true',outSR:'4326',resultRecordCount:'1',geometryPrecision:'6',maxAllowableOffset:'0.00002'
      });
      const r=await fetch(`${svc.url}?${p.toString()}`,{headers:{'Accept':'application/geo+json,application/json'}});
      if(!r.ok) continue;
      const data=await r.json(); const feature=data.features?.[0]||null;
      if(feature) return json({feature,source:`USDA NASS Crop Sequence Boundaries through ${svc.year}`,status:'live',boundaryYear:svc.year});
    }catch{}
  }
  return json({feature:null,source:'USDA NASS Crop Sequence Boundaries',status:'no-match',message:'No public CSB feature service returned a field at this point.'},200);
}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json;charset=UTF-8','cache-control':'public,max-age=86400','access-control-allow-origin':'*'}})}
