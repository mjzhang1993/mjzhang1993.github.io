// const cacheName = 'text';
// // 进入 service worker 安装事件
// self.addEventListener('install', function (event) {
//    console.log('herr');
//    event.waitUntil(
//       caches.open(cacheName) // 打开缓存
//          .then(cache => cache.addAll([
//             '/text.json', // 添加文件到缓存中
//             '/about.html'
//          ]))
//          .then(() => console.log('suce'))
//    )
// })
// // 监听 fetch 事件
// self.addEventListener('fetch', function (event) {
//    console.log(caches);
//    event.respondWith(
//       caches.match(event.request) // 检查传入请求的 url 是否在缓存中有与之匹配的项
//          .then(res => res || fetch(event.request)) // 有的话就将其返回，否则通过正常网络请求获取
//    )
// })

const SW_VERSION = '1.0.5';
self.addEventListener('install', function(event) {
   // 触发 activate 事件，告知 Service Worker 立即开始工作
   event.waitUntil(self.skipWaiting());
});

self.addEventListener('fetch', function(event) {
   event.respondWith(
      caches.match(event.request).then(res => {
         // 检查缓存中有就直接返回缓存
         if (res) {
            return res;
         }
         // 请求是一个流，只能使用一次，为了再次使用这里需要克隆
         const requestToCache = event.request.clone();

         // 针对缓存中没有存在资源这里重新请求一下
         return fetch(requestToCache).then(res => {
            // 请求返回的结果错误 则不缓存
            if (!res || res.status !== 200) {
               return res;
            }
            // 克隆响应
            const responseToCache = res.clone();

            // 打开缓存，将响应添加进去
            caches
               .open(SW_VERSION)
               .then(cache => cache.put(requestToCache, responseToCache));

            return res;
         });
      })
   );
});

self.addEventListener('activate', function(event) {
   console.log('sw.js 更新');
   event.waitUntil(
      self.clients
         .claim()
         .then(() => caches.keys())
         .then(cacheNames => {
            return Promise.all(
               cacheNames.map(cacheName => {
                  console.log(cacheName, SW_VERSION);
                  if (cacheName !== SW_VERSION) {
                     return caches.delete(cacheName);
                  }
               })
            );
         })
   );
});

// 接收通知并与之互动
self.addEventListener('push', function(event) {
   console.log('get push');
   console.log(event.data.text());
   var payload = event.data ? event.data.text() : 'no payload';
   var title = '测试通知！！';

   event.waitUntil(
      // 接收到通知后，显示
      self.registration.showNotification(title, {
         body: payload.msg,
         url: payload.url,
         icon: payload.icon
      })
   );
});

// 处理通知的点击事件
self.addEventListener('notificationclick', function(event) {
   console.log('notificationclick');
   event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
         for (var i = 0; i < clientList.length; i++) {
            var client = clientList[i];
            if (client.url == '/' && 'focus' in client) return client.focus();
         }
         if (clients.openWindow) {
            return clients.openWindow('http://localhost:3323');
         }
      })
   );
   event.notification.close();
});
