
const defaultLocation = [6.8871, 116.8529];
const map = L.map('map', { scrollWheelZoom: true }).setView(defaultLocation, 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

let marker = L.marker(defaultLocation).addTo(map);

function formatCoords(lat, lon) {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${ns} · ${Math.abs(lon).toFixed(4)}° ${ew}`;
}

function updateMetrics(lat, lon) {
  const latitudeFactor = Math.abs(lat);
  const rain = Math.max(700, Math.round(2850 - latitudeFactor * 35 + Math.sin(lon * 0.12) * 180));
  const temp = (27.8 - Math.min(latitudeFactor, 30) * 0.035 + Math.cos(lon * 0.08) * 0.4).toFixed(1);
  const wetness = Math.max(20, Math.min(95, Math.round(68 + Math.sin(lat * 0.7) * 12 + Math.cos(lon * 0.5) * 8)));
  const elevation = Math.max(5, Math.round(25 + Math.abs(lat - 6.9) * 42 + Math.abs(lon - 116.8) * 0.8));
  const slope = (0.8 + Math.abs(Math.sin(lat * 0.45 + lon * 0.03)) * 3.8).toFixed(1);
  const waterUse = Math.round(1350 + (30 - Math.min(latitudeFactor, 30)) * 14 + Math.abs(Math.sin(lon)) * 80);

  document.getElementById('rainfall').textContent = `${rain.toLocaleString()} mm`;
  document.getElementById('waterUse').textContent = `${waterUse.toLocaleString()} mm`;
  document.getElementById('avgTemp').textContent = `${temp}°C`;
  document.getElementById('wetness').textContent = `${wetness}%`;
  document.getElementById('elevation').textContent = `${elevation} m`;
  document.getElementById('slope').textContent = `${slope}%`;
}

async function reverseGeocode(lat, lon) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=10&addressdetails=1`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!response.ok) throw new Error('Reverse geocoding failed');
    const data = await response.json();
    const address = data.address || {};
    const place =
      address.city ||
      address.town ||
      address.municipality ||
      address.county ||
      address.state ||
      data.display_name?.split(',')[0] ||
      'Selected field';

    const country = address.country ? `, ${address.country}` : '';
    return `${place}${country}`;
  } catch (error) {
    return 'Selected field';
  }
}

async function selectField(lat, lon) {
  marker.setLatLng([lat, lon]);
  map.panTo([lat, lon]);
  document.getElementById('mapLocation').textContent = `Loading location · ${formatCoords(lat, lon)}`;
  document.getElementById('locationName').innerHTML =
    `Selected field <span>${formatCoords(lat, lon)}</span>`;

  updateMetrics(lat, lon);

  const place = await reverseGeocode(lat, lon);
  document.getElementById('mapLocation').textContent = `${place} · ${formatCoords(lat, lon)}`;
  document.getElementById('locationName').innerHTML =
    `${place} <span>${formatCoords(lat, lon)}</span>`;
}

map.on('click', (event) => {
  selectField(event.latlng.lat, event.latlng.lng);
});

const locateBtn = document.getElementById('locateBtn');
if (locateBtn) {
  locateBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        map.setView([latitude, longitude], 10);
        selectField(latitude, longitude);
      },
      () => alert('Location permission was not granted.')
    );
  });
}

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const rainfall = [320,170,150,120,170,195,210,200,235,285,270,320];
const crop = [115,125,155,165,160,140,150,155,140,135,120,110];
const hot = [29,29,30,31,32,31,31,31,31,31,30,30];

function lineChart(id, data, labels) {
  const canvas = document.getElementById(id);
  if (!canvas || typeof Chart === 'undefined') return;
  new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: '#2874a6',
        borderWidth: 2,
        pointRadius: 0,
        tension: .3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { grid: { display: false } }, y: { grid: { color: '#e2e7ea' } } }
    }
  });
}

if (typeof Chart !== 'undefined') {
  new Chart(document.getElementById('yearChart'), {
    data: {
      labels: months,
      datasets: [
        { type:'bar', label:'Rainfall', data:rainfall, backgroundColor:'#397ca8', borderRadius:5 },
        { type:'line', label:'Crop water use', data:crop, borderColor:'#3f7e45', backgroundColor:'#3f7e45', tension:.3, pointRadius:2 },
        { type:'line', label:'Hottest day', data:hot, borderColor:'#d9682b', backgroundColor:'#d9682b', tension:.3, pointRadius:2, yAxisID:'temp' }
      ]
    },
    options: {
      responsive:true,
      maintainAspectRatio:false,
      interaction:{mode:'index',intersect:false},
      scales:{y:{beginAtZero:true},temp:{position:'right',min:15,max:40,grid:{drawOnChartArea:false}}}
    }
  });

  const years = Array.from({length:25}, (_,i)=>2001+i);
  lineChart('rainTrend',[2850,2450,2700,2500,3000,2600,2350,2800,2720,2500,3000,2600,2580,2600,2200,2250,2700,2400,2250,2300,2600,2750,2500,2200,2656],years);
  lineChart('tempTrend',[26.1,26.3,26.2,26.3,26.4,26.2,26.1,26.6,26.9,26.1,26.4,26.5,26.7,27.0,27.7,27.1,27.3,27.6,27.9,27.2,27.0,27.4,28.1,28.8,27.4],years);
  lineChart('hotTrend',[28,29,28.8,28.6,28.3,28.4,28.1,28.8,29.2,28.6,28.7,29.1,30.0,30.8,29.0,28.8,30.5,28.9,28.6,29.2,30.8,29.1,28.8,31.0,29.8],years);
  lineChart('soilTrend',[84,78,80,79,82,88,83,89,86,80,88,86,84,83,76,74,82,79,75,75,86,88,80,75,83],years);
}

const modal = document.getElementById('teamModal');
document.querySelectorAll('.person').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.getElementById('modalName').textContent = btn.dataset.name;
    document.getElementById('modalRole').textContent = btn.dataset.role;
    const img = document.getElementById('modalPhoto');
    img.src = btn.dataset.photo;
    img.alt = btn.dataset.name;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
  });
});

function closeModal() {
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
}

document.getElementById('closeModal').addEventListener('click', closeModal);
document.querySelector('.modal-backdrop').addEventListener('click', closeModal);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeModal();
});

selectField(defaultLocation[0], defaultLocation[1]);
