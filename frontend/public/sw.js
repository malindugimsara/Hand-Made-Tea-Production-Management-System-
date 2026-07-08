console.log("Service Worker Loaded...");

self.addEventListener("push", e => {
  const data = e.data.json();
  console.log("Push Received...");

  self.registration.showNotification(data.title, {
    body: data.body,
    icon: "/logo.png" // Oyage app eke icon link eka denna
  });
});