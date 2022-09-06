import ActionType from "../action/type";
import { Action } from "redux";
import { TGetAllProjects, TGetProject } from "../action/creator";
import { IProject } from "../entity_type";

export const initialState: {
  projects: Array<IProject>;
  selectedProject: IProject | null;
} = { projects: [], selectedProject: null };

export default function projectReducer(state = initialState, action: Action) {
  let newState;
  let tAction;

  switch (action.type) {
    case ActionType.ALL_PROJECTS:
      tAction = action as TGetAllProjects;
      newState = { ...state };
      newState.projects = tAction.projects;
      return newState;

    case ActionType.UNIT_PROJECT:
      tAction = action as TGetProject;
      newState = { ...state };
      newState.selectedProject = tAction.project;
      return newState;

    default:
      return state;
  }
}
