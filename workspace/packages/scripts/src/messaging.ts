import { FrameParentMsg, InboundMessageTypes } from '@fable/common/dist/constants';

declare const top: Window;

export function sendMessageToParent<T>(type: FrameParentMsg<T>) {
  top.postMessage(type, '*');
}

const MSG_HANDLERS: Record<string, <T>(data: T) => void> = {};

export function registerMsgListener(type: InboundMessageTypes, fn: <T>(data: T) => void) {
  MSG_HANDLERS[type] = fn;
}

window.onmessage = (e: MessageEvent) => {
  const data = e.data as FrameParentMsg<any>;
  if (data.type && data.type in MSG_HANDLERS) {
    const fn = MSG_HANDLERS[data.type];
    fn(data.data as typeof data.data);
  }
};
