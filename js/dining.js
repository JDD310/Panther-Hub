/* =====================================================================
   dining.js — logic for dining.html
     ② Location cards with OPEN/CLOSED badge + live countdown
     ③ Favorite star (markup only for the MVP)
     ④ Weekly hours table built from data/dining.json
     ① Filter bar listeners are wired as placeholders (FINAL 02)
   Requires common.js to be loaded first.
   ===================================================================== */

let locations = [];

/* ---------- ② Location cards ---------- */

/**
 * Summarize today's meal blocks for one location, e.g.
 * "Breakfast 7:30 AM–10:00 AM · Lunch 11:00 AM–2:00 PM".
 * @param {object} location
 */
function todaySummary(location) {
  const blocks = location.hours[DAY_KEYS[new Date().getDay()]] || [];
  if (blocks.length === 0) return 'Closed today';
  return blocks.map((b) => `${b.meal} ${formatHHMM(b.open)}–${formatHHMM(b.close)}`).join(' · ');
}

/**
 * Build the HTML for one dining card (Bootstrap column + <article>).
 * @param {object} location
 */
function cardHTML(location) {
  // Show the photo if the JSON has one; otherwise a placeholder icon (photos arrive in FINAL 09)
  const photo = location.image
    ? `<img src="${escapeHTML(location.image)}" alt="${escapeHTML(location.alt)}">`
    : '<i class="bi bi-shop" aria-hidden="true"></i>';

  return `
    <div class="col-12 col-md-6 col-lg-4">
      <article class="card hub-card h-100" data-id="${escapeHTML(location.id)}">
        <div class="card-body d-flex flex-column gap-3">
          <div class="card-photo">${photo}</div>
          <div class="d-flex justify-content-between align-items-start gap-2">
            <div>
              <h2 class="h5 mb-1">${escapeHTML(location.name)}</h2>
              <p class="small text-body-secondary mb-0">${escapeHTML(location.kind)}</p>
            </div>
            <!-- Favorite star: behavior lands in FINAL 03 (PH-20) -->
            <button type="button" class="btn btn-outline-dark icon-btn fav-btn"
                    aria-label="Add ${escapeHTML(location.name)} to favorites" aria-pressed="false">
              <i class="bi bi-star" aria-hidden="true"></i>
            </button>
          </div>
          <!-- Status + countdown are filled by updateStatuses() so they can refresh every minute -->
          <div class="d-flex align-items-center flex-wrap gap-2">
            <span class="js-status"></span>
            <span class="countdown js-countdown"></span>
          </div>
          <p class="small text-body-secondary mb-0">Today: ${escapeHTML(todaySummary(location))}</p>
        </div>
      </article>
    </div>`;
}

/** Render every card from the loaded JSON. */
function renderCards() {
  document.getElementById('diningCards').innerHTML = locations.map(cardHTML).join('');
  updateStatuses();
}

/** Refresh each card's OPEN/CLOSED pill and countdown text. */
function updateStatuses() {
  const now = new Date();
  locations.forEach((loc) => {
    const card = document.querySelector(`article[data-id="${loc.id}"]`);
    if (!card) return;
    const change = nextChange(loc, now);
    card.querySelector('.js-status').innerHTML = statusPillHTML(change.open);
    card.querySelector('.js-countdown').textContent = change.text;
  });
}

/* ---------- ④ Weekly hours table ---------- */

// Monday-first order for the table columns
const WEEK_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const SHORT = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };

/**
 * Group consecutive days that share identical hours into one column,
 * e.g. Mon–Thu | Friday | Sat–Sun (matches the wireframe).
 * @param {object} location
 * @returns {{label: string, key: string}[]} key = first day in the group
 */
