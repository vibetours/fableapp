// Outbound messages are iframe -> parent messages
export enum OutboundMessageTypes {
  EmbedReady = "EMBED_READY",
}

// Inbound messages are parent -> iframe messages
export enum InboundMessageTypes {
  EditModeStart = "EDIT_MODE_START",
  EditModeEnd = "EDIT_MODE_END",
}

export interface FrameParentMsg<T> {
  type: InboundMessageTypes | OutboundMessageTypes;
  data: T;
}

export const EmptyMsg = {};
