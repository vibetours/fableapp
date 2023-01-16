/* TODO There are some repetation of code across creators, fix those
 */

import { Dispatch } from 'react';
import api from '@fable/common/dist/api';
import {
  ApiResp,
  ReqCopyScreen,
  ReqNewScreen,
  ReqNewTour,
  RespCommonConfig,
  RespScreen,
  RespTour,
} from '@fable/common/dist/api-contract';
import { sleep } from '@fable/common/dist/utils';
import { ScreenData, TourData, ScreenEdits } from '@fable/common/dist/types';
import {
  createEmptyTour,
  createEmptyTourDataFile,
  groupScreens,
  P_RespScreen,
  P_RespTour,
  processRawScreenData,
  processRawTourData,
} from '../entity-processor';
import { TState } from '../reducer';
import ActionType from './type';

export interface TGenericLoading {
  type: ActionType.GENERIC_LOADING;
  entity: 'tour';
}

/* ************************************************************************* */

export interface TGetAllScreens {
  type: ActionType.ALL_SCREENS_RETRIEVED;
  screens: Array<P_RespScreen>;
}

export function getAllScreens() {
  return async (dispatch: Dispatch<TGetAllScreens>, getState: () => TState) => {
    const data = await api<null, ApiResp<RespScreen[]>>('/screens', { auth: true });
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
    const data = await api<null, ApiResp<RespCommonConfig>>('/cconfig');
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
  screenEdits: ScreenEdits | null;
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
      const dataFileUrl = `${commonConfig.screenAssetPath}${screen.assetPrefixHash}/${commonConfig.dataFileName}`;
      const editFileUrl = `${commonConfig.screenAssetPath}${screen.assetPrefixHash}/${commonConfig.editFileName}`;
      const [data, edits] = await Promise.all([
        api<null, ScreenData>(dataFileUrl),
        screen.parentScreenId ? api<null, ScreenEdits>(editFileUrl) : Promise.resolve(null),
      ]);
      dispatch({
        type: ActionType.SCREEN_AND_DATA_LOADED,
        screenData: data,
        screenEdits: edits,
        screen: processRawScreenData(screen, getState()),
      });
    } else {
      // TODO error
    }
  };
}

export function copyScreenForCurrentTour(tour: P_RespTour, withScreen: P_RespScreen) {
  return async (dispatch: Dispatch<TScreenWithData>, getState: () => TState) => {
    const screenResp = await api<ReqCopyScreen, ApiResp<RespScreen>>('/copyscreen', {
      auth: true,
      body: {
        parentId: withScreen.id,
        tourRid: tour.rid,
      },
    });
    const screen = screenResp.data;

    const state = getState();
    const commonConfig = state.default.commonConfig!;
    const dataFileUrl = `${commonConfig.screenAssetPath}${screen.assetPrefixHash}/${commonConfig.dataFileName}`;
    const editFileUrl = `${commonConfig.screenAssetPath}${screen.assetPrefixHash}/${commonConfig.editFileName}`;
    const [data, edits] = await Promise.all([api<null, ScreenData>(dataFileUrl), api<null, ScreenEdits>(editFileUrl)]);
    dispatch({
      type: ActionType.SCREEN_AND_DATA_LOADED,
      screenData: data,
      screenEdits: edits,
      screen: processRawScreenData(screen, getState()),
    });
    window.history.replaceState(null, tour.displayName, `/tour/${tour.rid}/${screen.rid}`);
  };
}

/* ************************************************************************* */

export interface TGetAllTours {
  type: ActionType.ALL_TOURS_RETRIEVED;
  tours: Array<P_RespTour>;
}

export function getAllTours() {
  return async (dispatch: Dispatch<TGetAllTours>, getState: () => TState) => {
    const data = await api<null, ApiResp<RespTour[]>>('/tours', { auth: true });
    dispatch({
      type: ActionType.ALL_TOURS_RETRIEVED,
      tours: data.data.map((d: RespTour) => processRawTourData(d, getState())),
    });
  };
}

/* ************************************************************************* */

type SupportedPerformedAction = 'new' | 'get' | 'rename' | 'replace';
export interface TTour {
  type: ActionType.TOUR;
  tour: P_RespTour;
  performedAction: SupportedPerformedAction;
}

export function createNewTour(tourName = 'Untitled', description = '', mode: SupportedPerformedAction = 'new') {
  return async (dispatch: Dispatch<TTour | TGenericLoading>, getState: () => TState) => {
    if (mode !== 'replace') {
      dispatch({ type: ActionType.GENERIC_LOADING, entity: 'tour' });
    }

    const data = await api<ReqNewTour, ApiResp<RespTour>>('/newtour', {
      auth: true,
      body: {
        name: tourName,
        description,
      },
    });
    await sleep(3000);
    const tour = processRawTourData(data.data, getState());
    dispatch({
      type: ActionType.TOUR,
      tour,
      performedAction: mode,
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

export function savePlaceHolderTour(tour: P_RespTour, withScreen: P_RespScreen) {
  return async (dispatch: Dispatch<TTour>, getState: () => TState) => {
    const data = await api<ReqNewTour, ApiResp<RespTour>>('/newtour', {
      auth: true,
      body: {
        name: tour.displayName,
        description: tour.description,
      },
    });
    await sleep(3000);
    const pTour = processRawTourData(data.data, getState());
    dispatch({
      type: ActionType.TOUR,
      tour: pTour,
      performedAction: 'replace',
    });
    window.history.replaceState(null, tour.displayName, `/tour/${pTour.rid}/${withScreen.rid}`);
  };
}

/* ************************************************************************* */
