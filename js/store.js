// Everything lives on the device (localStorage). No account, no network.

const KEY = "cg:v1";
const SKEY = "cg:settings";

const DEFAULT_DB = {
  games: [], // {id, date, pgn, userColor, white, black, result, reason, bot, plies, review}
  puzzles: [], // {id, fen, best, bestSan, bestCp, played, gameId, ply, solved}
  beaten: {}, // botId -> wins
  stats: { streak: 0, best: 0, solved: 0 },
  current: null, // in-progress game: {sans, bot, color}
};

const DEFAULT_SETTINGS = { sound: true, haptics: true, gauge: false, unlockAll: false };

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return structuredClone(fallback);
    return { ...structuredClone(fallback), ...JSON.parse(raw) };
  } catch {
    return structuredClone(fallback);
  }
}

export const db = read(KEY, DEFAULT_DB);
export const settings = read(SKEY, DEFAULT_SETTINGS);

let saveTimer = 0;
export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 50);
}
export function saveNow() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
    localStorage.setItem(SKEY, JSON.stringify(settings));
  } catch {
    /* storage full or unavailable */
  }
}
addEventListener("pagehide", saveNow);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") saveNow();
});

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function resetAll() {
  Object.assign(db, structuredClone(DEFAULT_DB));
  saveNow();
}

/** Ask the browser not to evict our data (and the offline cache) under storage pressure. */
export async function persist() {
  try {
    if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist();
  } catch {
    /* ignore */
  }
  return false;
}
