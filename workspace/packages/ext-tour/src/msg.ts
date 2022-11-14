export enum Msg {
  INIT = "INIT",
  INITED = "INITED",
}

export interface MsgPayload<T> {
  type: Msg;
  data: T;
}
