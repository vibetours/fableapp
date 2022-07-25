const port = chrome.runtime.connect({ name: 'popup-1' });

document.getElementById('rec').addEventListener('click', () => {
  port.postMessage({ type: 'record' });
});

port.onMessage.addListener(msg => {
  switch (msg.status) {
    case 'started':
      document.getElementById('rec').innerText = 'Recording...';
      break;

    case 'finished':
      document.getElementById('rec').innerText = 'Record';
      break;

    default:
      break;
  }
});
