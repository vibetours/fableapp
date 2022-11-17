import { Msg, MsgPayload } from "./msg";
import { getSearializedDom } from "./doc";

chrome.runtime.onMessage.addListener(
  async (msg: MsgPayload<any>, sender, sendResponse) => {
    // console.log("msg", msg);
    if (msg.type === Msg.INIT) {
      setTimeout(() => {
        chrome.runtime.sendMessage({ type: Msg.INITED, data: true });
      }, 3000);
    }
    if (msg.type === Msg.SAVE_SCREEN) {
      const tabs = await chrome.tabs.query({ currentWindow: true, active: true });
      let tab;
      if ((tab = tabs[0]) && tab.id) {
        const results = await injectScript(tab.id);
        for (const result of results) {
          console.log(">> result", result);
        }
      }
    }
  }
);

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "save-screen") {
    const tabs = await chrome.tabs.query({ currentWindow: true, active: true });
    let tab;
    if ((tab = tabs[0]) && tab.id) {
      const results = await injectScript(tab.id);
      for (const result of results) {
        console.log(">> result", result);
      }
    }
  }
});

function injectScript(tabId: number): Promise<any> {
  return chrome.scripting.executeScript({
    target: { tabId },
    func: getSearializedDom,
  });
}
