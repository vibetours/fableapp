import ActionType from "../action/type";
import { Action } from "redux";
import { TGetAllScreens, TInitialize, TScreenWithData } from "../action/creator";
import { P_RespScreen } from "../entity-processor";
import { RespCommonConfig, RespScreen } from "@fable/common/dist/api-contract";
import { ScreenData, SerDoc } from "@fable/common/dist/types";

export const initialState: {
  screens: Array<P_RespScreen>;
  commonConfig: RespCommonConfig | null;
  inited: boolean;
  principalFetched: boolean;
  screenLoaded: boolean;
  screenData: ScreenData | null;
  currentScreen: RespScreen | null;
} = {
  screens: [],
  commonConfig: null,
  inited: false,
  principalFetched: false,
  screenLoaded: false,
  screenData: null,
  currentScreen: null,
};

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

    case ActionType.SCREEN_AND_DATA_LOADED: {
      const tAction = action as TScreenWithData;
      const newState = { ...state };
      newState.currentScreen = tAction.screen;
      newState.screenData = tAction.screenData;
      newState.screenLoaded = true;
      return newState;
    }

    default:
      return state;
  }
}
