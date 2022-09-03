import ActionType from "../action/type";
import { Action } from "redux";
import { TGetAllProjects } from "../action/creator";
import { IProject } from "../entity_type";

export const initialState: {
  projects: Array<IProject>;
} = { projects: [] };

export default function projectReducer(state = initialState, action: Action) {
  let newState;
  let tAction;

  switch (action.type) {
    case ActionType.ALL_PROJECTS:
      tAction = action as TGetAllProjects;
      newState = { ...state };
      newState.projects = tAction.projects;
      return newState;

    default:
      return state;
  }
}
