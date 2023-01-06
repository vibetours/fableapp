import ActionType from "../action/type";
import { Action } from "redux";
import { TGetAllScreens, TInitialize } from "../action/creator";
import { P_RespScreen } from "../entity-processor";
import { RespCommonConfig } from "@fable/common/dist/api-contract";

export const initialState: {
  screens: Array<P_RespScreen>;
  commonConfig: RespCommonConfig | null;
  inited: boolean;
  principalFetched: boolean;
} = { screens: [], commonConfig: null, inited: false, principalFetched: false };

export default function projectReducer(state = initialState, action: Action) {
  switch (action.type) {
    case ActionType.ALL_SCREENS_RETRIEVED: {
      const tAction = action as TGetAllScreens;
      const newState = { ...state };
      newState.screens = tAction.screens;
      return newState;
    }

    case ActionType.INIT: {
      const tAction = action as TInitialize;
      const newState = { ...state };
      newState.commonConfig = tAction.config;
      newState.inited = true;
      return newState;
    }

    default:
      return state;
  }
}
