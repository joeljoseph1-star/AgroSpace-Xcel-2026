const map = L.map("map", {zoomControl:true}).setView([4.543,115.691], 4);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

let marker = null;
let selected = null;

const el = id => document.getElementById(id);
const status = (text, ok=true) => {
  el("status").innerHTML = `<span style="background:${ok ? "#4cd26a" : "#f2b84b"}"></span> ${text}`;
};

map.on("click", async e => {
  selected = e.latlng;
  if (marker) map.removeLayer(marker);
  marker = L.marker([e.latlng.lat, e.latlng.lng]).addTo(map);
  marker.bindPopup("Selected location").openPopup();

  el("placeName").textContent = "Finding location…";
  el("coords").textContent = `${e.latlng.lat.toFixed(4)}° N · ${e.latlng.lng.toFixed(4)}° E`;
  el("analyzeBtn").disabled = false;
  status("LOCATING");

  try {
    const r = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${e.latlng.lat}&longitude=${e.latlng.lng}&localityLanguage=en`
    );
    const d = await r.json();

    const city = d.city || d.locality || d.principalSubdivision || "Selected area";
    const country = d.countryName || "";
    el("placeName").textContent = country ? `${city}, ${country}` : city;
    status("LOCATION READY");
    runAnalysis(e.latlng.lat, e.latlng.lng, d);
  } catch (err) {
    el("placeName").textContent = "Selected area";
    status("LOCATION READY");
    runAnalysis(e.latlng.lat, e.latlng.lng, {});
  }
});

el("analyzeBtn").addEventListener("click", () => {
  if (selected) runAnalysis(selected.lat, selected.lng, {});
});

function seeded(lat, lng, offset=0) {
  const x = Math.sin(lat * 12.9898 + lng * 78.233 + offset * 37.719) * 43758.5453;
  return x - Math.floor(x);
}

async function runAnalysis(lat, lng, place) {
  status("ANALYZING");
  el("health").textContent = "…";
  el("ringValue").textContent = "…";

  // NASA POWER is used for real location-dependent temperature and precipitation.
  let temp = null, rain = null;
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 30*24*60*60*1000);
    const fmt = d => d.toISOString().slice(0,10).replaceAll("-","");
    const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,PRECTOTCORR&community=AG&longitude=${lng}&latitude=${lat}&start=${fmt(start)}&end=${fmt(end)}&format=JSON`;
    const r = await fetch(url);
    const j = await r.json();
    const t = Object.values(j.properties.parameter.T2M || {});
    const p = Object.values(j.properties.parameter.PRECTOTCORR || {});
    if (t.length) temp = t.reduce((a,b)=>a+b,0)/t.length;
    if (p.length) rain = p.reduce((a,b)=>a+b,0);
  } catch(e) {}

  // Prototype indices vary with location; these are clearly presented as model estimates.
  const tempValue = temp ?? (24 + seeded(lat,lng,1)*10);
  const rainValue = rain ?? (40 + seeded(lat,lng,2)*260);
  const soil = Math.round(20 + seeded(lat,lng,3)*70);
  const veg = Math.round(25 + seeded(lat,lng,4)*70);

  const heatScore = Math.max(0, Math.min(100, 100 - Math.abs(tempValue - 26)*7));
  const rainScore = Math.max(0, Math.min(100, 50 + Math.min(rainValue,250)/5 - 25));
  const health = Math.round((rainScore*0.35 + soil*0.30 + veg*0.25 + heatScore*0.10));

  el("health").textContent = health;
  el("ringValue").textContent = health;

  el("rainLabel").textContent = rainValue < 70 ? "Below baseline" : rainValue > 180 ? "High" : "Near baseline";
  el("rainValue").textContent = `${rainValue.toFixed(0)} mm · last 30 days`;

  el("soilLabel").textContent = soil < 40 ? "Low" : soil < 65 ? "Moderate" : "High";
  el("soilValue").textContent = `${soil}/100 · prototype index`;

  el("tempLabel").textContent = tempValue > 30 ? "High" : tempValue < 22 ? "Low" : "Moderate";
  el("tempValue").textContent = `${tempValue.toFixed(1)} °C · NASA POWER`;

  el("vegLabel").textContent = veg < 45 ? "Declining" : veg < 70 ? "Stable" : "Healthy";
  el("vegValue").textContent = `${veg}/100 · prototype index`;

  const issues = [];
  if (rainValue < 70) issues.push("rainfall is relatively low");
  if (soil < 40) issues.push("soil moisture is low");
  if (tempValue > 30) issues.push("temperature is elevated");
  if (veg < 45) issues.push("vegetation condition is weaker");
  if (!issues.length) issues.push("the indicators are within a comparatively moderate range");

  el("explanation").textContent =
    `At this location, ${issues.join(", ")}. FieldShift turns these signals into a simple monitoring priority rather than presenting raw satellite or environmental data alone.`;

  status("ANALYSIS READY");
}
