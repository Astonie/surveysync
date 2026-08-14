import {
  Serwist,
  CacheFirst,
  NetworkFirst,
  StaleWhileRevalidate,
  ExpirationPlugin,
  type PrecacheEntry,
} from "serwist";

declare global {
  var __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
}

const runtimeCaching = [
  {
    matcher: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
    handler: new CacheFirst({
      cacheName: "google-fonts-webfonts",
      plugins: [new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 })],
    }),
  },
  {
    matcher: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
    handler: new StaleWhileRevalidate({
      cacheName: "google-fonts-stylesheets",
      plugins: [new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 7 * 24 * 60 * 60 })],
    }),
  },
  {
    matcher: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
    handler: new CacheFirst({
      cacheName: "static-image-assets",
      plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 })],
    }),
  },
  {
    matcher: /\/_next\/static.+\.js$/i,
    handler: new CacheFirst({
      cacheName: "next-static-js-assets",
      plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 })],
    }),
  },
  {
    matcher: /\/_next\/data\/.+\/.+\.json$/i,
    handler: new NetworkFirst({
      cacheName: "next-data",
      plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 })],
      networkTimeoutSeconds: 3,
    }),
  },
  {
    matcher: ({ url }: { url: URL }) => {
      const isSameOrigin = self.origin === url.origin;
      if (!isSameOrigin) return false;
      if (url.pathname.startsWith("/api/auth/")) return false;
      if (url.pathname.startsWith("/api/")) return true;
      return false;
    },
    handler: new NetworkFirst({
      cacheName: "apis",
      plugins: [new ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 24 * 60 * 60 })],
      networkTimeoutSeconds: 3,
    }),
  },
  {
    matcher: ({ url }: { url: URL }) => self.origin === url.origin,
    handler: new NetworkFirst({
      cacheName: "others",
      plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 })],
      networkTimeoutSeconds: 3,
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: [...(self.__SW_MANIFEST ?? []), "/offline"],
  precacheOptions: {
    navigateFallback: "/offline",
  },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
});

serwist.addEventListeners();

const SyncSelf = self as unknown as {
  addEventListener(type: "sync", listener: (event: { tag: string; waitUntil(task: Promise<unknown>): void }) => void): void;
};

interface SyncQueueRecord {
  id: number;
  entityType: string;
  entityId: string;
  action: string;
  payload: string;
  createdAt: string;
  attempts: number;
}

const DB_NAME = "survey-sync";
const STORE_NAME = "syncQueue";

function readSyncQueue(): Promise<SyncQueueRecord[]> {
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onsuccess = () => {
      const tx = request.result.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const getRequest = store.getAll();
      getRequest.onsuccess = () => resolve(getRequest.result ?? []);
      getRequest.onerror = () => resolve([]);
    };
    request.onerror = () => resolve([]);
  });
}

function deleteSyncItem(id: number): Promise<void> {
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onsuccess = () => {
      const tx = request.result.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve();
    };
    request.onerror = () => resolve();
  });
}

async function replaySyncQueue() {
  const items = await readSyncQueue();
  if (items.length === 0) return;

  const res = await fetch("/api/sync/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });

  if (!res.ok) throw new Error("Sync failed");
  const data = (await res.json()) as { syncedIds?: number[] };
  const syncedIds = data.syncedIds ?? items.filter((i) => i.entityType !== "response").map((i) => i.id);

  for (const id of syncedIds) {
    await deleteSyncItem(id);
  }
}

SyncSelf.addEventListener("sync", (event) => {
  if (event.tag === "survey-sync:responses") {
    event.waitUntil(replaySyncQueue());
  }
});
