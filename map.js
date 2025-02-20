mapboxgl.accessToken = 'Ypk.eyJ1Ijoia2F1c2hpazEyMjEiLCJhIjoiY203ZDJkanVhMHk2NjJtb3Nka2loZm52eiJ9.p0aHmebQSUPXf11sdCuTew'; 

const map = new mapboxgl.Map({
  container: 'map', 
  style: 'mapbox://styles/mapbox/streets-v12', 
  center: [-71.09415, 42.36027], // [longitude, latitude] - Boston area
  zoom: 12, // Initial zoom level
  minZoom: 5, // Minimum zoom level
  maxZoom: 18 // Maximum zoom level
});

map.addControl(new mapboxgl.NavigationControl());

// Optional: Add a marker at the center location
const marker = new mapboxgl.Marker()
  .setLngLat([-71.09415, 42.36027]) // Same as center
  .setPopup(new mapboxgl.Popup().setHTML("<h3>Boston</h3><p>A great place for biking!</p>")) // Popup with info
  .addTo(map);
