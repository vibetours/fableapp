import ActionType from "./type";
import { Dispatch } from "react";
import api from "@fable/common/dist/api";
import { ApiResp, RespCommonConfig, RespScreen } from "@fable/common/dist/api-contract";
import { processRawScreenData, P_RespScreen, groupScreens } from "../entity-processor";
import { TState } from "../reducer";
import { ScreenData } from "@fable/common/dist/types";

/* ************************************************************************* */

export interface TGetAllScreens {
  type: ActionType.ALL_SCREENS_RETRIEVED;
  screens: Array<P_RespScreen>;
}

export function getAllScreens() {
  return async (dispatch: Dispatch<TGetAllScreens>, getState: () => TState) => {
    const data = await api<null, ApiResp<RespScreen[]>>("/screens", { auth: true });
    return dispatch({
      type: ActionType.ALL_SCREENS_RETRIEVED,
      screens: groupScreens(data.data.map((d: RespScreen) => processRawScreenData(d, getState()))),
    });
  };
}

/* ************************************************************************* */

export interface TInitialize {
  type: ActionType.INIT;
  config: RespCommonConfig;
}

export function init() {
  return async (dispatch: Dispatch<TInitialize>) => {
    const data = await api<null, ApiResp<RespCommonConfig>>("/cconfig");
    return dispatch({
      type: ActionType.INIT,
      config: data.data,
    });
  };
}

/* ************************************************************************* */

export interface TScreenWithData {
  type: ActionType.SCREEN_AND_DATA_LOADED;
  screenData: ScreenData;
  screen: RespScreen;
}

export function loadScreenAndData(screenRid: string) {
  return async (dispatch: Dispatch<TScreenWithData>, getState: () => TState) => {
    const state = getState();
    let screen: RespScreen | null = null;
    let isScreenFound = false;
    for (const s of state.default.screens) {
      if (s.rid === screenRid) {
        screen = s;
        isScreenFound = true;
        break;
      }
    }
    if (!isScreenFound) {
      try {
        const data = await api<null, ApiResp<RespScreen>>(`/screen?rid=${screenRid}`);
        screen = data.data;
      } catch (e) {
        console.error(e);
      }
    }
    if (screen) {
      const commonConfig = state.default.commonConfig!;
      const url = `${commonConfig.screenAssetPath}${screen.assetPrefixHash}/${commonConfig.dataFileName}`;
      const data = await api<null, ScreenData>(url);
      return dispatch({
        type: ActionType.SCREEN_AND_DATA_LOADED,
        screenData: data,
        screen: screen!,
      });
    } else {
      // TODO error
    }
  };
}

/* ************************************************************************* */