function groupDays(location) {
  const groups = [];
  WEEK_ORDER.forEach((day) => {
    const signature = JSON.stringify(location.hours[day] || []);
    const last = groups[groups.length - 1];
    if (last && last.signature === signature) {
      last.days.push(day);
    } else {
      groups.push({ signature, days: [day] });
    }
  });
  return groups.map((g) => ({
    key: g.days[0],
    label: g.days.length === 1
      ? DAY_NAMES[DAY_KEYS.indexOf(g.days[0])]
      : `${SHORT[g.days[0]]}–${SHORT[g.days[g.days.length - 1]]}`,
  }));
}

/**
 * Render the weekly hours table for one location.
 * Rows = meals, columns = day groups, "—" where there's no service.
 * @param {string} locationId
 */
function renderHoursTable(locationId) {
  const loc = locations.find((l) => l.id === locationId);
  if (!loc) return;

  const groups = groupDays(loc);

  // Collect every meal name this location ever serves, in first-seen order
  const meals = [];
  WEEK_ORDER.forEach((day) => (loc.hours[day] || []).forEach((b) => {
    if (!meals.includes(b.meal)) meals.push(b.meal);
  }));

  document.getElementById('hoursCaption').textContent = `${loc.name} — hours subject to change`;

  // Header row: <th scope="col"> for each day group
  document.getElementById('hoursHead').innerHTML = `
    <tr>
      <th scope="col">Meal</th>
      ${groups.map((g) => `<th scope="col">${g.label}</th>`).join('')}
    </tr>`;

  // Body rows: <th scope="row"> for each meal
  document.getElementById('hoursBody').innerHTML = meals
    .map((meal) => {
      const cells = groups.map((g) => {
        const block = (loc.hours[g.key] || []).find((b) => b.meal === meal);
        return `<td>${block ? `${formatHHMM(block.open)}–${formatHHMM(block.close)}` : '—'}</td>`;
      });
      return `<tr><th scope="row">${escapeHTML(meal)}</th>${cells.join('')}</tr>`;
    })
    .join('');
}

/** Fill the location <select> and re-render the table when it changes. */
function initHoursSelector() {
  const select = document.getElementById('hoursLocation');
  select.innerHTML = locations
    .map((l) => `<option value="${escapeHTML(l.id)}">${escapeHTML(l.name)}</option>`)
    .join('');
  // change event → rebuild the table for the chosen location
  select.addEventListener('change', (event) => renderHoursTable(event.target.value));
  renderHoursTable(select.value);
}

/* ---------- ① Filter bar (placeholder) ---------- */

/**
 * Listen to the filter controls now so the page is event-driven.
 * Actual filtering (search + meal + open-now combined) is FINAL 02 (PH-19).
 */
function initFilterPlaceholders() {
  const note = document.getElementById('filterNote');
  const showComingSoon = () => {
    note.textContent = 'Filtering is coming in the next release — all locations are shown for now.';
  };
  document.getElementById('diningSearch').addEventListener('input', showComingSoon);
  document.getElementById('mealFilter').addEventListener('change', showComingSoon);
  document.getElementById('openNow').addEventListener('change', showComingSoon);
  // Stop the form from reloading the page if someone presses Enter in the search box
  document.getElementById('diningFilters').addEventListener('submit', (event) => event.preventDefault());
}

/* ---------- Start ---------- */

/** Load dining.json, then build the cards, table, and timers. */
async function initDining() {
  initFilterPlaceholders();
  try {
    const data = await fetchJSON('data/dining.json');
    locations = data.locations;
    if (data.lastVerified) {
      document.getElementById('lastVerified').textContent = `Last verified ${data.lastVerified}.`;
    }
    renderCards();
    initHoursSelector();
    setInterval(updateStatuses, 60 * 1000); // countdowns refresh every minute
  } catch (err) {
    console.error('Could not load dining.json:', err);
    document.getElementById('diningCards').innerHTML =
      '<p class="text-body-secondary">Dining hours are unavailable right now. Please try again later.</p>';
    document.getElementById('hoursCaption').textContent = 'Hours unavailable';
  }
}

document.addEventListener('DOMContentLoaded', initDining);
