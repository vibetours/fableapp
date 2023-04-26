import { calculatePathFromEl, getRandomId, snowflake } from "@fable/common/dist/utils";
import { Msg, MsgPayload } from "./msg";
import { getSearializedDom } from "./doc";
import {
  ReqScreenshotData,
  ScreenSerDataFromCS,
  ScriptInitReportedData,
  ScriptInitRequiredData,
  SerializeFrameData,
  StopRecordingData
} from "./types";
import { createStickyControlPill } from "./components/control-pill";

const FABLE_MSG_LISTENER_DIV_ID = "fable-0-cm-presence";
const FABLE_DOM_EVT_LISTENER_DIV = "fable-0-de-presence";

const stickyControlPill = createStickyControlPill();
document.body.appendChild(stickyControlPill);

function serialize(elPath: string, isSource: boolean, id: number) {
  chrome.runtime.sendMessage<MsgPayload<ReqScreenshotData>>({
    type: Msg.TAKE_SCREENSHOT,
    data: { id }
  });
  const serDoc = getSearializedDom();
  elPath && serDoc.postProcesses.push({ type: "elpath", path: elPath });
  chrome.runtime.sendMessage<MsgPayload<ScreenSerDataFromCS>>({
    type: Msg.FRAME_SERIALIZED,
    data: {
      eventType: isSource ? "source" : "cascade",
      id,
      isLast: elPath === "$",
      serDoc,
      location: document.location.origin
    }
  });
}

const onClickHandler = async (e: MouseEvent) => {
  if ((e.target as HTMLElement).classList.contains("fable-control-pill")) return;
  const elPath = calculatePathFromEl(e.target as Node, []).join(".");
  serialize(elPath, true, snowflake());
};

function createListenerMarkerDivIfNotPresent(doc: Document) {
  // this div is present once the onClick listener is added to a frame and all same origin frame wrt to the parent frame
  const div = doc.getElementById(FABLE_DOM_EVT_LISTENER_DIV);
  if (div === null) {
    const nDiv = doc.createElement("div");
    nDiv.setAttribute("id", FABLE_DOM_EVT_LISTENER_DIV);
    doc.body.appendChild(nDiv);
    return true;
  }
  return false;
}

function installListener(doc: Document) {
  const isCreatedNew = createListenerMarkerDivIfNotPresent(doc);
  if (isCreatedNew) {
    doc.addEventListener("mousedown", onClickHandler, true);
    // Checks if an iframe is added dynamically, if yes then onload of all those frames we rerun the installListener
    // to add listeners to frames that are not listened to.
    const observer = new MutationObserver(async mutations => {
      const frames: HTMLIFrameElement[] = [];
      for (const mutation of mutations) {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          for (const node of Array.from(mutation.addedNodes)) {
            if (node.nodeName && node.nodeName.toLowerCase() === "iframe") {
              frames.push(node as HTMLIFrameElement);
            }
          }
        }
      }
      if (frames.length > 0) {
        await Promise.all(
          frames.map(f => new Promise(resolve => {
            f.onload = resolve;
          }))
        );
        installListener(doc);
      }
    });
    observer.observe(document, {
      subtree: true,
      childList: true
    });
  }
  const docs = Array.from(doc.getElementsByTagName("iframe"))
    .map(frame => {
      // Sometime this code can run when a frame is still loading, we run the installListener once more once the frame
      // loading is completed. Practically during dev/testing we did not see this code getting executed, but logically,
      // this code is added to guard against such cases. Google-analytics sometime behave weirdly where a listener
      // won't get registered to the galaxyIFrame. After we added this code we did not notice that behaviour.
      frame.onload = () => {
        installListener(doc);
      };
      return frame.contentDocument;
    })
    .filter(d => !!d);

  for (const d of docs) {
    installListener(d!);
  }
}

// this function is injected in the top of the frame. All the same-origin frame access the same function that
// sits on top of the frame
function init() {
  const initData: ScriptInitReportedData = {
    scriptId: getRandomId(),
    frameId: -1
  };

  installListener(document);

  const onMessageReceiveFromPopup = async (msg: MsgPayload<any>) => {
    switch (msg.type) {
      case Msg.SCRIPT_INIT_DATA: {
        const tMsg = msg as MsgPayload<ScriptInitReportedData>;
        // Since one tab could have many frames, and while sending message from background page
        // chrome has no way to target a frame, this check essentially allows message meant for
        // a frame reaches the specific frame, not all the other frames
        if (tMsg.data.scriptId === initData.scriptId) {
          initData.frameId = tMsg.data.frameId;
        }
        break;
      }

      case Msg.SERIALIZE_FRAME: {
        const tMsg = msg as MsgPayload<SerializeFrameData>;
        if (tMsg.data.srcFrameId !== initData.frameId) {
          serialize("", false, tMsg.data.id);
        }
        break;
      }

      case Msg.STOP_RECORDING: {
        const tMsg = msg as MsgPayload<StopRecordingData>;
        serialize("$", false, tMsg.data.id);
        break;
      }

      default:
        break;
    }
  };

  chrome.runtime.onMessage.addListener(onMessageReceiveFromPopup);
  chrome.runtime.sendMessage<MsgPayload<ScriptInitRequiredData>>({
    type: Msg.SCRIPT_INIT,
    data: { required: "frameId", scriptId: initData.scriptId }
  });
}

// Presence of this div detects if the messaging with the background script has been
// established by a frame in a tab
function createFableZeroPx() {
  const div = document.createElement("div");
  div.setAttribute("id", FABLE_MSG_LISTENER_DIV_ID);
  document.body.appendChild(div);
}

// This is a guard against content script getting called multiple time when tab gets re-loaded
// or even url change
if (document.getElementById(FABLE_MSG_LISTENER_DIV_ID) == null) {
  createFableZeroPx();
  init();
}

export {};
