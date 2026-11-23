/* =====================================================================
   dashboard.js — logic for index.html
     ① Greeting + live clock          (setInterval, every second)
     ② Weather card + 5-day forecast  (Open-Meteo API, fetch + async/await)
     ③ Dining right now               (data/dining.json + common.js hours logic)
     ④ My saved spots                 (localStorage — empty state for the MVP)
   Requires common.js to be loaded first.
   ===================================================================== */

/* ---------- Config ---------- */

// Campus center used for the weather request (approximate — confirm per PH-6)
const CAMPUS = { lat: 33.04, lng: -85.03 };

// Open-Meteo forecast endpoint: Fahrenheit, local timezone (required for daily values), 5 days
const WEATHER_URL =
  'https://api.open-meteo.com/v1/forecast' +
  `?latitude=${CAMPUS.lat}&longitude=${CAMPUS.lng}` +
  '&current=temperature_2m,weather_code' +
  '&daily=temperature_2m_max,temperature_2m_min,weather_code' +
  '&temperature_unit=fahrenheit&timezone=America/New_York&forecast_days=5';

/**
 * WMO weather_code → label + Bootstrap Icon class.
 * Open-Meteo returns a number, so this lookup turns it into something readable.
 */
const WEATHER_CODES = {
  0: { label: 'Clear', icon: 'bi-sun' },
  1: { label: 'Mostly clear', icon: 'bi-cloud-sun' },
  2: { label: 'Partly cloudy', icon: 'bi-cloud-sun' },
  3: { label: 'Overcast', icon: 'bi-clouds' },
  45: { label: 'Fog', icon: 'bi-cloud-fog2' },
  48: { label: 'Freezing fog', icon: 'bi-cloud-fog2' },
  51: { label: 'Light drizzle', icon: 'bi-cloud-drizzle' },
  53: { label: 'Drizzle', icon: 'bi-cloud-drizzle' },
  55: { label: 'Heavy drizzle', icon: 'bi-cloud-drizzle' },
  56: { label: 'Freezing drizzle', icon: 'bi-cloud-sleet' },
  57: { label: 'Freezing drizzle', icon: 'bi-cloud-sleet' },
  61: { label: 'Light rain', icon: 'bi-cloud-rain' },
  63: { label: 'Rain', icon: 'bi-cloud-rain' },
  65: { label: 'Heavy rain', icon: 'bi-cloud-rain-heavy' },
  66: { label: 'Freezing rain', icon: 'bi-cloud-sleet' },
  67: { label: 'Freezing rain', icon: 'bi-cloud-sleet' },
  71: { label: 'Light snow', icon: 'bi-cloud-snow' },
  73: { label: 'Snow', icon: 'bi-cloud-snow' },
  75: { label: 'Heavy snow', icon: 'bi-snow' },
  77: { label: 'Snow grains', icon: 'bi-snow' },
  80: { label: 'Light showers', icon: 'bi-cloud-drizzle' },
  81: { label: 'Showers', icon: 'bi-cloud-rain' },
  82: { label: 'Heavy showers', icon: 'bi-cloud-rain-heavy' },
  95: { label: 'Thunderstorm', icon: 'bi-cloud-lightning-rain' },
  96: { label: 'Thunderstorm with hail', icon: 'bi-cloud-hail' },
  99: { label: 'Thunderstorm with hail', icon: 'bi-cloud-hail' },
};

/**
 * Look up a weather code, falling back to a generic label for unknown codes.
 * @param {number} code
 */
function describeWeather(code) {
  return WEATHER_CODES[code] || { label: 'Weather', icon: 'bi-cloud' };
}

/* ---------- ① Greeting + live clock ---------- */

/**
 * Pick a greeting for the hour of day.
 * @param {number} hour - 0–23
 */
function greetingFor(hour) {
  if (hour < 12) return 'Good morning, Panther';
  if (hour < 17) return 'Good afternoon, Panther';
  return 'Good evening, Panther';
}

/** Update the greeting, date line, and clock from the current time. */
function renderClock() {
  const now = new Date();
  document.getElementById('greeting').textContent = greetingFor(now.getHours());
  document.getElementById('today').textContent = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  document.getElementById('clock').textContent = now.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', second: '2-digit',
  });
}

/** Start the clock: render now, then every second (event-driven timer). */
function startClock() {
  renderClock();
  setInterval(renderClock, 1000);
}

/* ---------- ② Weather (Open-Meteo API) ---------- */

/** Show the loading state while the request is in flight. */
function showWeatherLoading() {
  document.getElementById('weatherBody').innerHTML =
    '<p class="text-body-secondary mb-0"><span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Loading weather…</p>';
  document.getElementById('forecast').innerHTML = '';
}

