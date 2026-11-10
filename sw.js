const V='osd-v1';
const PRE=['./','./index.html','https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js','https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600&display=swap'];
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(V).then(function(c){
    return Promise.all(PRE.map(function(u){
      var ext=u.indexOf('http')===0;
      return c.add(new Request(u,{mode:ext?'no-cors':'same-origin'})).catch(function(){});
    }));
  }).then(function(){return self.skipWaiting();}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(k){
    return Promise.all(k.filter(function(x){return x!==V;}).map(function(x){return caches.delete(x);}));
  }).then(function(){return self.clients.claim();}));
});
self.addEventListener('fetch',function(e){
  var r=e.request;
  if(r.method!=='GET')return;
  var same=new URL(r.url).origin===self.location.origin;
  if(same){
    e.respondWith(fetch(r).then(function(res){
      var cp=res.clone();caches.open(V).then(function(c){c.put(r,cp);});return res;
    }).catch(function(){
      return caches.match(r,{ignoreSearch:true}).then(function(m){return m||caches.match('./index.html');});
    }));
  }else{
    e.respondWith(caches.match(r).then(function(m){
      return m||fetch(r).then(function(res){
        var cp=res.clone();caches.open(V).then(function(c){c.put(r,cp);});return res;
      });
    }));
  }
});
