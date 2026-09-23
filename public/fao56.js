(function(global){
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const round=(v,n=2)=>Number.isFinite(v)?Number(v.toFixed(n)):null;
  const dayMs=86400000;

  function parseDate(s){ const [y,m,d]=s.split('-').map(Number); return new Date(Date.UTC(y,m-1,d)); }
  function dateKey(d){ return d.toISOString().slice(0,10); }

  function cropCoefficientByDate(date, crop, ndviSeries){
    const d = parseDate(date);
    let year=d.getUTCFullYear();
    let start=new Date(Date.UTC(year,crop.plantMonth-1,crop.plantDay||1));
    if(d<start && crop.plantMonth>8) start=new Date(Date.UTC(year-1,crop.plantMonth-1,crop.plantDay||1));
    let age=Math.floor((d-start)/dayMs);
    const [Lini,Ldev,Lmid,Lend]=crop.stages;
    const total=Lini+Ldev+Lmid+Lend;
    if(!crop.annual){
      age=Math.max(0,Math.min(total-1,age));
      if(age>=total) age=total-1;
    }
    let [ini,mid,end]=crop.kc;
    let kc;
    if(age<0) kc=ini;
    else if(age<Lini) kc=ini;
    else if(age<Lini+Ldev) kc=ini+(mid-ini)*((age-Lini)/Math.max(1,Ldev));
    else if(age<Lini+Ldev+Lmid) kc=mid;
    else if(age<total) kc=mid+(end-mid)*((age-Lini-Ldev-Lmid)/Math.max(1,Lend));
    else kc=end;

    const recent = latestOnOrBefore(ndviSeries,date);
    if(recent && Number.isFinite(recent.value)){
      const ndvi=clamp(recent.value,-0.1,0.95);
      const cover=clamp((ndvi-0.16)/0.68,0,1);
      const satKc=ini+(mid-ini)*Math.pow(cover,0.72);
      const ageDays=Math.abs((parseDate(date)-parseDate(recent.date))/dayMs);
      const satelliteWeight=ageDays<=10?0.55:ageDays<=20?0.35:0.15;
      kc=kc*(1-satelliteWeight)+satKc*satelliteWeight;
    }
    return clamp(kc,0.12,1.45);
  }

  function latestOnOrBefore(series,date){
    if(!Array.isArray(series)||!series.length) return null;
    const target=parseDate(date).getTime(); let best=null,bestT=-Infinity;
    for(const p of series){ const t=parseDate(p.date).getTime(); if(t<=target && t>bestT && Number.isFinite(p.value)){best=p;bestT=t;} }
    return best;
  }

  function inferCurrentRootDepth(crop, ndvi){
    if(!crop.annual) return crop.zr;
    if(Number.isFinite(ndvi)){
      const cover=clamp((ndvi-0.12)/0.65,0,1);
      return clamp(0.2+(crop.zr-0.2)*Math.pow(cover,0.75),0.2,crop.zr);
    }
    return Math.max(0.3,crop.zr*0.75);
  }

  function totalAvailableWater(fc,wp,zr){ return Math.max(1,1000*(fc-wp)*zr); }
  function stressCoefficient(dr,taw,p){
    const raw=p*taw;
    if(dr<=raw) return 1;
    return clamp((taw-dr)/Math.max(1e-6,(1-p)*taw),0,1);
  }
  function effectiveRain(p){
    if(!Number.isFinite(p)||p<=0) return 0;
    if(p<=5) return p*0.95;
    if(p<=25) return p*0.85;
    return p*0.75;
  }

  function initialDepletion(fc,wp,zr,smap){
    const taw=totalAvailableWater(fc,wp,zr);
    if(Number.isFinite(smap)){
      const theta=clamp(smap,wp,fc);
      return clamp(1000*(fc-theta)*zr,0,taw);
    }
    return 0.45*taw;
  }

  function runForecast({weather,crop,fc,wp,zr,p,ndviSeries=[],smap,efficiency=0.9,startDr=null}){
    if(!weather?.length) return {rows:[],summary:null};
    const taw=totalAvailableWater(fc,wp,zr), raw=p*taw;
    let dr=Number.isFinite(startDr)?clamp(startDr,0,taw):initialDepletion(fc,wp,zr,smap);
    const rows=[];
    for(const w of weather){
      const kc=cropCoefficientByDate(w.date,crop,ndviSeries);
      const ks=stressCoefficient(dr,taw,p);
      const eto=Math.max(0,Number(w.eto)||0);
      const etc=kc*eto*ks;
      const peff=effectiveRain(Number(w.precip)||0);
      const nextDr=clamp(dr+etc-peff,0,taw);
      rows.push({date:w.date,eto,precip:Number(w.precip)||0,peff,kc,ks,etc,drStart:dr,drEnd:nextDr,taw,raw});
      dr=nextDr;
    }
    const firstCross=rows.findIndex(r=>r.drEnd>=raw);
    const current=rows[0]?.drStart ?? dr;
    const target=Math.max(0.12*taw,0.10*raw);
    let net=0;
    if(current>=raw) net=Math.max(0,current-target);
    else if(firstCross>=0 && firstCross<=2) net=Math.max(0,(rows[firstCross].drEnd-target));
    const gross=net/Math.max(0.4,Math.min(1,efficiency));
    const et3=rows.slice(0,3).reduce((a,b)=>a+b.etc,0);
    const rain3=rows.slice(0,3).reduce((a,b)=>a+b.precip,0);
    return {rows,summary:{taw,raw,currentDr:current,firstCrossDays:firstCross,grossIrrigation:gross,netIrrigation:net,et3,rain3,targetDr:target}};
  }

  global.FAO56V1={clamp,round,latestOnOrBefore,cropCoefficientByDate,inferCurrentRootDepth,totalAvailableWater,stressCoefficient,initialDepletion,runForecast};
})(window);
