import { startTransaction } from "@sentry/browser";
import { init as sentryInit, sentryTxReport } from "@fable/common/dist/sentry";
import { Msg } from "./msg";
import { FrameDataToBeProcessed } from "./types";
import { BATCH_SIZE } from "./utils";

sentryInit("extension");

function createExchangeDataDiv(data: FrameDataToBeProcessed[][]) {
  const div = document.createElement("div");
  div.setAttribute("id", "exchange-data");
  div.textContent = JSON.stringify(data);
  div.style.display = "none";
  return div;
}

function createCookiesDiv(data: FrameDataToBeProcessed[][]) {
  const div = document.createElement("div");
  div.setAttribute("id", "cookies-data");
  div.textContent = JSON.stringify(data);
  div.style.display = "none";
  return div;
}

function createTotalScreensCountDiv(count: number) {
  const div = document.createElement("div");
  div.setAttribute("id", "total-screen-count");
  div.textContent = `${count}`;
  div.style.display = "none";
  return div;
}

function createOrUpdateNumberOfScreensReceivedCountDiv(count: number) {
  const div = document.getElementById("number-of-screens-received-count") || document.createElement("div");
  div.setAttribute("id", "number-of-screens-received-count");
  div.textContent = `${count}`;
  div.style.display = "none";
  return div;
}

function init() {
  const screensData: FrameDataToBeProcessed[][] = [];
  const transaction = startTransaction({ name: "dataTransferToClientContent" });
  let numberOfScreensReceived: number = 0;
  let totalScreenCount: number = 0;

  chrome.runtime.sendMessage({ type: Msg.CLIENT_CONTENT_INIT });

  chrome.runtime.onMessage.addListener(async (message) => {
    switch (message.type) {
      case Msg.SAVE_TOTAL_SCREEN_COUNT_IN_EXCHANGE_DIV: {
        totalScreenCount = message.data.totalScreenCount;
        const totalScreenCountDiv = createTotalScreensCountDiv(message.data.totalScreenCount);
        document.body.appendChild(totalScreenCountDiv);
        break;
      }

      case Msg.SAVE_TOUR_DATA: {
        const dataDiv = createExchangeDataDiv(screensData);
        document.body.appendChild(dataDiv);
        break;
      }

      case Msg.SAVE_SCREENS_DATA_IN_EXCHANGE_DIV: {
        numberOfScreensReceived += BATCH_SIZE;
        const numberOfScreensReceivedCountDiv = createOrUpdateNumberOfScreensReceivedCountDiv(
          Math.min(numberOfScreensReceived, totalScreenCount)
        );
        document.body.appendChild(numberOfScreensReceivedCountDiv);
        screensData.push(...message.data.screensData);
        break;
      }

      case Msg.SAVE_COOKIES_DATA_IN_EXCHANGE_DIV: {
        const cookiesDiv = createCookiesDiv(message.data.cookiesData);
        document.body.appendChild(cookiesDiv);
        sentryTxReport(transaction, "screensCount", totalScreenCount, "byte");
        break;
      }

      default: {
        break;
      }
    }
  });
}

init();
