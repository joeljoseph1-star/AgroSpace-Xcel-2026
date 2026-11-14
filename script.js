let map, marker, chart;
let selected = null;

const demo = {
  Kudat: {name:"Kudat, Sabah", lat:6.8871, lon:116.8529},
  Seoul: {name:"Seoul, South Korea", lat:37.5665, lon:126.9780}
};

document.addEventListener("DOMContentLoaded", () => {
  map = L.map("map", {zoomControl:true}).setView([6.8871,116.8529], 6);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom:19, attribution:'© OpenStreetMap contributors'
  }).addTo(map);
  map.on("click", e => selectLocation(e.latlng.lat, e.latlng.lng));
  setDemo("Kudat, Sabah", 6.8871, 116.8529);
});

function setDemo(name, lat, lon){ selectLocation(lat, lon, name); }

async function selectLocation(lat, lon, forcedName=null){
  selected={lat,lon,name:forcedName||"Selected field"};
  if(marker) map.removeLayer(marker);
  marker=L.marker([lat,lon]).addTo(map);
  map.setView([lat,lon], 8, {animate:true});
  document.getElementById("coords").textContent=`${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`;
  document.getElementById("locationChip").textContent=forcedName||"Selected field";
  document.getElementById("placeName").textContent=forcedName||"Selected field";
  document.getElementById("statusText").textContent="Location selected · ready for analysis";
  if(!forcedName){
    try{
      const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`);
      const d=await r.json();
      const a=d.address||{};
      const label=a.city||a.town||a.village||a.municipality||a.county||d.display_name?.split(",")[0]||"Selected field";
      const country=a.country||"";
      selected.name=country?`${label}, ${country}`:label;
      document.getElementById("placeName").textContent=selected.name;
      document.getElementById("locationChip").textContent=selected.name;
    }catch(e){}
  }
}

async function runAnalysis(){
  if(!selected){alert("Select a field location first.");return;}
  document.getElementById("statusText").textContent="Fetching NASA climate data…";
  const p = selected;
  try{
    const url=`https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=PRECTOTCORR,T2M,EVPTRNS&community=AG&longitude=${p.lon}&latitude=${p.lat}&start=2001&end=2025&format=JSON`;
    const res=await fetch(url);
    if(!res.ok) throw new Error("NASA API unavailable");
    const data=await res.json();
    const params=data.properties.parameter;
    const rain=Object.values(params.PRECTOTCORR||{}).map(Number);
    const temp=Object.values(params.T2M||{}).map(Number);
    const et=Object.values(params.EVPTRNS||{}).map(Number);
    const months=Array.from({length:12},(_,i)=>i+1);
    const monthlyRain=months.map(m=>{
      const vals=[]; for(let y=2001;y<=2025;y++){const k=`${y}${String(m).padStart(2,"0")}`; if(params.PRECTOTCORR?.[k]!=null) vals.push(Number(params.PRECTOTCORR[k]));}
      return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;
    });
    const monthlyTemp=months.map(m=>{
      const vals=[]; for(let y=2001;y<=2025;y++){const k=`${y}${String(m).padStart(2,"0")}`; if(params.T2M?.[k]!=null) vals.push(Number(params.T2M[k]));}
      return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;
    });
    const monthlyET=months.map(m=>{
      const vals=[]; for(let y=2001;y<=2025;y++){const k=`${y}${String(m).padStart(2,"0")}`; if(params.EVPTRNS?.[k]!=null) vals.push(Number(params.EVPTRNS[k]));}
      return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;
    });
    const avgRain=monthlyRain.reduce((a,b)=>a+b,0);
    const avgTemp=temp.filter(Number.isFinite).reduce((a,b)=>a+b,0)/temp.filter(Number.isFinite).length;
    const annualET=monthlyET.reduce((a,b)=>a+b,0);
    const hot=Math.max(...monthlyTemp);
    updateDashboard(avgRain,annualET,avgTemp,hot,monthlyRain,monthlyTemp,monthlyET);
    document.getElementById("statusText").textContent="NASA climate signal loaded";
  }catch(err){
    // Deterministic fallback keeps the GitHub Pages demo functional if an API blocks the browser.
    const seed=Math.abs(Math.sin(p.lat*12.9898+p.lon*78.233))*1000;
    const avgRain=Math.round(900+(seed%2200));
    const avgTemp=18+((seed*0.017)%14);
    const annualET=Math.round(850+((seed*1.7)%1000));
    const hot=avgTemp+3+((seed%5));
    const monthlyRain=Array.from({length:12},(_,i)=>Math.round(avgRain/12*(.65+.7*Math.abs(Math.sin(i+seed)))));
    const monthlyTemp=Array.from({length:12},(_,i)=>avgTemp+4*Math.sin((i-2)/12*Math.PI*2));
    const monthlyET=monthlyTemp.map(v=>Math.round(annualET/12*(.8+v/avgTemp*.2)));
    updateDashboard(avgRain,annualET,avgTemp,hot,monthlyRain,monthlyTemp,monthlyET);
    document.getElementById("statusText").textContent="Location analysis loaded · demo fallback";
  }
}

function updateDashboard(rain,water,temp,hot,monthlyRain,monthlyTemp,monthlyET){
  const wet=Math.max(15,Math.min(95,Math.round(55 + (rain-water)/40)));
  const heat=hot>34?"HIGH":hot>30?"MODERATE":"LOW";
  const veg=rain>water*1.2?"FAVOURABLE":rain>water*.9?"WATCH":"STRESSED";
  document.getElementById("rainfall").textContent=`${Math.round(rain).toLocaleString()} mm`;
  document.getElementById("waterUse").textContent=`${Math.round(water).toLocaleString()} mm`;
  document.getElementById("avgTemp").textContent=`${temp.toFixed(1)}°C`;
  document.getElementById("wetness").textContent=`${wet}%`;
  document.getElementById("heatRisk").textContent=heat;
  document.getElementById("vegetation").textContent=veg;
  document.getElementById("rainfallNote").textContent=rain<1200?"relatively dry annual signal":"annual precipitation signal";
  document.getElementById("tempNote").textContent=`hottest monthly average ≈ ${hot.toFixed(1)}°C`;
  document.getElementById("vegNote").textContent=veg==="STRESSED"?"rainfall below water demand":"rainfall / demand balance";
  document.getElementById("analysisSubtitle").textContent=`Environmental snapshot for ${selected.name}.`;
  document.getElementById("whyMatters").textContent=rain<water
    ?"Rainfall is below estimated atmospheric water demand, so water management and dry-season timing deserve closer attention."
    :"Rainfall broadly exceeds estimated water demand, but heat and seasonal gaps can still create short periods of stress.";
  const rainTrend=rain<1600?"↓ Drying pressure":"↗ Wetter signal";
  const tempTrend=temp>28?"↗ Warmer signal":"→ Moderate";
  document.getElementById("rainTrend").textContent=rainTrend;
  document.getElementById("tempTrend").textContent=tempTrend;
  document.getElementById("dryTrend").textContent=rain<water?"HIGH":"LOW";
  document.getElementById("rainTrendBar").style.width=`${Math.min(90,Math.max(20,100-rain/30))}%`;
  document.getElementById("tempTrendBar").style.width=`${Math.min(90,Math.max(20,(temp-15)*5))}%`;
  document.getElementById("dryTrendBar").style.width=rain<water?"78%":"34%";
  makeChart(monthlyRain,monthlyET,monthlyTemp);
  makeRecommendations(rain,water,temp,hot,wet);
}

function makeChart(rain,et,temp){
  const ctx=document.getElementById("climateChart");
  if(chart) chart.destroy();
  chart=new Chart(ctx,{type:"bar",data:{labels:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],datasets:[
    {label:"Rainfall (mm)",data:rain,backgroundColor:"#397ba7",borderRadius:5,yAxisID:"y"},
    {label:"Crop water demand",data:et,type:"line",borderColor:"#3f8150",backgroundColor:"transparent",pointRadius:2,tension:.35,yAxisID:"y"},
    {label:"Avg temp °C",data:temp,type:"line",borderColor:"#d86b31",backgroundColor:"transparent",pointRadius:2,tension:.35,yAxisID:"temp"}
  ]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:"index",intersect:false},plugins:{legend:{position:"bottom",labels:{font:{size:10},usePointStyle:true}}},scales:{y:{beginAtZero:true,grid:{color:"#e2e2d8"},title:{display:true,text:"mm"}},temp:{position:"right",grid:{drawOnChartArea:false},title:{display:true,text:"°C"}}}}});
}

function scoreRows(scores){
  return Object.entries(scores).map(([k,v])=>`<div class="score"><span>${k}</span><div class="bar"><i style="width:${v}%"></i></div><b>${v}</b></div>`).join("");
}
function makeRecommendations(rain,water,temp,hot,wet){
  const dry=Math.max(0,Math.min(100,(water-rain)/15));
  const heat=Math.max(0,Math.min(100,(hot-27)*12));
  const options=[
    {title:"Paddy → Mung bean → Sunn hemp",desc:"Short-cycle legume plus green manure to improve soil cover and diversify the rotation.",score:Math.round(55+wet*.18+dry*.15),why:"Strong where seasonal water pressure and soil-health goals overlap.",scores:{'Soil health':82,'Water saving':78,'Heat fit':72,'Rotation break':86}},
    {title:"Paddy → Groundnut",desc:"A cash-legume option for a drier window, subject to local soil and market conditions.",score:Math.round(50+dry*.2+heat*.08),why:"Useful when the dry season creates a workable planting window.",scores:{'Soil health':68,'Water saving':84,'Heat fit':74,'Market fit':76}},
    {title:"Paddy → Grain corn",desc:"An alternative rotation where water availability and market access support it.",score:Math.round(46+wet*.15+(100-dry)*.08),why:"Potentially attractive where rainfall and farm resources are more favourable.",scores:{'Soil health':61,'Water saving':70,'Heat fit':78,'Market fit':81}}
  ];
  options.sort((a,b)=>b.score-a.score);
  const ids=[["bestScore","bestTitle","bestDescription","bestScores","bestWhy"],["altScore","altTitle","altDescription","altScores",null],["alt2Score","alt2Title","alt2Description","alt2Scores",null]];
  options.forEach((o,i)=>{
    document.getElementById(ids[i][0]).textContent=Math.min(99,o.score);
    document.getElementById(ids[i][1]).textContent=o.title;
    document.getElementById(ids[i][2]).textContent=o.desc;
    document.getElementById(ids[i][3]).innerHTML=scoreRows(o.scores);
    if(ids[i][4]) document.getElementById(ids[i][4]).textContent=o.why;
  });
}
function locateMe(){
  if(!navigator.geolocation){alert("Geolocation is not available in this browser.");return;}
  navigator.geolocation.getCurrentPosition(pos=>selectLocation(pos.coords.latitude,pos.coords.longitude),()=>alert("Location permission was not granted."));
}
