import { IProject } from "./types";

export enum Msg {
  INIT = "INIT",
  INITED = "INITED",
  UPDATE_PERSISTENT_STATE = "UPDATE_PERSISTENT_STATE",
  CREATE_PROJECT = "CREATE_PROJECT",
  SAVE_SCREEN_TO_PROJECT = "SAVE_SCREEN_TO_PROJECT",
}

export interface MsgPayload<T> {
  type: Msg;
  data: T;
}

export interface Payload_UpdatePersistentState {
  selectedProjectId: number;
  selectedProjectIndex: number;
}

export interface Payload_SaveScreenToProject {
  project: IProject;
}
