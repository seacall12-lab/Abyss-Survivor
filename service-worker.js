const CACHE_NAME = "abyss-survivor-v10.1.0";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./data.js",
  "./state.js",
  "./game.js",
  "./render.js",
  "./ui.js",
  "./main.js",
  "./manifest.json",
  "./icons/icon.svg"
];

self.addEventListener("install", function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS).catch(function () {
        return undefined;
      });
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.map(function (name) {
        return name === CACHE_NAME ? undefined : caches.delete(name);
      })).then(function () {
        return self.clients.claim();
      });
    })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(function () {
        return caches.match("./index.html");
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      return cached || fetch(event.request).then(function (response) {
        return response;
      });
    })
  );
});
