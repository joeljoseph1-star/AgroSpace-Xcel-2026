const DEFAULT = {lat: 6.8833, lng: 116.8333};

const map = L.map("map", {
  zoomControl: true,
  minZoom: 2,
  maxZoom: 18,
  worldCopyJump: true
}).setView([DEFAULT.lat, DEFAULT.lng], 7);

// Satellite imagery — the map itself is always satellite imagery.
const satellite = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  { attribution: "Tiles © Esri", maxZoom: 18, crossOrigin: true }
).addTo(map);

// Optional labels/boundaries over the satellite imagery.
L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
  { maxZoom: 18, opacity: 0.8, attribution: "Labels © Esri" }
).addTo(map);

let marker = L.marker([DEFAULT.lat, DEFAULT.lng], {draggable:true}).addTo(map);

function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }

function scoreFromLocation(lat,lng){
  // Demo/explainability layer: the score changes with the selected location.
  const seed = Math.abs(Math.sin(lat*12.9898 + lng*78.233) * 43758.5453);
  const noise = seed - Math.floor(seed);
  const score = Math.round(clamp(42 + noise*48, 35, 92));
  const rainfall = score < 52 ? "Below baseline" : score < 72 ? "Near baseline" : "Above baseline";
  const water = score < 48 ? "High" : score < 65 ? "Moderate" : "Low";
  const heat = ((Math.abs(lat) + Math.abs(lng)%17) % 10) > 5 ? "High" : "Moderate";
  const vegetation = score < 50 ? "Declining" : score < 70 ? "Watch" : "Healthy";
  return {score,rainfall,water,heat,vegetation};
}

function formatCoords(lat,lng){
  return `${Math.abs(lat).toFixed(4)}° ${lat>=0?"N":"S"} · ${Math.abs(lng).toFixed(4)}° ${lng>=0?"E":"W"}`;
}

async function reverseGeocode(lat,lng){
  try{
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=10&addressdetails=1&accept-language=en`;
    const r = await fetch(url, {headers: {"Accept":"application/json"}});
    if(!r.ok) throw new Error("Reverse geocode failed");
    const d = await r.json();
    const a = d.address || {};

    // Prefer a city/town/village name, then fall back to the readable display name.
    const place = a.city || a.town || a.municipality || a.village || a.suburb || a.county || a.state || "";
    const country = a.country || "";

    if(place && country) return `${place}, ${country}`;
    if(country) return country;
    if(d.display_name) return d.display_name.split(",").slice(0,2).join(",").trim();
    return "Selected field";
  }catch(e){
    return "Selected field";
  }
}

function updateAnalysis(lat,lng){
  const d = scoreFromLocation(lat,lng);
  document.getElementById("healthScore").textContent=d.score;
  document.getElementById("healthRingText").textContent=d.score;
  document.getElementById("healthRing").style.borderColor =
    d.score >= 70 ? "#67e5ff" : d.score >= 50 ? "#ffd166" : "#ff6b6b";
  document.getElementById("rainfall").textContent=d.rainfall;
  document.getElementById("waterStress").textContent=d.water;
  document.getElementById("heatRisk").textContent=d.heat;
  document.getElementById("vegetation").textContent=d.vegetation;
  document.getElementById("whyText").textContent =
    `At ${formatCoords(lat,lng)}, the FieldShift indicators suggest ${d.rainfall.toLowerCase()} rainfall, ${d.water.toLowerCase()} water stress, ${d.heat.toLowerCase()} heat risk and ${d.vegetation.toLowerCase()} vegetation conditions.`;
}

async function updateLocation(lat,lng){
  document.getElementById("coords").textContent = formatCoords(lat,lng);
  document.getElementById("placeName").textContent = "Locating field…";
  updateAnalysis(lat,lng);
  const name = await reverseGeocode(lat,lng);
  document.getElementById("placeName").textContent = name;
}

async function geocodeSearch(query){
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=1&addressdetails=1&accept-language=en`;
  const r = await fetch(url, {headers: {"Accept":"application/json"}});
  if(!r.ok) throw new Error("Search failed");
  const results = await r.json();
  if(!results.length) throw new Error("No location found");
  return {lat:Number(results[0].lat), lng:Number(results[0].lon)};
}

map.on("click", e=>{
  marker.setLatLng(e.latlng);
  updateLocation(e.latlng.lat,e.latlng.lng);
});

marker.on("dragend", e=>{
  const p=e.target.getLatLng();
  updateLocation(p.lat,p.lng);
});

document.getElementById("runAnalysis").addEventListener("click",()=>{
  const p=marker.getLatLng();
  updateLocation(p.lat,p.lng);
});

document.getElementById("searchLocation").addEventListener("click", async ()=>{
  const input=document.getElementById("locationSearch");
  const query=input.value.trim();
  if(!query) return;
  try{
    const p=await geocodeSearch(query);
    map.setView([p.lat,p.lng], 10);
    marker.setLatLng([p.lat,p.lng]);
    updateLocation(p.lat,p.lng);
  }catch(e){
    document.getElementById("placeName").textContent="Location not found";
  }
});

document.getElementById("locationSearch").addEventListener("keydown",e=>{
  if(e.key==="Enter") document.getElementById("searchLocation").click();
});

document.getElementById("resetMap").addEventListener("click",()=>{
  map.setView([DEFAULT.lat,DEFAULT.lng],7);
  marker.setLatLng([DEFAULT.lat,DEFAULT.lng]);
  updateLocation(DEFAULT.lat,DEFAULT.lng);
});

updateLocation(DEFAULT.lat,DEFAULT.lng);
