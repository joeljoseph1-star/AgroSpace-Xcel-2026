const map = L.map('map').setView([6.355, 116.83], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let marker = L.marker([6.355,116.83]).addTo(map);
marker.bindPopup('<b>Kudat, Sabah</b><br>Click another location to explore.').openPopup();

map.on('click', e => {
  marker.setLatLng(e.latlng);
  document.getElementById('locationName').textContent =
    `${e.latlng.lat.toFixed(3)}°, ${e.latlng.lng.toFixed(3)}°`;
  marker.bindPopup('<b>Selected field</b><br>Ready for analysis.').openPopup();
});

document.getElementById('analyzeBtn').addEventListener('click', () => {
  const loading = document.getElementById('loading');
  loading.style.display = 'block';
  document.getElementById('results').style.opacity = '.35';
  setTimeout(() => {
    loading.style.display = 'none';
    document.getElementById('results').style.opacity = '1';
    const n = Math.floor(65 + Math.random()*20);
    document.getElementById('health').textContent = n;
  }, 900);
});
