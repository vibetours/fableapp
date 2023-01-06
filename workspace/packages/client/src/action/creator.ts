import ActionType from "./type";
import { Dispatch } from "react";
import api from "@fable/common/dist/api";
import { ApiResp, RespCommonConfig, RespScreen } from "@fable/common/dist/api-contract";
import { processRawScreenData, P_RespScreen, groupScreens } from "../entity-processor";
import { TState } from "../reducer";

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
