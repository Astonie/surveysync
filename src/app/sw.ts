import { Serwist, type PrecacheEntry } from "serwist";

declare global {
  // eslint-disable-next-line no-var
  var __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
}

const runtimeCaching = [
  {
    urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
    handler: "CacheFirst",
    options: {
      cacheName: "google-fonts-webfonts",
      expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 },
    },
  },
  {
    urlPattern: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "google-fonts-stylesheets",
      expiration: { maxEntries: 4, maxAgeSeconds: 7 * 24 * 60 * 60 },
    },
  },
  {
    urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
    handler: "CacheFirst",
    options: {
      cacheName: "static-image-assets",
      expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 },
    },
  },
  {
    urlPattern: /\/_next\/static.+\.js$/i,
    handler: "CacheFirst",
    options: {
      cacheName: "next-static-js-assets",
      expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 },
    },
  },
  {
    urlPattern: /\/_next\/data\/.+\/.+\.json$/i,
    handler: "NetworkFirst",
    options: {
      cacheName: "next-data",
      expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
      networkTimeoutSeconds: 3,
    },
  },
  {
    urlPattern: ({ url }: { url: URL }) => {
      const isSameOrigin = self.origin === url.origin;
      if (!isSameOrigin) return false;
      if (url.pathname.startsWith("/api/auth/")) return false;
      if (url.pathname.startsWith("/api/")) return true;
      return false;
    },
    handler: "NetworkFirst",
    options: {
      cacheName: "apis",
      expiration: { maxEntries: 16, maxAgeSeconds: 24 * 60 * 60 },
      networkTimeoutSeconds: 3,
    },
  },
  {
    urlPattern: ({ url }: { url: URL }) => self.origin === url.origin,
    handler: "NetworkFirst",
    options: {
      cacheName: "others",
      expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
      networkTimeoutSeconds: 3,
    },
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST as any,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: runtimeCaching as any,
});

serwist.addEventListeners();
