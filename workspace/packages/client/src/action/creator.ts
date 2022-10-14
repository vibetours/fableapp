import ActionType from "./type";
import { Dispatch } from "react";
import { IProject, IProject_Raw } from "../entity_type";
import api from "../api";
import { processRawProjectData } from "../processor";

export function getAllProjects() {
  return async (dispatch: Dispatch<TGetAllProjects>) => {
    const resp = await api.get("/projects");
    return dispatch({
      type: ActionType.ALL_PROJECTS,
      projects: resp.data.data.map((d: IProject_Raw) => processRawProjectData(d)),
    });
  };
}
export interface TGetAllProjects {
  type: ActionType.ALL_PROJECTS;
  projects: Array<IProject>;
}

export function getProject(id: number) {
  return async (dispatch: Dispatch<TGetProject>) => {
    const resp = await api.get(`/projects/${id}`);
    return dispatch({
      type: ActionType.UNIT_PROJECT,
      project: processRawProjectData(resp.data),
    });
  };
}
export interface TGetProject {
  type: ActionType.UNIT_PROJECT;
  project: IProject;
}
