/// <reference lib="webworker" />
export {}; // Tells TypeScript this is an isolated module, fixing the 'self' redeclaration error

// Cast 'self' to the proper Service Worker scope to bypass DOM window rules
const sw = self as unknown as ServiceWorkerGlobalScope;

// 1. Listen for the incoming push from Vercel
sw.addEventListener("push", (event: any) => {
  // If the server didn't send a payload, provide a fallback
  const data = event.data?.json() ?? { 
    title: "CleanBuild Update", 
    body: "You have a new task assigned.",
    url: "/punch-list"
  };

  // Configure how the lock-screen alert looks
  const options = {
    body: data.body,
    icon: "/logo.png", // Uses the logo from your public folder
    badge: "/logo.png",
    vibrate: [200, 100, 200], // Buzzes the phone
    data: { url: data.url } // Remembers where to send the user if they tap it
  };

  // Paint the notification on the screen
  event.waitUntil(sw.registration.showNotification(data.title, options));
});

// 2. Listen for the user tapping the notification
sw.addEventListener("notificationclick", (event: any) => {
  event.notification.close(); // Dismiss the lock screen alert
  
  // Open the app to the specific page (like the punch list)
  const urlToOpen = event.notification.data?.url || "/";
  event.waitUntil(sw.clients.openWindow(urlToOpen));
});