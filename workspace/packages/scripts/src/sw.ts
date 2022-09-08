export type {};
declare const self: ServiceWorkerGlobalScope;
declare const clients: any;

// REF: https://web.dev/service-worker-lifecycle/
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  clients.claim();
});

self.addEventListener('fetch', (event) => {
  const resourceUrl = event.request.url;
  // TODO take id from document somehow

  let proxyUrl;
  if (resourceUrl.match('http://localhost:9000/api/v1/asset/') != null) {
    // If the request is already going to the right endpoint
    proxyUrl = resourceUrl;
  } else {
    proxyUrl = resourceUrl
      // eslint-disable-next-line  no-useless-concat
      .replace(/(https?:\/\/)(.*?)(\/.*)/g, '$1' + 'localhost:9000/api/v1/asset/get/1' + '$3')
      // TODO temp
      .replace('https://', 'http://');
  }

  const modifiedHeaders = new Headers(event.request.headers);
  const modifiedRequestInit = { headers: modifiedHeaders };
  const modifiedRequest = new Request(proxyUrl, {
    method: event.request.method,
    headers: event.request.headers,
  });

  event.respondWith(fetch(modifiedRequest));
});
