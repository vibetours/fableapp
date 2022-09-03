import Action from "../action/type";

export const initialState = { counter: 0 };

export default function sampleReducer(state = initialState, action: { type: Action; val: number }) {
  let newState;
  switch (action.type) {
    //add your cases according to action types
    case Action.SAMPLE_ACTION_TYPE:
      //do the changes to state, keep in mind that state should be kept immutable
      newState = { ...state };
      newState.counter = newState.counter + action.val;
      return newState;

    default:
      return state;
  }
}
