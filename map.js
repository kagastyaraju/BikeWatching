// Set your Mapbox access token here (replace with your actual token)
mapboxgl.accessToken = 'pk.eyJ1Ijoia2F1c2hpazEyMjEiLCJhIjoiY203ZDJkanVhMHk2NjJtb3Nka2loZm52eiJ9.p0aHmebQSUPXf11sdCuTew';

// Initialize the map
const map = new mapboxgl.Map({
  container: 'map', // ID of the div where the map will render
  style: 'mapbox://styles/mapbox/streets-v12', // Base map style
  center: [-71.09415, 42.36027], // [longitude, latitude] (Boston area)
  zoom: 12,     // Initial zoom level
  minZoom: 5,   // Minimum zoom level allowed
  maxZoom: 18   // Maximum zoom level allowed
});

// Add navigation controls (optional but useful for zooming/rotation)
map.addControl(new mapboxgl.NavigationControl());

// Wait for the map to fully load before adding data layers
map.on('load', () => {
  
  // Optional: Define a shared styling object for the bike lane layers
  const laneStyle = {
    'line-color': '#32D400',  // A bright green color
    'line-width': 5,          // Thicker lines for better visibility
    'line-opacity': 0.6       // Slightly less transparent
  };

  // Add Boston bike lanes data source
  map.addSource('boston_route', {
    type: 'geojson',
    data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson?...'
  });

  // Add layer for Boston bike lanes
  map.addLayer({
    id: 'bike-lanes-boston',
    type: 'line',
    source: 'boston_route',
    paint: laneStyle // Use the shared style
  });
  
  // Add Cambridge bike lanes data source
  map.addSource('cambridge_route', {
    type: 'geojson',
    data: 'https://your-cambridge-bike-lanes-geojson-url.geojson'
  });

  // Add layer for Cambridge bike lanes
  map.addLayer({
    id: 'bike-lanes-cambridge',
    type: 'line',
    source: 'cambridge_route',
    paint: laneStyle // Reuse the same styling object
  });
  
});
