import { createImgNode } from "../../utils";
import { GREEN_TICK, BIN } from "../../CDN_ASSETS";
import { Msg } from "../../msg";

const FABLE_CONTROL_PILL = "fable-control-pill";

function createPillContainer(): HTMLDivElement {
  const pillContainer = document.createElement("div");

  const impStyles = `
    display: flex !important;
    background-color: #7567FF !important;
    position: fixed !important;
    bottom: 2rem !important;
    right: 2rem !important;
    border-radius: 28px !important;
    justify-content: center !important;
    align-items: center !important;
    padding: 8px 24px !important;
    gap: 8px !important;
    z-index: 9999999;
  `;

  pillContainer.setAttribute("style", impStyles);
  pillContainer.classList.add(FABLE_CONTROL_PILL);

  return pillContainer;
}

function createParagraphNode(text: string): HTMLParagraphElement {
  const paraTag = document.createElement("p");
  const textNode = document.createTextNode(text);
  paraTag.appendChild(textNode);

  const impStyles = `
    border-right: 2px solid #403F42;
    padding: 8px;
    color: #FFF;
    font-size: 14px;
    line-height: 20px;
    margin: 0;
  `;

  paraTag.setAttribute("style", impStyles);
  paraTag.classList.add(FABLE_CONTROL_PILL);

  return paraTag;
}

export function createStickyControlPill() {
  const pillContainer = createPillContainer();
  const paraTag = createParagraphNode("Active...");

  const greenTickImgNode = createImgNode(GREEN_TICK, "save", 40, 40, [FABLE_CONTROL_PILL]);
  const binImgNode = createImgNode(BIN, "delete", 24, 24, [FABLE_CONTROL_PILL]);
  const impStyles = `
    cursor: pointer;
  `;

  greenTickImgNode.setAttribute("style", impStyles);
  binImgNode.setAttribute("style", impStyles);

  greenTickImgNode.addEventListener(
    "click",
    () => chrome.runtime.sendMessage({ type: Msg.STOP_RECORDING, data: { action: "SAVE" } })
  );

  binImgNode.addEventListener(
    "click",
    () => chrome.runtime.sendMessage({ type: Msg.STOP_RECORDING, data: { action: "DELETE" } })
  );

  pillContainer.appendChild(paraTag);
  pillContainer.appendChild(greenTickImgNode);
  pillContainer.appendChild(binImgNode);

  return pillContainer;
}
