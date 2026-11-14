document.addEventListener('DOMContentLoaded', () => {
  const sabah = [6.8871, 116.8529];

  if (typeof L === 'undefined') {
    const mapEl = document.getElementById('map');
    mapEl.innerHTML = '<div class="map-error">Interactive map could not load. Please refresh the page with an internet connection.</div>';
    return;
  }

  const map = L.map('map', {
    scrollWheelZoom: true,
    zoomControl: true
  }).setView(sabah, 6);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let marker = L.marker(sabah).addTo(map);

  function formatLocation(lat, lon) {
    const ns = lat >= 0 ? 'N' : 'S';
    const ew = lon >= 0 ? 'E' : 'W';
    return `${lat.toFixed(4)}° ${ns}, ${Math.abs(lon).toFixed(4)}° ${ew}`;
  }

  async function reverseGeocode(lat, lon) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error('Reverse geocoding failed');
      const data = await response.json();
      const a = data.address || {};
      return a.city || a.town || a.municipality || a.county || a.state || data.display_name?.split(',')[0] || 'Selected field';
    } catch {
      return 'Selected field';
    }
  }

  async function updateField(lat, lon) {
    const f = Math.abs(lat);
    const baseRain = Math.round(2656 - (f - 6) * 28);
    const temp = (27.4 + (6.9 - f) * 0.12).toFixed(1);

    const name = await reverseGeocode(lat, lon);
    document.getElementById('locationName').innerHTML =
      `${name} <span>${formatLocation(lat, lon)}</span>`;
    document.getElementById('mapLocation').textContent =
      `${name} · ${formatLocation(lat, lon)}`;

    document.getElementById('rainfall').textContent =
      `${Math.max(900, baseRain).toLocaleString()} mm`;
    document.getElementById('avgTemp').textContent = `${temp}°C`;
    document.getElementById('wetness').textContent =
      `${Math.round(55 + (Math.sin(lon / 10) * 12 + Math.cos(lat) * 8))}%`;
    document.getElementById('elevation').textContent =
      `${Math.max(5, Math.round(20 + Math.abs(lat - 6.9) * 30))} m`;
    document.getElementById('slope').textContent =
      `${(1.2 + Math.abs(Math.sin(lon)) * 2.2).toFixed(1)}%`;
    document.getElementById('waterUse').textContent =
      `${Math.round(1500 + Math.abs(lat) * 18).toLocaleString()} mm`;
  }

  map.on('click', e => {
    marker.setLatLng(e.latlng);
    updateField(e.latlng.lat, e.latlng.lng);
  });

  document.getElementById('locateBtn').addEventListener('click', () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        map.setView([latitude, longitude], 10);
        marker.setLatLng([latitude, longitude]);
        updateField(latitude, longitude);
      },
      () => alert('Location permission was not granted.')
    );
  });

  // Leaflet needs a size recalculation after GitHub Pages/browser layout settles.
  setTimeout(() => map.invalidateSize(), 250);
});

const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const rainfall=[320,170,150,120,170,195,210,200,235,285,270,320];
const crop=[115,125,155,165,160,140,150,155,140,135,120,110];
const hot=[29,29,30,31,32,31,31,31,31,31,30,30];
function lineChart(id, data, labels, title){
  new Chart(document.getElementById(id),{type:'line',data:{labels,datasets:[{data,borderColor:'#2874a6',borderWidth:2,pointRadius:0,tension:.3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{mode:'index',intersect:false}},scales:{x:{grid:{display:false}},y:{grid:{color:'#e2e7ea'}}}}});
}
new Chart(document.getElementById('yearChart'),{data:{labels:months,datasets:[
 {type:'bar',label:'Rainfall',data:rainfall,backgroundColor:'#397ca8',borderRadius:5},
 {type:'line',label:'Crop water use',data:crop,borderColor:'#3f7e45',backgroundColor:'#3f7e45',tension:.3,pointRadius:2},
 {type:'line',label:'Hottest day',data:hot,borderColor:'#d9682b',backgroundColor:'#d9682b',tension:.3,pointRadius:2,yAxisID:'temp'}
]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},scales:{y:{beginAtZero:true},temp:{position:'right',min:15,max:40,grid:{drawOnChartArea:false}}}}});
const years=Array.from({length:25},(_,i)=>2001+i);
lineChart('rainTrend',[2850,2450,2700,2500,3000,2600,2350,2800,2720,2500,3000,2600,2580,2600,2200,2250,2700,2400,2250,2300,2600,2750,2500,2200,2656],years);
lineChart('tempTrend',[26.1,26.3,26.2,26.3,26.4,26.2,26.1,26.6,26.9,26.1,26.4,26.5,26.7,27.0,27.7,27.1,27.3,27.6,27.9,27.2,27.0,27.4,28.1,28.8,27.4],years);
lineChart('hotTrend',[28,29,28.8,28.6,28.3,28.4,28.1,28.8,29.2,28.6,28.7,29.1,30.0,30.8,29.0,28.8,30.5,28.9,28.6,29.2,30.8,29.1,28.8,31.0,29.8],years);
lineChart('soilTrend',[84,78,80,79,82,88,83,89,86,80,88,86,84,83,76,74,82,79,75,75,86,88,80,75,83],years);

const modal=document.getElementById('teamModal');
document.querySelectorAll('.person').forEach(btn=>btn.addEventListener('click',()=>{
  document.getElementById('modalName').textContent=btn.dataset.name;
  document.getElementById('modalRole').textContent=btn.dataset.role;
  const img=document.getElementById('modalPhoto');
  img.src=btn.dataset.photo;
  img.alt=btn.dataset.name;
  img.onerror=()=>img.src='team-placeholder.svg';
  modal.classList.add('show'); modal.setAttribute('aria-hidden','false');
}));
function closeModal(){modal.classList.remove('show');modal.setAttribute('aria-hidden','true')}
document.getElementById('closeModal').addEventListener('click',closeModal);
document.querySelector('.modal-backdrop').addEventListener('click',closeModal);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
