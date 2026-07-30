/* SoundTune - service worker (chay offline) */
var VER='soundtune-v3';
var CORE=[
  './',
  './index.html',
  './easy.html',
  './app.js',
  './easy.js',
  './extras.js',
  './manifest.webmanifest',
  './icon.svg',
  './icon-maskable.svg'
];

self.addEventListener('install',function(e){
  e.waitUntil(
    caches.open(VER).then(function(c){
      return Promise.all(CORE.map(function(u){
        return c.add(new Request(u,{cache:'reload'})).catch(function(){});
      }));
    }).then(function(){return self.skipWaiting()})
  );
});

self.addEventListener('activate',function(e){
  e.waitUntil(
    caches.keys().then(function(ks){
      return Promise.all(ks.map(function(k){ if(k!==VER) return caches.delete(k) }));
    }).then(function(){return self.clients.claim()})
  );
});

self.addEventListener('message',function(e){
  if(e.data==='skipWaiting') self.skipWaiting();
});

/* HTML va JS: uu tien mang (de luon nhan ban moi nhat), khong co mang thi lay cache.
   Cac file khac: uu tien cache cho nhanh. */
self.addEventListener('fetch',function(e){
  var req=e.request;
  if(req.method!=='GET') return;
  var url=new URL(req.url);
  if(url.origin!==self.location.origin) return;

  var fresh = req.mode==='navigate' || /\.(html|js|webmanifest)$/.test(url.pathname);

  if(fresh){
    e.respondWith(
      fetch(req).then(function(r){
        var cp=r.clone();
        caches.open(VER).then(function(c){c.put(req,cp)});
        return r;
      }).catch(function(){
        return caches.match(req).then(function(m){
          return m || caches.match('./easy.html') || caches.match('./index.html');
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function(m){
      if(m) return m;
      return fetch(req).then(function(r){
        var cp=r.clone();
        caches.open(VER).then(function(c){c.put(req,cp)});
        return r;
      });
    })
  );
});
