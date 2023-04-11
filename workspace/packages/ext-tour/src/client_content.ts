import { Msg } from "./msg";
import { FrameDataToBeProcessed } from "./types";

function createExchangeDataDiv(data: FrameDataToBeProcessed[][]) {
  const div = document.createElement("div");
  div.setAttribute("id", "exchange-data");
  div.textContent = JSON.stringify(data);
  return div;
}

function createCookiesDiv(data: FrameDataToBeProcessed[][]) {
  const div = document.createElement("div");
  div.setAttribute("id", "cookies-data");
  div.textContent = JSON.stringify(data);
  return div;
}

function init() {
  chrome.runtime.sendMessage({ type: Msg.CLIENT_CONTENT_INIT });

  chrome.runtime.onMessage.addListener(async (message) => {
    switch (message.type) {
      case Msg.SAVE_TOUR_DATA: {
        const dataDiv = createExchangeDataDiv(message.data.screensData);
        const cookiesDiv = createCookiesDiv(message.data.cookies);
        document.body.appendChild(dataDiv);
        document.body.appendChild(cookiesDiv);
        break;
      }
      default: {
        break;
      }
    }
  });
}

init();
