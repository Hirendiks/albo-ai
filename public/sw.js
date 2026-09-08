self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    try {
      const reqUrl = new URL(event.request.url);
      const hasShare = reqUrl.searchParams.has("url") || reqUrl.searchParams.has("text") || reqUrl.searchParams.has("title");
      if (hasShare) {
        const sharedPayload = {
          type: "SHARED_TARGET",
          url: reqUrl.searchParams.get("url") || "",
          text: reqUrl.searchParams.get("text") || "",
          title: reqUrl.searchParams.get("title") || "",
        };

        // Notify all clients immediately
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
          for (const client of clients) {
            client.postMessage(sharedPayload);
          }
        });
      }
    } catch {}

    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request) || caches.match("/");
      })
    );
  }
});
