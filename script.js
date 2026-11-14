const map = L.map("map", {
  zoomControl: true,
  scrollWheelZoom: true,
  attributionControl: true
}).setView([4.2105, 101.9758], 5);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let marker = null;
let selected = null;

const placeName = document.getElementById("placeName");
const coordinates = document.getElementById("coordinates");
const runAnalysis = document.getElementById("runAnalysis");

function resizeMap() {
  requestAnimationFrame(() => {
    map.invalidateSize(true);
  });
  setTimeout(() => map.invalidateSize(true), 300);
  setTimeout(() => map.invalidateSize(true), 800);
}

window.addEventListener("load", resizeMap);
window.addEventListener("resize", resizeMap);

document.querySelectorAll("a[href='#fieldshift']").forEach(a => {
  a.addEventListener("click", () => {
    setTimeout(resizeMap, 50);
  });
});

async function reverseGeocode(lat, lon) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
      { headers: { "Accept": "application/json" } }
    );

    if (!response.ok) throw new Error("Geocoding failed");

    const data = await response.json();
    const address = data.address || {};
    const city =
      address.city ||
      address.town ||
      address.municipality ||
      address.village ||
      address.county;

    const country = address.country;

    return city && country
      ? `${city}, ${country}`
      : (data.display_name || "Selected field");
  } catch {
    return "Selected field";
  }
}

function makeAssessment(lat, lon) {
  const seed =
    Math.abs(Math.sin(lat * 12.9898 + lon * 78.233) * 43758.5453) % 1;

  const rainfall = Math.round(35 + seed * 55);
  const soil = Math.round(30 + ((seed * 1.73) % 1) * 60);
  const temp = Math.round(25 + ((seed * 2.41) % 1) * 10);
  const veg = Math.round(35 + ((seed * 3.17) % 1) * 60);

  const heatRisk = temp >= 32 ? "High" : temp >= 29 ? "Moderate" : "Low";
  const waterStress = soil < 45 ? "High" : soil < 65 ? "Moderate" : "Low";
  const vegetation =
    veg < 50 ? "Declining" : veg < 70 ? "Stable" : "Healthy";

  const health = Math.max(
    35,
    Math.min(
      96,
      Math.round(
        0.30 * soil +
        0.25 * veg +
        0.25 * rainfall +
        0.20 * (100 - (temp - 25) * 8)
      )
    )
  );

  return {
    rainfall,
    soil,
    temp,
    veg,
    heatRisk,
    waterStress,
    vegetation,
    health
  };
}

async function selectLocation(lat, lon) {
  selected = { lat, lon };

  if (marker) marker.remove();

  marker = L.marker([lat, lon]).addTo(map);
  marker.bindPopup("Selected field").openPopup();

  coordinates.textContent =
    `${lat.toFixed(4)}° N · ${lon.toFixed(4)}° E`;

  placeName.textContent = "Finding location…";

  const name = await reverseGeocode(lat, lon);
  placeName.textContent = name;

  runAnalysis.disabled = false;
  resizeMap();
}

map.on("click", e => {
  selectLocation(e.latlng.lat, e.latlng.lng);
});

runAnalysis.addEventListener("click", () => {
  if (!selected) return;

  const a = makeAssessment(selected.lat, selected.lon);

  document.getElementById("healthScore").textContent = a.health;
  document.getElementById("ringScore").textContent = a.health;
  document.getElementById("rainfall").textContent = `${a.rainfall}% baseline`;
  document.getElementById("soil").textContent =
    a.soil < 45 ? "Low" : a.soil < 65 ? "Moderate" : "Good";
  document.getElementById("heat").textContent =
    `${a.temp}°C · ${a.heatRisk}`;
  document.getElementById("vegetation").textContent =
    `${a.veg}/100 · ${a.vegetation}`;

  document.getElementById("insightText").textContent =
    `The selected area shows ${a.waterStress.toLowerCase()} water stress, ` +
    `${a.heatRisk.toLowerCase()} heat risk and ${a.vegetation.toLowerCase()} vegetation condition. ` +
    `FieldShift surfaces these signals so farmers can monitor changing conditions and adapt earlier.`;
});

document.addEventListener("DOMContentLoaded", () => {
  resizeMap();
});
