import ActionType from "./type";
import { Dispatch } from "react";
import api from "@fable/common/dist/api";
import { ApiResp, RespCommonConfig, RespScreen, RespTour, ReqNewTour } from "@fable/common/dist/api-contract";
import { sleep } from "@fable/common/dist/utils";
import {
  processRawScreenData,
  P_RespScreen,
  groupScreens,
  P_RespTour,
  processRawTourData,
  createEmptyTour,
  createEmptyTourDataFile,
} from "../entity-processor";
import { TState } from "../reducer";
import { ScreenData, TourData } from "@fable/common/dist/types";

export interface TGenericLoading {
  type: ActionType.GENERIC_LOADING;
  entity: "tour";
}

/* ************************************************************************* */

export interface TGetAllScreens {
  type: ActionType.ALL_SCREENS_RETRIEVED;
  screens: Array<P_RespScreen>;
}

export function getAllScreens() {
  return async (dispatch: Dispatch<TGetAllScreens>, getState: () => TState) => {
    const data = await api<null, ApiResp<RespScreen[]>>("/screens", { auth: true });
    dispatch({
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
    dispatch({
      type: ActionType.INIT,
      config: data.data,
    });
  };
}

/* ************************************************************************* */

export interface TScreenWithData {
  type: ActionType.SCREEN_AND_DATA_LOADED;
  screenData: ScreenData;
  screen: P_RespScreen;
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
      // We don't save the data of the screen in screen object
      // As with more and more screen and more and more screen interaction if js holds the data
      // that could crate lag in the browser's tab for less powerful device.
      // The data would be cached in disk any way and browser would not make another call to the data file and instead
      // return from disk cache
      const commonConfig = state.default.commonConfig!;
      const url = `${commonConfig.screenAssetPath}${screen.assetPrefixHash}/${commonConfig.dataFileName}`;
      const data = await api<null, ScreenData>(url);
      dispatch({
        type: ActionType.SCREEN_AND_DATA_LOADED,
        screenData: data,
        screen: processRawScreenData(screen, getState()),
      });
    } else {
      // TODO error
    }
  };
}

/* ************************************************************************* */

export interface TGetAllTours {
  type: ActionType.ALL_TOURS_RETRIEVED;
  tours: Array<P_RespTour>;
}

export function getAllTours() {
  return async (dispatch: Dispatch<TGetAllTours>, getState: () => TState) => {
    const data = await api<null, ApiResp<RespTour[]>>("/tours", { auth: true });
    dispatch({
      type: ActionType.ALL_TOURS_RETRIEVED,
      tours: data.data.map((d: RespTour) => processRawTourData(d, getState())),
    });
  };
}

/* ************************************************************************* */

export interface TTour {
  type: ActionType.TOUR;
  tour: P_RespTour;
  performedAction: "new" | "get" | "rename";
}

export function createNewTour(tourName = "Untitled") {
  return async (dispatch: Dispatch<TTour | TGenericLoading>, getState: () => TState) => {
    dispatch({ type: ActionType.GENERIC_LOADING, entity: "tour" });

    const data = await api<ReqNewTour, ApiResp<RespTour>>("/newtour", {
      auth: true,
      body: {
        name: tourName,
      },
    });
    await sleep(3000);
    dispatch({
      type: ActionType.TOUR,
      tour: processRawTourData(data.data, getState()),
      performedAction: "new",
    });
  };
}

/* ************************************************************************* */

export interface TTourWithData {
  type: ActionType.TOUR_AND_DATA_LOADED;
  tour: P_RespTour;
  tourData: TourData;
}

export function loadTourAndData(tourRid: string) {
  return async (dispatch: Dispatch<TTourWithData>, getState: () => TState) => {
    const state = getState();
    let tour: RespTour | null = null;
    let isTourFound = false;
    for (const t of state.default.tours) {
      if (t.rid === tourRid) {
        tour = t;
        isTourFound = true;
        break;
      }
    }
    if (!isTourFound) {
      try {
        const data = await api<null, ApiResp<RespTour>>(`/tour?rid=${tourRid}`);
        tour = data.data;
      } catch (e) {
        console.error(e);
      }
    }
    if (tour) {
      // We don't save the data of the screen in screen object
      // As with more and more screen and more and more screen interaction if js holds the data
      // that could crate lag in the browser's tab for less powerful device.
      // The data would be cached in disk any way and browser would not make another call to the data file and instead
      // return from disk cache
      const commonConfig = state.default.commonConfig!;
      const url = `${commonConfig.tourAssetPath}${tour.assetPrefixHash}/${commonConfig.dataFileName}`;
      const data = await api<null, TourData>(url);
      dispatch({
        type: ActionType.TOUR_AND_DATA_LOADED,
        tourData: data,
        tour: processRawTourData(tour, getState()),
      });
    } else {
      // TODO error
    }
  };
}

/* ************************************************************************* */

export function createPlaceholderTour() {
  return async (dispatch: Dispatch<TTourWithData>, getState: () => TState) => {
    const tour = createEmptyTour();
    const data = createEmptyTourDataFile();

    dispatch({
      type: ActionType.TOUR_AND_DATA_LOADED,
      tourData: data,
      tour: processRawTourData(tour, getState(), true),
    });
  };
}
