/* SoundTune - service worker */
var VER="soundtune-v5";
var CORE=["./","index.html","easy.html","app.js","easy.js","extras.js","lab.js","ring.js","manifest.webmanifest","icon.svg","icon-maskable.svg"];

self.addEventListener("install",function(e){
  e.waitUntil(
    caches.open(VER).then(function(c){
      return Promise.all(CORE.map(function(u){
        return c.add(new Request(u,{cache:"reload"}))["catch"](function(){});
      }));
    }).then(function(){ return self.skipWaiting() })
  );
});

self.addEventListener("activate",function(e){
  e.waitUntil(
    caches.keys().then(function(ks){
      return Promise.all(ks.map(function(k){ if(k!==VER) return caches["delete"](k) }));
    }).then(function(){ return self.clients.claim() })
  );
});

self.addEventListener("message",function(e){
  if(e.data==="skipWaiting") self.skipWaiting();
});

self.addEventListener("fetch",function(e){
  var req=e.request;
  if(req.method!=="GET") return;
  var url;
  try{ url=new URL(req.url) }catch(err){ return }
  if(url.origin!==self.location.origin) return;

  var fresh = req.mode==="navigate" || /\.(html|js|webmanifest)$/i.test(url.pathname);

  if(fresh){
    e.respondWith(
      fetch(req).then(function(r){
        var cp=r.clone();
        caches.open(VER).then(function(c){ c.put(req,cp) });
        return r;
      })["catch"](function(){
        return caches.match(req).then(function(m){
          return m || caches.match("index.html");
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
        caches.open(VER).then(function(c){ c.put(req,cp) });
        return r;
      });
    })
  );
});
