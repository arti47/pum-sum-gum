// The file store — the one part of this app that is not a string.
//
// §1.1 chose `localStorage` only, and that decision still holds for the *record*:
// the campaign is JSON, small, human-readable and exportable in one paste. But a
// portrait, a battle map, a character-sheet PDF and a voice note are none of
// those things. localStorage is a ~5MB string store and base64 inflates a blob
// by a third, so one map would fill it and take the campaign down with it — a
// quota error on save is how a solo player loses a year of play.
//
// So files live in IndexedDB, as blobs, keyed by id; `umState` carries only
// their metadata (§4.3 `game.files`). That keeps the record exportable in one
// paste and the files out of its way, and it is why deleting a game has to
// delete its files too — nothing else points at them.
//
// Everything here degrades rather than throws. A private window with IndexedDB
// blocked, a browser that refuses the database, a quota refusal mid-write: each
// returns a value the caller can render, because "your files did not load" is a
// sentence the app can say and an exception is not.

const DB_NAME = "umMedia";
const DB_VERSION = 1;
const STORE = "files";

let dbPromise = null;
let unavailable = null;   // the reason, once we know it

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      unavailable = "This browser has no file storage available.";
      resolve(null);
      return;
    }
    let req;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (err) {
      unavailable = "File storage is blocked in this browser window.";
      resolve(null);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      unavailable = "File storage is blocked in this browser window.";
      resolve(null);
    };
    // A private window can leave the request hanging rather than erroring.
    setTimeout(() => {
      if (!unavailable && req.readyState !== "done") {
        unavailable = "File storage did not respond.";
        resolve(null);
      }
    }, 3000);
  });
  return dbPromise;
}

function tx(db, mode, fn) {
  return new Promise((resolve) => {
    let out;
    let t;
    try {
      t = db.transaction(STORE, mode);
    } catch {
      resolve(null);
      return;
    }
    const store = t.objectStore(STORE);
    try { out = fn(store); } catch { resolve(null); return; }
    t.oncomplete = () => resolve(out && out.result !== undefined ? out.result : out);
    t.onerror = () => resolve(null);
    t.onabort = () => resolve(null);
  });
}

export async function available() {
  const db = await openDb();
  return !!db;
}

// The sentence to show when it is not. Never a raw error.
export function unavailableReason() {
  return unavailable || "File storage is not available here.";
}

// --- reading and writing ----------------------------------------------------

export async function putFile(id, blob) {
  const db = await openDb();
  if (!db) return false;
  const ok = await tx(db, "readwrite", (s) => s.put({ id, blob }));
  return ok !== null;
}

export async function getBlob(id) {
  const db = await openDb();
  if (!db) return null;
  const rec = await tx(db, "readonly", (s) => s.get(id));
  return rec && rec.blob ? rec.blob : null;
}

export async function deleteFile(id) {
  const db = await openDb();
  if (!db) return false;
  revoke(id);
  await tx(db, "readwrite", (s) => s.delete(id));
  return true;
}

export async function storedIds() {
  const db = await openDb();
  if (!db) return [];
  const keys = await tx(db, "readonly", (s) => s.getAllKeys());
  return Array.isArray(keys) ? keys : [];
}

// A file the record no longer points at is rubbish, and rubbish in a quota-bound
// store is a future write that fails for no visible reason. Deleting a game, a
// cast member or a journal entry calls this with everything still referenced.
export async function sweep(referenced) {
  const keep = new Set(referenced);
  const ids = await storedIds();
  let removed = 0;
  for (const id of ids) {
    if (!keep.has(id)) { await deleteFile(id); removed += 1; }
  }
  return removed;
}

// --- object URLs ------------------------------------------------------------
// Rendering a blob means an object URL, and an object URL leaks until revoked.
// One per id, cached, revoked when the file goes or the screen is rebuilt.

const urls = new Map();

export async function objectUrl(id) {
  if (urls.has(id)) return urls.get(id);
  const blob = await getBlob(id);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urls.set(id, url);
  return url;
}

function revoke(id) {
  const url = urls.get(id);
  if (url) { URL.revokeObjectURL(url); urls.delete(id); }
}

export function revokeAll() {
  for (const id of [...urls.keys()]) revoke(id);
}

// --- size -------------------------------------------------------------------

export async function usage() {
  const db = await openDb();
  if (!db) return { ok: false, count: 0, bytes: 0 };
  const recs = await tx(db, "readonly", (s) => s.getAll());
  const list = Array.isArray(recs) ? recs : [];
  let bytes = 0;
  for (const r of list) bytes += (r.blob && r.blob.size) || 0;
  let quota = null;
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      quota = est && est.quota ? est.quota : null;
    }
  } catch { /* an estimate is a nicety, not a requirement */ }
  return { ok: true, count: list.length, bytes, quota };
}

// --- helpers the surfaces share ---------------------------------------------

export function fmtBytes(n) {
  if (!n) return "0 KB";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

// What form is this, in the app's own words rather than a MIME type? The form
// decides how it renders: an image shows, audio plays, everything else is a link
// you open. Deliberately not called `kind` — the harness reads every
// `kind: "..."` in src/ as a journal kind that needs a filter, and that guard is
// worth more than the nicer word.
export function formOf(type = "", name = "") {
  const t = String(type).toLowerCase();
  const n = String(name).toLowerCase();
  if (t.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|avif)$/.test(n)) return "image";
  if (t.startsWith("audio/") || /\.(mp3|m4a|ogg|wav|webm)$/.test(n)) return "audio";
  if (t === "application/pdf" || /\.pdf$/.test(n)) return "pdf";
  return "file";
}

// --- base64, for the export that carries files -------------------------------

export function blobToBase64(blob) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || "");
      resolve(s.slice(s.indexOf(",") + 1));
    };
    r.onerror = () => resolve(null);
    r.readAsDataURL(blob);
  });
}

export function base64ToBlob(b64, type) {
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: type || "application/octet-stream" });
  } catch {
    return null;
  }
}
