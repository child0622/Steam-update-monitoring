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

  async showNotification(title: string, options?: NotificationOptions) {
    if (Notification.permission !== 'granted') {
       console.warn('Notification permission not granted');
       return;
    }

    try {
      // 优先尝试 Service Worker (支持点击聚焦)
      if ('serviceWorker' in navigator) {
        // 设置 1 秒超时，防止 SW 未就绪导致通知不弹出
        const swRegistration = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise<ServiceWorkerRegistration | null>(resolve => setTimeout(() => resolve(null), 1000))
        ]);

        if (swRegistration) {
            swRegistration.showNotification(title, options);
            return;
        }
      }
    } catch (e) {
      console.error('Service Worker notification failed:', e);
    }

    // 降级方案：使用普通 Notification API (可能无法聚焦窗口)
    console.log('Falling back to standard Notification API');
    const n = new Notification(title, options);
    n.onclick = () => {
        window.focus();
        n.close();
    };
  }
};
