mapboxgl.accessToken =
  'pk.eyJ1Ijoia2F1c2hpazEyMjEiLCJhIjoiY203ZDJkanVhMHk2NjJtb3Nka2loZm52eiJ9.p0aHmebQSUPXf11sdCuTew';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [-71.09415, 42.36027],
  zoom: 12,
  minZoom: 5,
  maxZoom: 18,
});

map.addControl(new mapboxgl.NavigationControl());

let stations = [];
let departuresByMinute = Array.from({ length: 1440 }, () => []);
let arrivalsByMinute = Array.from({ length: 1440 }, () => []);
let timeFilter = -1;
let globalMaxTraffic = 0;

function getCoords(station) {
  const lon = parseFloat(station?.lon || station?.Long) || -71.09415;
  const lat = parseFloat(station?.lat || station?.Lat) || 42.36027;
  const point = new mapboxgl.LngLat(lon, lat);
  const { x, y } = map.project(point);
  return { cx: x, cy: y };
}

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function filterByMinute(tripsByMinute, minute) {
  let minMinute = (minute - 60 + 1440) % 1440;
  let maxMinute = (minute + 60) % 1440;
  if (minMinute > maxMinute) {
    let beforeMidnight = tripsByMinute.slice(minMinute);
    let afterMidnight = tripsByMinute.slice(0, maxMinute);
    return beforeMidnight.concat(afterMidnight).flat();
  } else {
    return tripsByMinute.slice(minMinute, maxMinute).flat();
  }
}

map.on('load', () => {
  // Create an overlay container for D3
  const overlay = d3.select('#map')
    .append('div')
    .attr('class', 'overlay');
  
  // Append an SVG inside this overlay container
  const svg = overlay.append('svg')
    .attr('width', '100%')
    .attr('height', '100%');

  d3.json('https://dsc106.com/labs/lab07/data/bluebikes-stations.json')
    .then((jsonData) => {
      stations = jsonData.data.stations;

      const circles = svg.selectAll('circle')
        .data(stations)
        .enter()
        .append('circle')
        .attr('stroke', 'white')
        .attr('stroke-width', 1)
        .attr('opacity', 0.8);

      function updatePositions() {
        circles
          .attr('cx', (d) => getCoords(d).cx)
          .attr('cy', (d) => getCoords(d).cy);
      }
      updatePositions();
      map.on('move', updatePositions);
      map.on('zoom', updatePositions);
      map.on('resize', updatePositions);
      map.on('moveend', updatePositions);

      // Load trip data
      d3.csv('https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv')
        .then((trips) => {
          trips.forEach((trip) => {
            trip.started_at = new Date(trip.started_at);
            trip.ended_at = new Date(trip.ended_at);
            let startMin = minutesSinceMidnight(trip.started_at);
            let endMin = minutesSinceMidnight(trip.ended_at);
            departuresByMinute[startMin].push(trip);
            arrivalsByMinute[endMin].push(trip);
          });

          const allDepartures = departuresByMinute.flat();
          const allArrivals = arrivalsByMinute.flat();
          const globalDepartures = d3.rollup(
            allDepartures,
            (v) => v.length,
            (d) => d.start_station_id
          );
          const globalArrivals = d3.rollup(
            allArrivals,
            (v) => v.length,
            (d) => d.end_station_id
          );
          const unfilteredStations = stations.map((station) => {
            const id = station.short_name;
            const depCount = globalDepartures.get(id) ?? 0;
            const arrCount = globalArrivals.get(id) ?? 0;
            station.departures = depCount;
            station.arrivals = arrCount;
            station.totalTraffic = depCount + arrCount;
            return station;
          });
          globalMaxTraffic =
            d3.max(unfilteredStations, (d) => d.totalTraffic) || 0;

          updateVisualization();

          const timeSlider = document.getElementById('time-slider');
          const selectedTime = document.getElementById('selected-time');
          const anyTimeLabel = document.getElementById('any-time');

          function formatTime(minutes) {
            const date = new Date(0, 0, 0, 0, minutes);
            return date.toLocaleString('en-US', { timeStyle: 'short' });
          }

          function updateTimeDisplay() {
            timeFilter = Number(timeSlider.value);
            if (timeFilter === -1) {
              selectedTime.textContent = '';
              anyTimeLabel.style.display = 'block';
            } else {
              selectedTime.textContent = formatTime(timeFilter);
              anyTimeLabel.style.display = 'none';
            }
            updateVisualization();
          }

          timeSlider.addEventListener('input', updateTimeDisplay);
          updateTimeDisplay();
        })
        .catch((error) => {
          console.error('Error loading traffic data:', error);
        });

      function updateVisualization() {
        const filteredDepartureTrips =
          timeFilter === -1
            ? departuresByMinute.flat()
            : filterByMinute(departuresByMinute, timeFilter);
        const filteredArrivalTrips =
          timeFilter === -1
            ? arrivalsByMinute.flat()
            : filterByMinute(arrivalsByMinute, timeFilter);

        const filteredDepartures = d3.rollup(
          filteredDepartureTrips,
          (v) => v.length,
          (d) => d.start_station_id
        );
        const filteredArrivals = d3.rollup(
          filteredArrivalTrips,
          (v) => v.length,
          (d) => d.end_station_id
        );

        const filteredStations = stations.map((station) => {
          const id = station.short_name;
          station.departures = filteredDepartures.get(id) ?? 0;
          station.arrivals = filteredArrivals.get(id) ?? 0;
          station.totalTraffic = station.departures + station.arrivals;
          return station;
        });

        const radiusScale = d3
          .scaleSqrt()
          .domain([0, globalMaxTraffic])
          .range([5, 25]);

        const stationFlow = d3.scaleQuantize()
          .domain([0, 1])
          .range([0, 0.5, 1]);

        circles
          .data(filteredStations)
          .attr('r', (d) => radiusScale(d.totalTraffic))
          .style('--departure-ratio', (d) => {
            if (d.totalTraffic === 0) return 0;
            return stationFlow(d.departures / d.totalTraffic);
          })
          .each(function (d) {
            d3.select(this).selectAll('title').remove();
            d3.select(this)
              .append('title')
              .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
          });
      }
    })
    .catch((error) => {
      console.error('Error loading stations:', error);
    });
});
