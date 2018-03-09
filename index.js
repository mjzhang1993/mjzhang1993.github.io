const testVersion = 'xxx';

console.log('testVersion', testVersion);

window.onload = function() {
   let savedPrompt = null; // 用来保存 事件
   const btn = document.getElementById('btn');
   // 添加到主屏幕后响应
   window.addEventListener('beforeinstallprompt', function(e) {
      e.preventDefault();
      savedPrompt = e;
      return false;
   });
   btn.addEventListener('click', function() {
      if (savedPrompt) {
         console.log(savedPrompt);
         // 弹出选择框，代替浏览器默认动作
         savedPrompt.prompt();
         // 接收选择结果
         savedPrompt.userChoice.then(result => {
            console.log(result);
         });
      }
   });
   function runInActivated() {
      return fetch('/text.json')
         .then(res => res.json())
         .catch(err => console.log('error', err));
   }

   const details = document.getElementById('details');
   setTimeout(() => {
      fetch('/time.json')
         .then(res => res.json())
         .then(res => {
            details.innerHTML = details.innerHTML + JSON.stringify(res);
         });
   }, 1000);

   // 订阅通知
   let endpoint;
   let key;
   let authSecret;
   let vapidPublicKey =
      'BAyb_WgaR0L0pODaR7wWkxJi__tWbM1MPBymyRDFEGjtDCWeRYS9EF7yGoCHLdHJi6hikYdg4MuYaK0XoD0qnoY';

   // 一个将 VAPID 钥从 base64 字符串转换成 Uint8 数组的函数
   function urlBase64ToUint8Array(base64String) {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding)
         .replace(/\-/g, '+')
         .replace(/_/g, '/');
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
         outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
   }

   // 注册 serviceWorker
   if ('serviceWorker' in navigator) {
      navigator.serviceWorker
         .register('/sw.js')
         .then(registration => {
            console.log('successful', registration);
            // 查看是否已经存在订阅权限
            return registration.pushManager
               .getSubscription()
               .then(subscription => {
                  console.log(subscription);
                  if (subscription) {
                     return;
                  }
                  // 不存在就去申请一下
                  return registration.pushManager
                     .subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlBase64ToUint8Array(
                           vapidPublicKey
                        )
                     })
                     .then(subscription => {
                        // 申请成功后处理一下秘钥
                        let rawKey = subscription.getKey
                           ? subscription.getKey('p256dh')
                           : '';
                        key = rawKey
                           ? btoa(
                                String.fromCharCode.apply(
                                   null,
                                   new Uint8Array(rawKey)
                                )
                             )
                           : '';
                        var rawAuthSecret = subscription.getKey
                           ? subscription.getKey('auth')
                           : '';
                        authSecret = rawAuthSecret
                           ? btoa(
                                String.fromCharCode.apply(
                                   null,
                                   new Uint8Array(rawAuthSecret)
                                )
                             )
                           : '';
                        endpoint = subscription.endpoint;
                        // 将订阅信息传给服务器
                        return fetch('./register', {
                           method: 'post',
                           headers: new Headers({
                              'content-type': 'application/json'
                           }),
                           body: JSON.stringify({
                              endpoint: subscription.endpoint,
                              key: key,
                              authSecret: authSecret
                           })
                        });
                     });
               });
         })
         .then(() => runInActivated())
         .then(json => {
            details.innerHTML = json && json.text;
         })
         .catch(err => {
            throw err;
         });

      const app = document.getElementsByClassName('box')[0];

      app.addEventListener('click', runInActivated);
   }
};
