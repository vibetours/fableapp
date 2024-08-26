import { startTransaction } from "@sentry/browser";
import { init as sentryInit, sentryTxReport } from "@fable/common/dist/sentry";
import { ThemeStats } from "@fable/common/dist/types";
import { Msg } from "./msg";
import { FrameDataToBeProcessed } from "./types";
import { BATCH_SIZE } from "./utils";
import { version } from "../package.json";

sentryInit("extension", version);

function createDataDiv(id: string, content: string): HTMLDivElement {
  const div = (document.getElementById(id) || document.createElement("div")) as HTMLDivElement;
  div.setAttribute("id", id);
  div.textContent = content;
  div.style.display = "none";
  return div;
}

function createExchangeDataDiv(data: FrameDataToBeProcessed[][]) {
  return createDataDiv("exchange-data", JSON.stringify(data));
}

function createCookiesDiv(data: FrameDataToBeProcessed[][]) {
  return createDataDiv("cookies-data", JSON.stringify(data));
}

function createTotalScreensCountDiv(count: number) {
  return createDataDiv("total-screen-count", String(count));
}

function createOrUpdateNumberOfScreensReceivedCountDiv(count: number) {
  return createDataDiv("number-of-screens-received-count", String(count));
}

function createScreenStyleDiv(data: ThemeStats) {
  return createDataDiv("screen-style-data", JSON.stringify(data));
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

      case Msg.SAVE_STYLE_DATA: {
        const dataDiv = createScreenStyleDiv(message.data.screenStyleData);
        document.body.appendChild(dataDiv);
        break;
      }

      case Msg.SAVE_VERSION_DATA: {
        const versionDiv = createDataDiv("version-data", message.data.version);
        document.body.appendChild(versionDiv);
        break;
      }

      default: {
        break;
      }
    }
  });
}

init();
