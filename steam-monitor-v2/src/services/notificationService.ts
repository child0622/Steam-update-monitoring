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

    // 强制优先使用 Service Worker，因为它能在后台唤醒系统通知
    // 即使在前台，为了统一行为，也尽量使用 SW
    if ('serviceWorker' in navigator) {
        try {
            // 尝试获取或等待 SW 就绪
            // 这里我们不再设置短超时，而是相信 SW 会就绪，或者如果它没安装，下面会捕获异常
            // 自动更新是在 App.tsx 启动后很久发生的，SW 理论上早就激活了
            const swRegistration = await navigator.serviceWorker.ready;
            
            if (swRegistration) {
                console.log('Using Service Worker for system notification:', title);
                await swRegistration.showNotification(title, options);
                return; // 成功发送，直接返回
            }
        } catch (e) {
            console.warn('Service Worker notification attempt failed:', e);
            // 继续向下执行降级方案
        }
    }

    // 降级方案：使用普通 Notification API
    // 注意：在 Chrome 等浏览器中，如果页面不可见（后台），new Notification 可能会被静默失败或抛出异常
    console.log('Falling back to standard Notification API');
    try {
        const n = new Notification(title, options);
        n.onclick = (event) => {
            event.preventDefault(); 
            window.focus();
            n.close();
        };
    } catch (e) {
        console.error('Standard Notification API failed:', e);
    }
  }
};
