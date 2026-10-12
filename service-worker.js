// Network-first for everything, with the versioned cache as the offline fallback, so a
// deploy reaches an open or installed app on its next load. Bump CACHE_VERSION on ANY shipped-file change.
const CACHE_VERSION = "um-v67";

const APP_SHELL = [
  "./",
  "./index.html",
  "./tutorial.html",
  "./tutorial.pdf",
  "./styles.css",
  "./manifest.json",
  "./icon.svg",
  "./fonts/im-fell-english.woff2",
  "./data-pum-oracles.js",
  "./data-pum-plot.js",
  "./data-sum.js",
  "./data-gum.js",
  "./data-guidance.js",
  "./data-rules-library.js",
  "./data-tutorial.js",
  "./src/main.js",
  "./src/core.js",
  "./src/ui.js",
  "./src/feel.js",
  "./src/rules.js",
  "./src/derived.js",
  "./src/settings.js",
  "./src/store.js",
  "./src/roller.js",
  "./src/sheet.js",
  "./src/oracles.js",
  "./src/scene.js",
  "./src/cast.js",
  "./src/journal.js",
  "./src/wizard.js",
  "./src/screens.js",
  "./src/tutorial.js",
  "./src/router.js",
  "./src/viewstate.js",
  "./src/forge.js",
  "./src/glossary.js",
  "./src/coach.js",
  "./src/media.js",
  "./src/files.js",
];

// A new version takes over as soon as it has cached the shell. Before, it waited
// behind an "Update available" toast, and the toast reloaded before the new
// worker was active — so the old cache answered the reload and the app looked
// unchanged after every deploy (reported: "the interface still looks the same").
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "skip-waiting") self.skipWaiting();
  if (e.data === "version") {
    e.source && e.source.postMessage({ type: "version", version: CACHE_VERSION });
  }
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigation: network-first, cache fallback. The response is cached against
  // the URL that was actually requested — the app is two pages now (index.html
  // and tutorial.html), and caching every navigation as index.html would put
  // the guide's markup in the shell's slot and serve the wrong page offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req, { cache: "no-cache" })
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req)
          .then((r) => r || caches.match("./index.html"))
          .then((r) => r || caches.match("./")))
    );
    return;
  }

  // Everything else: network-first, the cache only when offline. Cache-first
  // kept serving the last version's files until the worker itself changed, so a
  // deploy reached nobody who already had the app open or installed.
  e.respondWith(
    // no-cache: revalidate with the server (a cheap 304 when nothing changed)
    // rather than taking the browser's own ten-minute HTTP cache.
    fetch(req, { cache: "no-cache" })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
