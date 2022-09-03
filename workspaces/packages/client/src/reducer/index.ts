import { combineReducers } from "redux";
import sample, { initialState as sampleInitialState } from "./sample_reducer";

const rootReducer = combineReducers({
  sample,
});

export default rootReducer;

export interface TState {
  sample: typeof sampleInitialState;
}
