// public/sw.js

self.addEventListener('push', function(event) {
  console.log("Push Notification Received in Browser!", event.data ? event.data.text() : "No data");
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.message,
      icon: '/favicon.ico', // ඔයාගේ app icon එක දෙන්න
      badge: '/favicon.ico',
      vibrate: [200, 100, 200],
      data: {
        url: data.url || 'http://localhost:5173/' // Notification එක click කරාම යන්න ඕනේ URL එක
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});