/* =====================================================================
   common.js — shared helpers loaded on every page (before the page script)
   Contents:
     1. Data loading (fetchJSON)
     2. localStorage helpers (loadJSON / saveJSON)
     3. Time formatting helpers
     4. Dining hours logic (isOpenNow / nextChange) — used by the
        Dashboard AND the Dining page so the rules live in one place
     5. Shared page setup (footer year, dark-mode placeholder)
   ===================================================================== */

/* ---------- 1. Data loading ---------- */

/**
 * Fetch a JSON file and return the parsed object.
 * Throws on network errors or non-2xx responses so callers can show an error state.
 * Note: fetch() of local files fails over file:// — use Live Server or `python3 -m http.server`.
 * @param {string} url - relative path (e.g. "data/dining.json") or full API URL
 * @returns {Promise<any>}
 */
async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }
  return response.json();
}

/* ---------- 2. localStorage helpers ----------
   Wrapped in try/catch because storage can be blocked (private mode, etc.).
   Used later for favorites, saved spots, and the theme preference. */

/**
 * Read a JSON value from localStorage.
 * @param {string} key
 * @param {any} fallback - returned when the key is missing or unreadable
 */
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (err) {
    return fallback;
  }
}

/**
 * Save a value to localStorage as JSON. Fails silently if storage is unavailable.
 * @param {string} key
 * @param {any} value
 */
function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    /* storage full or blocked — the app still works, it just won't remember */
  }
}

/* ---------- 3. Time formatting ---------- */

/** Day keys in the same order as Date.getDay() (0 = Sunday). Matches dining.json. */
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Turn a millisecond span into a short countdown string.
 * @param {number} ms
 * @returns {string} e.g. "2h 15m", "42m", "<1m"
 */
function formatCountdown(ms) {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60000));
  if (totalMinutes < 1) return '<1m';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

/**
 * Format a Date as a short clock time, e.g. "7:30 AM".
 * @param {Date} date
 */
function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/**
 * Format a "HH:MM" 24-hour string from the JSON as "7:30 AM".
 * @param {string} hhmm
 */
function formatHHMM(hhmm) {
  return formatTime(dateAt(new Date(), hhmm));
}

/* ---------- 4. Dining hours logic ----------
   Times are built as real Date objects (not string math) so comparisons
   work across midnight and day boundaries. */

/**
 * Build a Date on the same calendar day as `base` at the given "HH:MM" time.
 * @param {Date} base
 * @param {string} hhmm - 24-hour time, e.g. "17:30"
 */
function dateAt(base, hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

/**
 * Get a location's meal blocks for one calendar day as Date ranges, sorted by start.
 * A close time earlier than the open time (e.g. 20:00–01:00) rolls into the next day.
 * @param {object} location - one entry from dining.json "locations"
 * @param {Date} day - any time on the day you want
 * @returns {{meal: string, start: Date, end: Date}[]}
 */
function getBlocksForDay(location, day) {
  const blocks = location.hours[DAY_KEYS[day.getDay()]] || [];
  return blocks
    .map((b) => {
      const start = dateAt(day, b.open);
      const end = dateAt(day, b.close);
      if (end <= start) end.setDate(end.getDate() + 1); // overnight block
      return { meal: b.meal, start, end };
    })
    .sort((a, b) => a.start - b.start);
}

/**
 * Is the location open right now?
 * Checks yesterday's blocks too, in case one ran past midnight.
 * @param {object} location
 * @param {Date} [now=new Date()]
 * @returns {{open: boolean, block: ({meal:string,start:Date,end:Date}|null)}}
 */
function isOpenNow(location, now = new Date()) {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const candidates = [...getBlocksForDay(location, yesterday), ...getBlocksForDay(location, now)];
  const block = candidates.find((b) => now >= b.start && now < b.end) || null;
  return { open: block !== null, block };
}

/**
 * Describe the next open/close event for a location.
 * @param {object} location
 * @param {Date} [now=new Date()]
 * @returns {{open: boolean, at: (Date|null), ms: number, text: string}}
 *   text examples: "Lunch ends in 42m", "Dinner starts in 2h 15m",
 *                  "Opens tomorrow at 7:30 AM", "Opens Monday at 11:00 AM"
 */
function nextChange(location, now = new Date()) {
  const status = isOpenNow(location, now);

  // Currently open → count down to the end of this block
  if (status.open) {
    const ms = status.block.end - now;
    return { open: true, at: status.block.end, ms, text: `${status.block.meal} ends in ${formatCountdown(ms)}` };
  }

  // Closed → look ahead up to 7 days for the next block that starts after now
  for (let offset = 0; offset < 7; offset += 1) {
    const day = new Date(now);
    day.setDate(now.getDate() + offset);
    const upcoming = getBlocksForDay(location, day).find((b) => b.start > now);
    if (!upcoming) continue;

    const ms = upcoming.start - now;
    let text;
    if (offset === 0) {
      text = `${upcoming.meal} starts in ${formatCountdown(ms)}`;
    } else if (offset === 1) {
      text = `Opens tomorrow at ${formatTime(upcoming.start)}`;
    } else {
      text = `Opens ${DAY_NAMES[upcoming.start.getDay()]} at ${formatTime(upcoming.start)}`;
    }
    return { open: false, at: upcoming.start, ms, text };
  }

  return { open: false, at: null, ms: Infinity, text: 'No upcoming hours posted' };
}

/**
 * Build the HTML for an OPEN/CLOSED pill. Uses the word, not just a color.
 * @param {boolean} open
 */
function statusPillHTML(open) {
  return open
    ? '<span class="status-pill is-open">OPEN</span>'
    : '<span class="status-pill is-closed">CLOSED</span>';
}

/**
 * Escape text before inserting it with innerHTML (data comes from JSON files).
 * @param {string} str
 */
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

/* ---------- 5. Shared page setup ---------- */

/** Put the current year into every .js-year element in the footer. */
function setFooterYear() {
  document.querySelectorAll('.js-year').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
}

/**
 * Dark-mode toggle — PLACEHOLDER.
 * The click handler is attached now so the button is event-driven;
 * the real theme switch + saved preference is FINAL 07 (PH-24).
 */
function initThemeToggle() {
  const button = document.getElementById('themeToggle');
  if (!button) return;
  button.addEventListener('click', () => {
    // TODO (PH-24): flip <html data-bs-theme>, swap moon/sun icon, saveJSON('ph-theme', …)
    console.info('Dark mode is coming in the Final release.');
  });
}

// Run shared setup once the page's HTML has been parsed
document.addEventListener('DOMContentLoaded', () => {
  setFooterYear();
  initThemeToggle();
});
