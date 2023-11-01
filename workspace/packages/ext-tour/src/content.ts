import { getRandomId, sleep, snowflake } from "@fable/common/dist/utils";
import { init as sentryInit } from "@fable/common/dist/sentry";
import { Msg, MsgPayload } from "./msg";
import { addFableIdsToAllEls, getScreenStyle, getSearializedDom } from "./doc";
import {
  ReqScreenshotData,
  ScreenSerDataFromCS,
  ScriptInitReportedData,
  ScriptInitRequiredData,
  SerializeFrameData,
  StopRecordingData
} from "./types";
import { createStickyControlPill } from "./components/control-pill";
import { FABLE_CONTROL_PILL } from "./utils";
import { version } from "../package.json";

sentryInit("extension", version);

const FABLE_MSG_LISTENER_DIV_ID = "fable-0-cm-presence";
const FABLE_DOM_EVT_LISTENER_DIV = "fable-0-de-presence";

const isDocHtml4P1 = (el: Node): boolean => {
  const res = !!((el.nodeName || "").toLowerCase() === "html"
    && el.parentNode
    && (el.parentNode.nodeName || "").toLowerCase() === "#document"
    && (el.parentNode.childNodes[0] || { nodeType: -1 }).nodeType !== 10);

  return res;
};

const calculatePathFromEl = (el: Node, loc: number[]): number[] => {
  if (el.nodeName === "#document") {
    const tEl = el as Document;
    if (tEl.defaultView && tEl.defaultView.frameElement) {
      return calculatePathFromEl(tEl.defaultView.frameElement, loc);
    }
    return loc.reverse();
  }
  const siblings = el.parentNode!.childNodes;
  for (let i = 0, l = siblings.length; i < l; i++) {
    if (el === siblings[i]) {
      // For html5 documents the first element is doctype, and for html4.1 documents the doctype is not present, first
      // element is html element
      // [a] -> However during ser-deser we add an extra element of node type 10 irrespective of html5 or html4.1 documents to
      // have a consistent behaviour across both document type.
      // But while resolving the path of click from the original document, for html4.1 document we calculate the path
      // erronously if we don't adjust the path for behaviour [a]. Hence we update the path here
      if (isDocHtml4P1(el)) loc.push(i + 1);
      else loc.push(i);
      return calculatePathFromEl(el.parentNode!, loc);
    }
  }
  return loc;
};

function serialize(elPath: string, isSource: boolean, id: number, el: EventTarget | null | undefined = null) {
  chrome.runtime.sendMessage<MsgPayload<ReqScreenshotData>>({
    type: Msg.TAKE_SCREENSHOT,
    data: { id }
  });
  addFableIdsToAllEls();
  if (el) {
    elPath = calculatePathFromEl(el as Node, []).join(".");
  }
  const serDoc = getSearializedDom();
  const screenStyle = getScreenStyle();
  elPath && serDoc.postProcesses.push({ type: "elpath", path: elPath });
  chrome.runtime.sendMessage<MsgPayload<ScreenSerDataFromCS>>({
    type: Msg.FRAME_SERIALIZED,
    data: {
      eventType: isSource ? "source" : "cascade",
      id,
      isLast: elPath === "$",
      serDoc,
      location: document.location.origin,
      screenStyle
    }
  });
}

const onClickHandler = async (e: MouseEvent) => {
  if ((e.target as HTMLElement).classList.contains(FABLE_CONTROL_PILL)) return;
  const elPath = calculatePathFromEl(e.target as Node, []).join(".");
  serialize(elPath, true, snowflake(), e.target);
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
            if (node.nodeName && (node.nodeName.toLowerCase() === "iframe" || node.nodeName.toLowerCase() === "object")) {
              frames.push(node as HTMLIFrameElement);
            } else {
              const iframes = (node as HTMLElement).querySelectorAll("iframe");
              iframes.forEach(frame => frames.push(frame as HTMLIFrameElement));
            }
          }
        }
      }
      if (frames.length > 0) {
        await Promise.race([
          Promise.all(
            frames.map(f => new Promise(resolve => {
              f.onload = resolve;
            }))
          ),
          // In case the onload is already fired on the mounted frames, then f.onload won't be fired,
          // we use a timeout of 3s before we say the frame is loaded or not
          // to w
          sleep(3000),
        ]);

        const crossOriginFrameOccurances = frames
          .map(f => f.contentDocument)
          .filter(d => !d)
          .length;

        if (crossOriginFrameOccurances) {
          chrome.runtime.sendMessage<MsgPayload<{}>>({
            type: Msg.REINJECT_CONTENT_SCRIPT,
            data: { }
          });
        }

        installListener(doc);
      }
    });
    observer.observe(document, {
      subtree: true,
      childList: true
    });
  }
  const docs = [...Array.from(doc.getElementsByTagName("iframe")), ...Array.from(doc.getElementsByTagName("object"))]
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

  const onMessageReceiveFromBackground = async (msg: MsgPayload<any>) => {
    switch (msg.type) {
      case Msg.SCRIPT_INIT_DATA: {
        const tMsg = msg as MsgPayload<ScriptInitReportedData>;
        // Since one tab could have many frames, and while sending message from background page
        // chrome has no way to target a frame, this check essentially allows message meant for
        // a frame reaches the specific frame, not all the other frames
        if (tMsg.data.scriptId === initData.scriptId) {
          initData.frameId = tMsg.data.frameId;

          if (tMsg.data.frameId === 0) {
            const stickyControlPill = createStickyControlPill();
            document.body.appendChild(stickyControlPill);
          }
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

  chrome.runtime.onMessage.addListener(onMessageReceiveFromBackground);
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

export { };
