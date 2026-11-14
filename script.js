const map = L.map('map').setView([6.355, 116.83], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const marker = L.marker([6.355, 116.83]).addTo(map);

const els = {
  loc: document.getElementById('loc'),
  coords: document.getElementById('coords'),
  score: document.getElementById('score'),
  rainStatus: document.getElementById('rainStatus'),
  rainValue: document.getElementById('rainValue'),
  soilStatus: document.getElementById('soilStatus'),
  soilValue: document.getElementById('soilValue'),
  heatStatus: document.getElementById('heatStatus'),
  heatValue: document.getElementById('heatValue'),
  vegStatus: document.getElementById('vegStatus'),
  vegValue: document.getElementById('vegValue'),
  load: document.getElementById('load'),
  reason1: document.getElementById('reason1'),
  reason2: document.getElementById('reason2'),
  reason3: document.getElementById('reason3'),
  guidanceTitle: document.getElementById('guidanceTitle'),
  guidance: document.getElementById('guidance')
};

let selected = {lat: 6.355, lon: 116.83, name: 'Kudat, Sabah'};

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// Deterministic prototype model: the same location always produces the same values.
// This avoids the old problem where values stayed fixed or changed randomly.
function indicators(lat, lon) {
  const s1 = Math.sin(lat * 12.9898 + lon * 78.233) * 43758.5453;
  const s2 = Math.sin(lat * 39.3467 - lon * 11.135) * 24634.6345;
  const a = s1 - Math.floor(s1);
  const b = s2 - Math.floor(s2);

  const rainfall = Math.round(55 + a * 190);
  const soil = Math.round(20 + b * 65);
  const temp = +(23 + ((Math.abs(lat) * 0.35 + b * 11) % 17)).toFixed(1);
  const vegetation = Math.round(clamp(35 + a * 55 + (soil - 50) * 0.25 - (temp - 29) * 1.4, 10, 95));

  const waterStress = soil < 35 || rainfall < 85 ? 'High' : soil < 50 || rainfall < 120 ? 'Moderate' : 'Low';
  const heatRisk = temp >= 34 ? 'High' : temp >= 30 ? 'Moderate' : 'Low';
  const vegStatus = vegetation < 48 ? 'Declining' : vegetation < 65 ? 'Stressed' : 'Stable';

  let score = Math.round(
    100 - (waterStress === 'High' ? 24 : waterStress === 'Moderate' ? 12 : 5)
        - (heatRisk === 'High' ? 20 : heatRisk === 'Moderate' ? 10 : 3)
        - (vegStatus === 'Declining' ? 18 : vegStatus === 'Stressed' ? 9 : 2)
  );
  score = clamp(score, 25, 96);

  return { rainfall, soil, temp, vegetation, waterStress, heatRisk, vegStatus, score };
}

function updateDashboard() {
  const d = indicators(selected.lat, selected.lon);
  els.loc.textContent = selected.name;
  els.coords.textContent = `${selected.lat.toFixed(3)}° ${selected.lat >= 0 ? 'N' : 'S'} · ${Math.abs(selected.lon).toFixed(3)}° ${selected.lon >= 0 ? 'E' : 'W'}`;
  els.score.textContent = d.score;

  els.rainStatus.textContent = d.rainfall < 85 ? 'Below baseline' : d.rainfall > 170 ? 'Above baseline' : 'Near baseline';
  els.rainValue.textContent = `${d.rainfall} mm / prototype period`;

  els.soilStatus.textContent = d.waterStress === 'High' ? 'Low' : d.waterStress === 'Moderate' ? 'Moderate' : 'Healthy';
  els.soilValue.textContent = `${d.soil}% relative index`;

  els.heatStatus.textContent = d.heatRisk;
  els.heatValue.textContent = `${d.temp}°C prototype estimate`;

  els.vegStatus.textContent = d.vegStatus;
  els.vegValue.textContent = `${d.vegetation} / 100 index`;

  els.reason1.textContent =
    d.rainfall < 85 ? 'Rainfall is relatively low at this selected point, increasing the chance of water stress.' :
    d.rainfall > 170 ? 'Rainfall is relatively high at this selected point, so excess-water monitoring may be important.' :
    'Rainfall is close to the prototype baseline for this selected point.';

  els.reason2.textContent =
    d.soil < 35 ? 'The soil-moisture index is low, suggesting the field may need closer irrigation and crop-stress monitoring.' :
    d.soil < 50 ? 'Soil moisture is moderate, so continued monitoring can help detect developing water stress.' :
    'Soil moisture is relatively healthy in the prototype model for this location.';

  els.reason3.textContent =
    `Land temperature is ${d.temp}°C and vegetation is ${d.vegStatus.toLowerCase()} (${d.vegetation}/100).`;

  if (d.waterStress === 'High' && d.heatRisk === 'High') {
    els.guidanceTitle.textContent = 'Prioritise water and heat monitoring.';
    els.guidance.textContent = 'Check irrigation availability, crop stress and field temperature frequently, especially during dry or hot periods.';
  } else if (d.waterStress === 'High') {
    els.guidanceTitle.textContent = 'Prioritise water-stress monitoring.';
    els.guidance.textContent = 'Monitor soil moisture and irrigation needs closely and watch for declining vegetation.';
  } else if (d.heatRisk === 'High') {
    els.guidanceTitle.textContent = 'Prioritise heat-stress monitoring.';
    els.guidance.textContent = 'Watch crop condition and soil moisture because elevated temperature can increase evaporation and plant stress.';
  } else {
    els.guidanceTitle.textContent = 'Continue monitoring field conditions.';
    els.guidance.textContent = 'Use the environmental indicators as an early-warning view and compare changes over time before making farm decisions.';
  }
}

async function reverseGeocode(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=10&addressdetails=1`;
    const res = await fetch(url, {headers: {'Accept': 'application/json'}});
    if (!res.ok) throw new Error('Reverse geocoding failed');
    const data = await res.json();
    const a = data.address || {};
    const place = a.city || a.town || a.village || a.municipality || a.county || a.state || data.display_name?.split(',')[0];
    const region = a.state || a.country;
    return place ? `${place}${region && region !== place ? ', ' + region : ''}` : `Selected field`;
  } catch (e) {
    return `Selected field`;
  }
}

async function selectLocation(lat, lon) {
  selected.lat = lat;
  selected.lon = lon;
  selected.name = 'Selected field';
  marker.setLatLng([lat, lon]).bindPopup(`<b>Selected field</b><br>${lat.toFixed(3)}°, ${lon.toFixed(3)}°`).openPopup();
  updateDashboard();

  els.load.style.display = 'block';
  els.load.textContent = 'Identifying selected location…';
  selected.name = await reverseGeocode(lat, lon);
  els.load.style.display = 'none';
  updateDashboard();
}

map.on('click', e => selectLocation(e.latlng.lat, e.latlng.lng));

document.getElementById('analyze').addEventListener('click', () => {
  els.load.style.display = 'block';
  els.load.textContent = 'Analysing selected location…';
  setTimeout(() => {
    els.load.style.display = 'none';
    updateDashboard();
  }, 450);
});

updateDashboard();
