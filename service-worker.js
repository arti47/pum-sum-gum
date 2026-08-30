// Mixed strategy per template §5: the app shell and data files are cache-first against a
// versioned cache; navigation requests are network-first so a stale shell never outlives a
// deploy. Bump CACHE_VERSION on ANY shipped-file change.
const CACHE_VERSION = "um-v34";

const APP_SHELL = [
  "./",
  "./index.html",
  "./tutorial.html",
  "./tutorial.pdf",
  "./styles.css",
  "./manifest.json",
  "./icon.svg",
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
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(APP_SHELL)));
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
      fetch(req)
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

  // Everything else: cache-first against the versioned cache.
  e.respondWith(
    caches.match(req).then((hit) =>
      hit ||
      fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
    )
  );
});
