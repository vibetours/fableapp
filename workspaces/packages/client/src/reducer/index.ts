import { combineReducers } from "redux";
import project, { initialState as projectInitialState } from "./project_reducer";

const rootReducer = combineReducers({
  project,
});

export default rootReducer;

export interface TState {
  project: typeof projectInitialState;
}
