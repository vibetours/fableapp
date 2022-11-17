export enum Msg {
  INIT = "INIT",
  INITED = "INITED",
  CREATE_PROJECT = "CREATE_PROJECT",
  SAVE_SCREEN = "SAVE_SCREEN",
}

export interface MsgPayload<T> {
  type: Msg;
  data: T;
}
