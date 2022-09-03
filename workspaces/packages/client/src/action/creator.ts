import ActionType from "./type";

function sleep(ts: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ts));
}
export function sampleActionCreator(updateVal: number) {
  return async (dispatch: any) => {
    await sleep(2000);
    // thunks allow for pre-processing actions, calling apis, and dispatching multiple actions
    return dispatch({
      type: ActionType.SAMPLE_ACTION_TYPE,
      val: updateVal,
    });
  };
}
