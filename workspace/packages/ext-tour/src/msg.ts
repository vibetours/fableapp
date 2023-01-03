export enum Msg {
  INIT = "INIT",
  INITED = "INITED",
  ADD_SAMPLE_USER = "ADD_SAMPLE_USER",
  SAVE_SCREEN = "SAVE_SCREEN",
}

export interface MsgPayload<T> {
  type: Msg;
  data: T;
}
