/*
 * The app's one and only service worker.
 *
 * It has to stay the only one registered at "/". Registering a second script
 * at the same scope replaces this one, and a worker with no push handler
 * accepts every background message and silently shows nothing — which is
 * exactly what happened while a separate caching worker lived at /sw.js.
 *
 * Runs outside the Next.js bundle, so it cannot read env vars. These are the
 * same NEXT_PUBLIC_FIREBASE_* values already visible in the browser, written
 * out plainly instead.
 */
importScripts("https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCUg_n49HXFgK7cgplbr2dz4q4tTorVjzY",
  authDomain: "credarc-visiting-system.firebaseapp.com",
  databaseURL: "https://credarc-visiting-system-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "credarc-visiting-system",
  storageBucket: "credarc-visiting-system.firebasestorage.app",
  messagingSenderId: "17330801437",
  appId: "1:17330801437:web:ab4b3f18ca371c7fb56ff4",
});

/*
 * Installs the SDK's own push and notificationclick handlers, and nothing
 * else deliberately: every message this app sends carries a notification
 * payload, which the SDK displays by itself. Calling showNotification here
 * as well would deliver two notifications for one visitor, and iOS drops a
 * push subscription whose worker takes a push without displaying anything.
 * Where the tap leads is set server-side, via webpush.fcmOptions.link.
 */
firebase.messaging();

self.addEventListener("install", () => {
  // Take over straight away rather than waiting for every tab to close.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// A fetch handler is required for installability. Caches nothing on purpose:
// serving a stale shell or a stale visitor list to a realtime app is worse
// than having no offline support at all.
self.addEventListener("fetch", () => {});
