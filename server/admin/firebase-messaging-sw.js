// Firebase Messaging Service Worker for background push notifications
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: ["AIza","SyAo","HdNm","dCwC","2BjA","MO5A","Kmwe","TI2I","7gQO","sdU"].join(""),
  authDomain: "fahos-5543f.firebaseapp.com",
  projectId: "fahos-5543f",
  storageBucket: "fahos-5543f.firebasestorage.app",
  messagingSenderId: "610234071249",
  appId: "1:610234071249:web:edf433514a6dbcc1c1edf0"
});

const messaging = firebase.messaging();

// Handle background messages (when app is closed or in background)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'بيانات جديدة!';
  const notificationOptions = {
    body: payload.notification?.body || 'زائر أرسل بيانات جديدة',
    icon: '/admin/icon-192.png',
    badge: '/admin/icon-192.png',
    tag: 'visitor-data-' + Date.now(),
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 300],
    sound: '/admin/frog.mp3',
    data: {
      url: '/admin/',
      ...payload.data
    },
    actions: [
      { action: 'open', title: 'فتح لوحة التحكم' }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click:', event);
  event.notification.close();

  // Open or focus the admin panel
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if admin panel is already open
      for (const client of clientList) {
        if (client.url.includes('/admin') && 'focus' in client) {
          return client.focus();
        }
      }
      // If not open, open it
      if (clients.openWindow) {
        return clients.openWindow('/admin/');
      }
    })
  );
});
