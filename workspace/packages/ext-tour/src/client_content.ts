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
  const screensData: FrameDataToBeProcessed[][] = [];

  chrome.runtime.sendMessage({ type: Msg.CLIENT_CONTENT_INIT });

  chrome.runtime.onMessage.addListener(async (message) => {
    switch (message.type) {
      case Msg.SAVE_TOUR_DATA: {
        const dataDiv = createExchangeDataDiv(screensData);
        document.body.appendChild(dataDiv);
        break;
      }

      case Msg.SAVE_SCREENS_DATA_IN_EXCHANGE_DIV: {
        screensData.push(...message.data.screensData);
        break;
      }

      case Msg.SAVE_COOKIES_DATA_IN_EXCHANGE_DIV: {
        const cookiesDiv = createCookiesDiv(message.data.cookiesData);
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
