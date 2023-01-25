/* TODO There are some repetation of code across creators, fix those
 */

import { Dispatch } from 'react';
import api from '@fable/common/dist/api';
import {
  ApiResp,
  ReqCopyScreen,
  ReqNewTour,
  ReqRecordEdit,
  RespCommonConfig,
  RespScreen,
  RespTour,
} from '@fable/common/dist/api-contract';
import { getCurrentUtcUnixTime, sleep } from '@fable/common/dist/utils';
import {
  EditFile,
  IAnnotationConfig,
  IAnnotationTheme,
  ScreenData,
  TourData,
  TourDataWoScheme
} from '@fable/common/dist/types';
import {
  convertEditsToLineItems,
  createEmptyTour,
  createEmptyTourDataFile,
  groupScreens,
  mergeEdits,
  P_RespScreen,
  P_RespTour,
  processRawScreenData,
  processRawTourData,
  normalizeTourDataFile,
  mergeTourData,
  getThemeAndAnnotationFromDataFile,
} from '../entity-processor';
import { TState } from '../reducer';
import ActionType from './type';
import { AllEdits, EditItem, ElEditType } from '../types';

export interface TGenericLoading {
  type: ActionType.GENERIC_LOADING;
  entity: 'tour';
}

/* ************************************************************************* */

export interface TGetAllScreens {
  type: ActionType.ALL_SCREENS_RETRIEVED;
  screens: Array<P_RespScreen>;
  flattenedScreens: Array<P_RespScreen>;
}

