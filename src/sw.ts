/// <reference lib="webworker" />
import {
  precacheAndRoute,
  createHandlerBoundToURL,
  cleanupOutdatedCaches,
} from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { db } from "./data/db";
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Parameters<typeof precacheAndRoute>[0];
};
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(
  new NavigationRoute(createHandlerBoundToURL("index.html"), {
    denylist: [/^\/api\//, /^\/share-target/],
  }),
);
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting();
});
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    url.origin === self.location.origin &&
    url.pathname === "/share-target" &&
    event.request.method === "POST"
  ) {
    event.respondWith(
      (async () => {
        try {
          const form = await event.request.formData();
          const files = form
            .getAll("journals")
            .filter((f): f is File => f instanceof File);
          if (!files.length || files.length > 20)
            return Response.redirect(
              new URL("/?share-error=1", self.location.origin),
              303,
            );
          if (
            files.some(
              (f) =>
                f.size > 10 * 1024 * 1024 ||
                !f.size ||
                !/\.html?$/i.test(f.name),
            ) ||
            files.reduce((n, f) => n + f.size, 0) > 100 * 1024 * 1024
          )
            return Response.redirect(
              new URL("/?share-error=1", self.location.origin),
              303,
            );
          const records = await Promise.all(
            files.map(async (f) => ({
              id: crypto.randomUUID(),
              filename: f.name,
              bytes: new Uint8Array(await f.arrayBuffer()),
              createdAt: new Date().toISOString(),
            })),
          );
          await db.pending.bulkAdd(records);
          return Response.redirect(
            new URL("/?shared=1", self.location.origin),
            303,
          );
        } catch {
          return Response.redirect(
            new URL("/?share-error=1", self.location.origin),
            303,
          );
        }
      })(),
    );
  }
});
