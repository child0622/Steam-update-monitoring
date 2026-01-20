export const notificationService = {
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      alert("This browser does not support desktop notification");
      return 'denied';
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      this.registerServiceWorker();
    }
    return permission;
  },

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('Service Worker Registered', reg))
        .catch(err => console.error('Service Worker Registration Failed', err));
    }
  },

  showNotification(title: string, options?: NotificationOptions) {
    if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, options);
      });
    }
  }
};