export function getAllScreens() {
  return async (dispatch: Dispatch<TGetAllScreens>, getState: () => TState) => {
    const data = await api<null, ApiResp<RespScreen[]>>('/screens', { auth: true });
    const pScreens = data.data.map((d: RespScreen) => processRawScreenData(d, getState()));
    dispatch({
      type: ActionType.ALL_SCREENS_RETRIEVED,
      screens: groupScreens(pScreens),
      flattenedScreens: pScreens,
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
  screenEdits: EditFile<AllEdits<ElEditType>> | null;
  remoteEdits: EditItem[];
  screen: P_RespScreen;
  isScreenInPreviewMode: boolean;
}

export function loadScreenAndData(screenRid: string, isScreenInPreviewMode = false) {
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
      const pScreen = processRawScreenData(screen, state);
      const [data, edits] = await Promise.all([
        api<null, ScreenData>(pScreen.dataFileUri.href),
        screen.parentScreenId
          ? api<null, EditFile<AllEdits<ElEditType>>>(pScreen.editFileUri.href)
          : Promise.resolve(null),
      ]);
      let remoteEdits: EditItem[] = [];
      if (edits !== null) {
        if (edits.edits instanceof Array) {
          // WARN this if conditions only for the cases where screens are created earlier with edit.json file having
          // wrong format for edits key
        } else {
          remoteEdits = convertEditsToLineItems(edits.edits, false);
        }
      }
      dispatch({
        type: ActionType.SCREEN_AND_DATA_LOADED,
        screenData: data,
        screenEdits: edits,
        remoteEdits,
        screen: processRawScreenData(screen, getState()),
        isScreenInPreviewMode,
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

    const pScreen = processRawScreenData(screen, getState());
    const [data, edits] = await Promise.all([
      api<null, ScreenData>(pScreen.dataFileUri.href),
      api<null, EditFile<AllEdits<ElEditType>>>(pScreen.editFileUri.href)
    ]);
    dispatch({
      type: ActionType.SCREEN_AND_DATA_LOADED,
      screenData: data,
      screenEdits: edits,
      screen: processRawScreenData(screen, getState()),
      remoteEdits: [],
      isScreenInPreviewMode: false,
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
  annotations: Record<string, IAnnotationConfig[]>;
  theme: IAnnotationTheme;
}

export function loadTourAndData(tourRid: string) {
  return async (dispatch: Dispatch<TTourWithData>, getState: () => TState) => {
    const state = getState();
    let tour: P_RespTour | null = null;
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
        tour = processRawTourData(data.data, state);
      } catch (e) {
        console.error(e);
      }
    }
    if (tour) {
      const data = await api<null, TourData>(tour.dataFileUri.href);
      const nData = normalizeTourDataFile(data);
      const annotationAndTheme = getThemeAndAnnotationFromDataFile(nData, true);
      dispatch({
        type: ActionType.TOUR_AND_DATA_LOADED,
        tourData: nData,
        tour: processRawTourData(tour, getState()),
        annotations: annotationAndTheme.annotations,
        theme: annotationAndTheme.theme,
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
    const annotationAndTheme = getThemeAndAnnotationFromDataFile(data, false);

    dispatch({
      type: ActionType.TOUR_AND_DATA_LOADED,
      tourData: data,
      tour: processRawTourData(tour, getState(), true),
      annotations: annotationAndTheme.annotations,
      theme: annotationAndTheme.theme
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

export interface TSaveEditChunks {
  type: ActionType.SAVE_EDIT_CHUNKS;
  screen: P_RespScreen;
  editList: EditItem[];
  isLocal: boolean;
  editFile?: EditFile<AllEdits<ElEditType>>
}

export function saveEditChunks(screen: P_RespScreen, editChunks: AllEdits<ElEditType>) {
  return async (dispatch: Dispatch<TSaveEditChunks>) => {
    dispatch({
      type: ActionType.SAVE_EDIT_CHUNKS,
      screen,
      editList: convertEditsToLineItems(editChunks, true),
      isLocal: true,
    });
  };
}

export function flushEditChunksToMasterFile(screen: P_RespScreen, localEdits: AllEdits<ElEditType>) {
  return async (dispatch: Dispatch<TSaveEditChunks>, getState: () => TState) => {
    const savedEditData = getState().default.screenEdits;
    if (savedEditData) {
      let masterEdit = savedEditData?.edits;
      if (masterEdit) {
        if (masterEdit instanceof Array) {
          // WARN this is only for the cases where screens are created earlier with edit.json file having wrong format
          // for edits key
          masterEdit = {};
        }
        savedEditData.lastUpdatedAtUtc = getCurrentUtcUnixTime();
        savedEditData.edits = mergeEdits(masterEdit, localEdits);

        const screenResp = await api<ReqRecordEdit, ApiResp<RespScreen>>('/recordeledit', {
          auth: true,
          body: {
            rid: screen.rid,
            editData: JSON.stringify(savedEditData),
          },
        });

        dispatch({
          type: ActionType.SAVE_EDIT_CHUNKS,
          screen,
          editList: convertEditsToLineItems(savedEditData.edits, false),
          editFile: savedEditData,
          isLocal: false,
        });
      }
    }
  };
}

/* ************************************************************************* */

export interface TSaveTourEntities {
  type: ActionType.SAVE_TOUR_ENTITIES;
  tour: P_RespTour;
  data: TourData | null,
  annotations: Record<string, IAnnotationConfig[]>,
  theme: IAnnotationTheme,
  isLocal: boolean,
}

export function saveTourData(tour: P_RespTour, data: TourDataWoScheme) {
  return async (dispatch: Dispatch<TSaveTourEntities>, getState: () => TState) => {
    const annotationAndTheme = getThemeAndAnnotationFromDataFile(data as TourData, true);
    dispatch({
      type: ActionType.SAVE_TOUR_ENTITIES,
      tour,
      data: getState().default.tourData,
      annotations: annotationAndTheme.annotations,
      theme: annotationAndTheme.theme,
      isLocal: true,
    });
  };
}

export function flushTourDataToMasterFile(tour: P_RespTour, localEdits: Partial<TourDataWoScheme>) {
  return async (dispatch: Dispatch<TSaveTourEntities>, getState: () => TState) => {
    const savedData = getState().default.tourData;
    if (savedData) {
      savedData.lastUpdatedAtUtc = getCurrentUtcUnixTime();
      const mergedData = {
        ...savedData,
        ...mergeTourData(savedData, localEdits)
      };

      const tourResp = await api<ReqRecordEdit, ApiResp<RespTour>>('/recordtredit', {
        auth: true,
        body: {
          rid: tour.rid,
          editData: JSON.stringify(mergedData),
        },
      });

      const annotationAndTheme = getThemeAndAnnotationFromDataFile(mergedData, false);
      dispatch({
        type: ActionType.SAVE_TOUR_ENTITIES,
        tour,
        data: mergedData,
        annotations: annotationAndTheme.annotations,
        theme: annotationAndTheme.theme,
        isLocal: false,
      });
    }
  };
}
