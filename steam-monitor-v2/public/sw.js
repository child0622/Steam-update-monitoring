self.addEventListener('notificationclick', event => {
  event.notification.close();

  // 确保处理点击事件，即使不带 data 属性
  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });

      // 1. 尝试找到已经打开的窗口并聚焦
      for (const client of allClients) {
        // 匹配当前作用域下的任何窗口
        // 使用 url 匹配或者简单的作用域检查
        if (client.url.startsWith(self.registration.scope)) {
          // 如果窗口可见，直接聚焦
          if ('focus' in client) {
             return client.focus();
          }
        }
      }

      // 2. 如果没有打开的窗口，则打开新窗口
      if (clients.openWindow) {
        return clients.openWindow(self.registration.scope);
      }
    })()
  );
});
