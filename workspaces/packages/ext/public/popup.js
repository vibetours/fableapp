const port = chrome.runtime.connect({ name: 'fable_ext_popup' });

const startBtn = document.getElementById('start-rec');
const stopBtn = document.getElementById('stop-rec');

function recStartedUI() {
  startBtn.style.display = 'none';
  stopBtn.style.display = 'block';
}

function recStoppedUI() {
  startBtn.style.display = 'block';
  stopBtn.style.display = 'none';
}

startBtn.addEventListener('click', () => {
  port.postMessage({ type: 'record' });
  recStartedUI();
});

stopBtn.addEventListener('click', () => {
  port.postMessage({ type: 'stop' });
  recStoppedUI();
});

port.postMessage({ type: 'query_status' });

port.onMessage.addListener(msg => {
  switch (msg.type) {
    case 'query_status':
      if (msg.payload.value === 'recording') {
        recStartedUI();
      } else {
        recStoppedUI();
      }
      break;

    default:
      break;
  }
});
