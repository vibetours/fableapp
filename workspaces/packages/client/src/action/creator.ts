import ActionType from "./type";
import { Dispatch } from "react";
import { IProject } from "../entity_type";
import api from "../api";

export function getAllProjects() {
  return async (dispatch: Dispatch<TGetAllProjects>) => {
    const resp = await api.get("/projects");
    return dispatch({
      type: ActionType.ALL_PROJECTS,
      projects: resp.data.data,
    });
  };
}
export interface TGetAllProjects {
  type: ActionType.ALL_PROJECTS;
  projects: Array<IProject>;
}
