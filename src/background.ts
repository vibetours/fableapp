export function log(...msg: Array<String>) {
  console.log(...msg);
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'popup-1') {
    port.onMessage.addListener((msg) => {
      switch (msg.type) {
        case 'record':
          port.postMessage({ status: 'started' });
          setTimeout(() => {
            port.postMessage({ status: 'finished' });
          }, 5000);
          break;

        default:
          break;
      }
    });
  } else {
    log('port is something else');
  }
});

log('hello world');
