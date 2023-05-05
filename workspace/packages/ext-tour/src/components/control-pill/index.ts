import { createImgNode, FABLE_CONTROL_PILL } from "../../utils";
import { GREEN_TICK, BIN } from "../../img_data";
import { Msg } from "../../msg";

function createPillContainer(): HTMLDivElement {
  const pillContainer = document.createElement("div");

  const impStyles = `
    display: flex !important;
    background-color: #7567FF !important;
    top:-10000px; 
    left:-10000px;
    position: fixed !important;
    border-radius: 28px !important;
    justify-content: center !important;
    align-items: center !important;
    padding: 8px 24px !important;
    gap: 8px !important;
    z-index: 9999999 !important;
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
    border-right: 1px solid #403F42;
    padding: 2px 10px 2px 2px;
    color: #DBDBDB;
    font-size: 14px;
    line-height: 20px;
    margin: 8px 2px 8px 0px;
  `;

  paraTag.setAttribute("style", impStyles);
  paraTag.classList.add(FABLE_CONTROL_PILL);

  return paraTag;
}

function makeElementDraggable(element: HTMLElement, host: HTMLElement) {
  element.style.cursor = "move";

  let relX = 0;
  let relY = 0;
  let absX = 0;
  let absY = 0;

  function mouseMoveEventListener(e: MouseEvent) {
    e.preventDefault();

    relX = absX - e.clientX;
    relY = absY - e.clientY;
    absX = e.clientX;
    absY = e.clientY;
    host.style.top = `${host.offsetTop - relY}px`;
    host.style.left = `${host.offsetLeft - relX}px`;
  }

  element.addEventListener("mousedown", (e) => {
    document.addEventListener("mousemove", mouseMoveEventListener);
    absX = e.clientX;
    absY = e.clientY;
  });

  document.addEventListener("mouseup", (e) => {
    document.removeEventListener("mousemove", mouseMoveEventListener);
  });
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
    () => {
      chrome.runtime.sendMessage({ type: Msg.STOP_RECORDING });
      paraTag.innerText = "Creating...";
      greenTickImgNode.style.pointerEvents = "none";
      binImgNode.style.pointerEvents = "none";
    }
  );

  binImgNode.addEventListener(
    "click",
    () => {
      chrome.runtime.sendMessage({ type: Msg.DELETE_RECORDING });
      paraTag.innerText = "Deleting...";
      greenTickImgNode.style.pointerEvents = "none";
      binImgNode.style.pointerEvents = "none";
    }
  );

  makeElementDraggable(paraTag, pillContainer);

  pillContainer.appendChild(paraTag);
  pillContainer.appendChild(greenTickImgNode);
  pillContainer.appendChild(binImgNode);

  positionPill(pillContainer);

  return pillContainer;
}

function positionPill(pill: HTMLDivElement) {
  document.body.appendChild(pill);

  const pillWidth = pill.clientWidth;
  const pillHeight = pill.clientHeight;
  const REM = 16;

  pill.remove();

  const pillTop = `${window.innerHeight - pillHeight - (2 * REM)}`;
  const pillLeft = `${window.innerWidth - pillWidth - (3 * REM)}`;

  const originalStyles = pill.getAttribute("style");

  const impStyles = `
    ${originalStyles}
    top: ${pillTop}px !important;
    left: ${pillLeft}px !important;
  `;

  pill.setAttribute("style", impStyles);
}