/** Show a friendly error with a Retry button — never a blank card. */
function showWeatherError() {
  document.getElementById('weatherBody').innerHTML = `
    <div class="d-flex flex-column align-items-start gap-2">
      <p class="mb-0"><i class="bi bi-exclamation-triangle me-1" aria-hidden="true"></i>Weather unavailable right now.</p>
      <button type="button" id="weatherRetry" class="btn btn-outline-dark btn-sm">Retry</button>
    </div>`;
  // Retry click → run the request again
  document.getElementById('weatherRetry').addEventListener('click', loadWeather);
}

/**
 * Render current conditions + the 5-day strip from an Open-Meteo response.
 * @param {object} data - parsed JSON from WEATHER_URL
 */
function renderWeather(data) {
  const current = describeWeather(data.current.weather_code);
  const temp = Math.round(data.current.temperature_2m);
  const high = Math.round(data.daily.temperature_2m_max[0]);
  const low = Math.round(data.daily.temperature_2m_min[0]);

  document.getElementById('weatherBody').innerHTML = `
    <div class="weather-now">
      <i class="bi ${current.icon} weather-icon" aria-hidden="true"></i>
      <div>
        <p class="weather-temp mb-1">${temp}°F</p>
        <p class="text-body-secondary mb-0">${current.label} · H ${high}° / L ${low}°</p>
      </div>
    </div>`;

  // One tile per day; the date strings are "YYYY-MM-DD", so add T12:00 to avoid timezone shifts
  document.getElementById('forecast').innerHTML = data.daily.time
    .map((dateStr, i) => {
      const day = new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' });
      const info = describeWeather(data.daily.weather_code[i]);
      const hi = Math.round(data.daily.temperature_2m_max[i]);
      const lo = Math.round(data.daily.temperature_2m_min[i]);
      return `
        <li>
          <span class="fw-semibold">${day}</span>
          <i class="bi ${info.icon}" aria-hidden="true"></i>
          <span class="visually-hidden">${info.label},</span>
          <span class="text-body-secondary">${hi}°/${lo}°</span>
        </li>`;
    })
    .join('');
}

/**
 * API CALL: fetch the forecast from Open-Meteo (free, no API key).
 * Shows loading first, then data, or the error state if the request fails.
 */
async function loadWeather() {
  showWeatherLoading();
  try {
    const data = await fetchJSON(WEATHER_URL);
    renderWeather(data);
  } catch (err) {
    console.error('Weather request failed:', err);
    showWeatherError();
  }
}

/* ---------- ③ Dining right now ---------- */

let diningLocations = [];

/** Render one row per dining location with its status pill and next change. */
function renderDiningNow() {
  const now = new Date();
  document.getElementById('diningNow').innerHTML = diningLocations
    .map((loc) => {
      const change = nextChange(loc, now);
      return `
        <li class="dining-row">
          <div>
            <p class="fw-semibold mb-0">${escapeHTML(loc.name)}</p>
            <p class="small text-body-secondary mb-0">${escapeHTML(change.text)}</p>
          </div>
          ${statusPillHTML(change.open)}
        </li>`;
    })
    .join('');
}

/** Load dining.json, render, and refresh the status lines once a minute. */
async function loadDiningNow() {
  try {
    const data = await fetchJSON('data/dining.json');
    diningLocations = data.locations;
    renderDiningNow();
    setInterval(renderDiningNow, 60 * 1000);
  } catch (err) {
    console.error('Could not load dining hours:', err);
    document.getElementById('diningNow').innerHTML =
      '<li class="text-body-secondary">Dining hours are unavailable right now.</li>';
  }
}

/* ---------- ④ My saved spots ---------- */

/**
 * Show saved spots from localStorage, or the empty state.
 * Spots get saved from the map in FINAL 05; this card is finished in FINAL 06 (PH-23).
 */
function renderSavedSpots() {
  const saved = loadJSON('ph-saved-spots', []);
  const list = document.getElementById('savedSpots');
  if (saved.length === 0) {
    list.innerHTML = '<li class="saved-empty">No saved spots yet — star a place on the Campus Map.</li>';
    return;
  }
  list.innerHTML = saved.map((spot) => `<li class="saved-empty">${escapeHTML(spot.name)}</li>`).join('');
}

/* ---------- Start everything once the page is ready ---------- */
document.addEventListener('DOMContentLoaded', () => {
  startClock();
  loadWeather();
  loadDiningNow();
  renderSavedSpots();
});
