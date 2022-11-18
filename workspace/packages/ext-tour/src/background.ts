import { Msg, MsgPayload } from "./msg";
import { getSearializedDom } from "./doc";
import axios from "axios";

chrome.runtime.onMessage.addListener(
  async (msg: MsgPayload<any>, sender, sendResponse) => {
    // console.log("msg", msg);
    if (msg.type === Msg.INIT) {
      setTimeout(() => {
        chrome.runtime.sendMessage({ type: Msg.INITED, data: true });
      }, 3000);
    }
    if (msg.type === Msg.SAVE_SCREEN) {
      // console.log(msg.data);
      const tabs = await chrome.tabs.query({
        // currentWindow: true,
        active: true,
        lastFocusedWindow: true,
      });
      // console.log(tabs);
      let tab;
      if ((tab = tabs[0]) && tab.id) {
        const results = await injectScript(tab.id);
        console.log(results);
        fetch("http://localhost:3000/projects/1", {
          method: "PATCH",
          body: JSON.stringify({
            screens: [results[0].result],
          }),
          headers: {
            "Content-type": "application/json; charset=UTF-8",
          },
        })
          .then((res) => {
            console.log(res);
          })
          .catch((err) => {
            console.log(err);
          });
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
