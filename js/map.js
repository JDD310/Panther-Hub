/* =====================================================================
   map.js — logic for map.html
     ③ Leaflet map with OpenStreetMap tiles + numbered markers (API #2)
     ② Results list of <button>s, kept in sync with the pins
     ④ Detail panel + Directions link for the selected place
     ① Search box + category chips: placeholder listeners (FINAL 04)
   Requires Leaflet (global L) and common.js to be loaded first.
   ===================================================================== */

let map;                     // the Leaflet map instance
let places = [];             // entries from data/locations.json
const markers = {};          // place id → Leaflet marker, so the list can open the right pin
let selectedId = null;

/* ---------- ③ Leaflet map ---------- */

/**
 * Build a numbered teardrop pin as a Leaflet divIcon (styled in styles.css).
 * @param {number} n - number shown in the pin (matches the list)
 * @param {boolean} active - filled style for the selected place
 */
function pinIcon(n, active) {
  return L.divIcon({
    className: '', // drop Leaflet's default white square
    html: `<div class="map-pin${active ? ' is-active' : ''}"><span>${n}</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],  // tip of the pin sits on the coordinate
    popupAnchor: [0, -30],
  });
}

/**
 * API CALL: create the map and load OpenStreetMap tiles (free, no key).
 * The attribution credit is required by the OSM tile usage policy.
 * @param {{lat:number,lng:number}} center
 */
function initMap(center) {
  map = L.map('map').setView([center.lat, center.lng], 16);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
}

/** Add one marker per place; clicking a marker selects that place. */
function addMarkers() {
  places.forEach((place, i) => {
    const marker = L.marker([place.lat, place.lng], {
      icon: pinIcon(i + 1, false),
      title: place.name,      // tooltip + accessible name for the marker
      alt: place.name,
    })
      .addTo(map)
      .bindPopup(`<strong>${escapeHTML(place.name)}</strong><br>${escapeHTML(place.category)}`);

    // click event on a pin → same selection flow as clicking the list
    marker.on('click', () => selectPlace(place.id, { fromMap: true }));
    markers[place.id] = marker;
  });

  // Zoom so every pin is visible
  const bounds = L.latLngBounds(places.map((p) => [p.lat, p.lng]));
  map.fitBounds(bounds, { padding: [40, 40] });
}

/* ---------- ② Results list ---------- */

/** Render the list of places as buttons (Tab + Enter reachable). */
function renderList() {
  document.getElementById('resultCount').textContent = places.length;
  document.getElementById('placeList').innerHTML = places
    .map((place, i) => `
      <li>
        <button type="button" class="place-btn" data-id="${escapeHTML(place.id)}">
          <span class="place-num" aria-hidden="true">${i + 1}</span>
          <span>
            <span class="d-block fw-semibold">${escapeHTML(place.name)}</span>
            <span class="d-block small text-body-secondary">${escapeHTML(place.category)}</span>
          </span>
        </button>
      </li>`)
    .join('');
}

/** One click listener on the whole list (event delegation) instead of one per button. */
function initListClicks() {
  document.getElementById('placeList').addEventListener('click', (event) => {
    const button = event.target.closest('.place-btn');
    if (button) selectPlace(button.dataset.id);
  });
}

/* ---------- ④ Selection + detail panel ---------- */

/**
 * Select a place: fly the map to it, open its popup, highlight its pin and
 * list item, and fill the detail panel. Keeps map, list, and panel in sync.
 * @param {string} id
 * @param {{fromMap?: boolean}} [options]
 */
function selectPlace(id, options = {}) {
  const index = places.findIndex((p) => p.id === id);
  if (index === -1) return;
  const place = places[index];

  // Un-highlight the previous pin, highlight the new one
  if (selectedId && markers[selectedId]) {
    const prevIndex = places.findIndex((p) => p.id === selectedId);
    markers[selectedId].setIcon(pinIcon(prevIndex + 1, false));
  }
  markers[id].setIcon(pinIcon(index + 1, true));
  selectedId = id;

  // Move the map (a pin click already has the map in view, so just open the popup)
  if (!options.fromMap) {
    map.flyTo([place.lat, place.lng], 17, { duration: 0.6 });
  }
  markers[id].openPopup();

  // Highlight the matching list button
  document.querySelectorAll('.place-btn').forEach((btn) => {
    if (btn.dataset.id === id) btn.setAttribute('aria-current', 'true');
    else btn.removeAttribute('aria-current');
  });

  renderDetail(place);
}

/**
 * Fill the detail panel for one place.
 * @param {object} place
 */
function renderDetail(place) {
  document.getElementById('detailName').textContent = place.name;
  document.getElementById('detailMeta').textContent = `${place.category} · ${place.area}`;
  document.getElementById('detailDesc').textContent = place.description;

  // Directions: open OpenStreetMap routing to this place's coordinates
  const directions = document.getElementById('directions');
  directions.href = `https://www.openstreetmap.org/directions?to=${place.lat}%2C${place.lng}`;
  directions.classList.remove('disabled');
  directions.removeAttribute('aria-disabled');

  // Save spot stays disabled until FINAL 05 (PH-22) adds localStorage saving
  document.getElementById('saveSpot').title = 'Saving spots is coming in the next release';
}

/* ---------- ① Search + chips (placeholder) ---------- */

/**
 * Chips already toggle their pressed state on click so the UI responds;
 * filtering the list and pins is FINAL 04 (PH-21).
 */
function initFilterPlaceholders() {
  const chips = document.getElementById('categoryChips');
  chips.addEventListener('click', (event) => {
    const chip = event.target.closest('.chip');
    if (!chip) return;
    chips.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    // TODO (PH-21): filter places by chip.dataset.category and hide non-matching pins
  });

  document.getElementById('placeSearch').addEventListener('input', () => {
    // TODO (PH-21): filter places by name/description as the user types
  });
}

/* ---------- Start ---------- */

/** Load locations.json, then build the map, pins, and list. */
async function initCampusMap() {
  initFilterPlaceholders();
  try {
    const data = await fetchJSON('data/locations.json');
    places = data.places;
    initMap(data.center);
    addMarkers();
    renderList();
    initListClicks();
  } catch (err) {
    console.error('Could not load the campus map:', err);
    document.getElementById('map').innerHTML =
      '<p class="p-3 mb-0">The campus map could not be loaded. Please try again later.</p>';
    document.getElementById('placeList').innerHTML =
      '<li class="text-body-secondary">Places are unavailable right now.</li>';
  }
}

document.addEventListener('DOMContentLoaded', initCampusMap);
