// public/sw.js

self.addEventListener('push', function(event) {
  console.log("Push Notification Received in Browser!", event.data ? event.data.text() : "No data");
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.message,
      icon: '/favicon.ico', // Application icon for notification
      badge: '/favicon.ico',
      vibrate: [200, 100, 200],
      data: {
        url: data.url || 'https://unifiedmanagementsystemathukoralagroup.vercel.app/' // Target URL to open on notification click
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
