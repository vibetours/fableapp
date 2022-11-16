export enum Msg {
  INIT = "INIT",
  INITED = "INITED",
  CREATE_PROJECT = "CREATE_PROJECT",
}

export interface MsgPayload<T> {
  type: Msg;
  data: T;
}
