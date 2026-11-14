const map=L.map('map',{zoomControl:true}).setView([6.355,116.83],6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
let marker=L.marker([6.355,116.83]).addTo(map);
let current={lat:6.355,lon:116.83};
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function seeded(lat,lon){let x=Math.sin(lat*12.9898+lon*78.233)*43758.5453;return x-Math.floor(x)}
function analyze(lat,lon){
 current={lat,lon};
 const s=seeded(lat,lon), s2=seeded(lat+4.71,lon-3.12), s3=seeded(lat-8.2,lon+6.7);
 const rain=Math.round(55+s*105), soil=Math.round(22+s2*63), temp=(27+s3*8).toFixed(1);
 const veg=Math.round(38+s*52);
 const health=Math.round(clamp(100-(100-soil)*.28-(temp-27)*4-(100-veg)*.25-(rain<80?9:0),35,95));
 document.getElementById('health').textContent=health;
 document.getElementById('ring').style.transform=`rotate(${(-35+health*.7)}deg)`;
 document.getElementById('rainVal').textContent=rain+' mm / model period';
 document.getElementById('soilVal').textContent=soil+' % relative index';
 document.getElementById('heatVal').textContent=temp+' °C model estimate';
 document.getElementById('vegVal').textContent=veg+' / 100 index';
 document.getElementById('rain').textContent=rain<85?'Below baseline':rain<125?'Near baseline':'Above baseline';
 document.getElementById('soil').textContent=soil<42?'Low':soil<67?'Moderate':'Healthy';
 document.getElementById('heat').textContent=temp>32?'High':temp>29?'Moderate':'Low';
 document.getElementById('veg').textContent=veg<55?'Declining':veg<75?'Stable':'Healthy';
 let reasons=[];
 if(rain<85) reasons.push('rainfall is relatively low');
 if(soil<45) reasons.push('soil moisture is relatively low');
 if(temp>32) reasons.push('heat is elevated');
 if(veg<55) reasons.push('vegetation condition is weaker');
 if(!reasons.length) reasons=['rainfall, moisture, heat and vegetation are comparatively balanced'];
 document.getElementById('why').textContent='At this location, '+reasons.slice(0,3).join(', ')+'.';
 document.getElementById('summaryTitle').textContent=health<55?'High field stress':health<72?'Moderate field stress':'Relatively healthy field';
 document.getElementById('summary').textContent='The selected coordinates produce a different combination of rainfall, moisture, heat and vegetation indicators. Move the map to compare fields.';
 document.getElementById('bar').style.width=health+'%';
 document.getElementById('coords').textContent=`${lat.toFixed(3)}° N · ${lon.toFixed(3)}° E`;
}
function selectPoint(lat,lon){
 marker.setLatLng([lat,lon]).bindPopup(`<b>Selected field</b><br>${lat.toFixed(3)}°, ${lon.toFixed(3)}°`).openPopup();
 analyze(lat,lon);
}
map.on('click',e=>selectPoint(e.latlng.lat,e.latlng.lng));
document.getElementById('analyze').onclick=()=>analyze(current.lat,current.lon);
analyze(current.lat,current.lon);
