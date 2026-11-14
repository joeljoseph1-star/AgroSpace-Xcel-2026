// Smooth navigation
for (const link of document.querySelectorAll('a[href^="#"]')) {
  link.addEventListener('click', e => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({behavior:'smooth', block:'start'}); }
  });
}

// Interactive satellite map. The map is intentionally client-side so it works on GitHub Pages.
const map = L.map('map', { zoomControl: true, attributionControl: true }).setView([6.8741,116.8996], 10);
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 19,
  attribution: 'Tiles © Esri'
}).addTo(map);
L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 19,
  opacity: 0.65,
  attribution: 'Labels © Esri'
}).addTo(map);

let marker = L.marker([6.8741,116.8996], {draggable:true}).addTo(map);
marker.bindPopup('<b>Selected field</b><br>Kudat, Sabah').openPopup();

function updateLocation(lat,lng){
  document.getElementById('coords').textContent = `${lat.toFixed(4)}° N · ${lng.toFixed(4)}° E`;
  const name = lat > 5.5 && lat < 7.8 && lng > 115.5 && lng < 118.5 ? 'Selected field, Sabah' : 'Selected field';
  document.getElementById('locationName').textContent = name;
}
map.on('click', e => { marker.setLatLng(e.latlng); updateLocation(e.latlng.lat,e.latlng.lng); marker.bindPopup('<b>Selected field</b><br>Click RUN FIELD ANALYSIS').openPopup(); });
marker.on('dragend', e => { const p=e.target.getLatLng(); updateLocation(p.lat,p.lng); });

function analyze(){
  const p=marker.getLatLng();
  const seed=Math.abs(Math.sin(p.lat*12.9898+p.lng*78.233))*43758.5453;
  const n=seed-Math.floor(seed);
  const health=Math.round(45+n*45);
  const soil=Math.round(40+n*40);
  const rain=n>0.58?'Below baseline':n>0.3?'Near baseline':'Above baseline';
  const temp=n>0.72?'High':n>0.38?'Moderate':'Low';
  const veg=n>0.65?'Declining':n>0.35?'Stable':'Improving';
  document.getElementById('healthScore').textContent=health;
  document.getElementById('ringScore').textContent=health;
  document.getElementById('healthRing').style.setProperty('--score', `${health*3.6}deg`);
  document.getElementById('rainfall').textContent=rain;
  document.getElementById('rainfallValue').textContent=`Prototype signal · selected location`;
  document.getElementById('soil').textContent=soil>65?'Good':soil>50?'Moderate':'Low';
  document.getElementById('soilValue').textContent=`${soil}/100 · prototype index`;
  document.getElementById('temp').textContent=temp;
  document.getElementById('tempValue').textContent='NASA POWER signal · prototype';
  document.getElementById('vegetation').textContent=veg;
  document.getElementById('vegValue').textContent='Earth-observation signal · prototype';
  document.getElementById('whyText').textContent=`The selected field shows ${rain.toLowerCase()} rainfall, ${soil>65?'strong':soil>50?'moderate':'reduced'} soil moisture, and ${temp.toLowerCase()} land-temperature risk. This prototype turns the signals into an easy-to-read field-health view.`;
}
document.getElementById('analyzeBtn').addEventListener('click', analyze);
analyze();

const members=document.querySelectorAll('.member');
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting)entry.target.classList.add('show')}),{threshold:.12});
members.forEach(m=>observer.observe(m));
