export type {};
declare const self: ServiceWorkerGlobalScope;
declare const clients: any;

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT as string;
const API_HOST = new URL(API_ENDPOINT).hostname;

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
  if (resourceUrl.match(`${API_ENDPOINT}/api/v1/asset/`) != null) {
    // If the request is already going to the right endpoint
    proxyUrl = resourceUrl;
  } else {
    proxyUrl = resourceUrl
      // eslint-disable-next-line  no-useless-concat
      .replace(/(https?:\/\/)(.*?)(\/.*)/g, '$1' + `${API_HOST}/api/v1/asset/get/1` + '$3');
    // TODO temp
    // .replace('https://', 'http://');
  }

  event.respondWith(
    (async () => {
      const modifiedHeaders = new Headers(event.request.headers);
      const modifiedRequestInit = { headers: modifiedHeaders };

      let modifiedRequest;
      if (!(event.request.method.toLowerCase() === 'get' || event.request.method.toLowerCase() === 'head')) {
        const bodyTxt = await event.request.text();
        modifiedRequest = new (Request as any)(proxyUrl, {
          method: event.request.method,
          headers: event.request.headers,
          body: bodyTxt,
        });
      } else {
        modifiedRequest = new Request(proxyUrl, {
          method: event.request.method,
          headers: event.request.headers,
        });
      }

      return fetch(modifiedRequest);
    })()
  );

  // event.respondWith(fetch(modifiedRequest));
});
