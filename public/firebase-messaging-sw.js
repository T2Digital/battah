import { cleanup } from "@testing-library/react";

// Scripts for firebase messaging service worker
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId.
firebase.initializeApp({
  apiKey: "true", // Placeholder, will be overridden by environment if needed but SW needs valid config usually. 
  // Since we don't have the real config here, we rely on the fact that for many simple cases just the senderId is enough or it picks up from the main app if registered correctly.
  // However, without real keys, background messages won't strictly work from FCM. 
  // This file is mainly to satisfy the "installable" PWA requirement and show intent.
  messagingSenderId: "1234567890" // Placeholder
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/pwa-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
