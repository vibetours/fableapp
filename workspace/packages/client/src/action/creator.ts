/* TODO There are some repetation of code across creators, fix those
 */

import api from '@fable/common/dist/api';
import {
  ApiResp,
  ReqCopyScreen,
  ReqNewTour,
  ReqRecordEdit,
  ReqRenameTour,
  RespCommonConfig,
  RespScreen,
  RespTour
} from '@fable/common/dist/api-contract';
import {
  EditFile,
  IAnnotationConfig,
  ITourDataOpts,
  ScreenData,
  TourData,
  TourDataWoScheme
} from '@fable/common/dist/types';
import { getCurrentUtcUnixTime } from '@fable/common/dist/utils';
import { Dispatch } from 'react';
import {
  convertEditsToLineItems, getThemeAndAnnotationFromDataFile, groupScreens,
  mergeEdits, mergeTourData, normalizeTourDataFile, processRawScreenData,
  processRawTourData, P_RespScreen,
  P_RespTour
} from '../entity-processor';
import { TState } from '../reducer';
import { AllEdits, EditItem, ElEditType } from '../types';
import ActionType from './type';

export interface TGenericLoading {
  type: ActionType.ALL_SCREENS_LOADING | ActionType.SCREEN_LOADING | ActionType.ALL_TOURS_LOADING;
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

export interface TGetAllScreens {
  type: ActionType.ALL_SCREENS_LOADED;
  allScreens: Array<P_RespScreen>;
  rootScreens: Array<P_RespScreen>;
}

export function getAllScreens() {
  return async (dispatch: Dispatch<TGetAllScreens | TGenericLoading>, getState: () => TState) => {
    dispatch({
      type: ActionType.ALL_SCREENS_LOADING,
    });
    const data = await api<null, ApiResp<RespScreen[]>>('/screens', { auth: true });
    const pScreens = data.data.map((d: RespScreen) => processRawScreenData(d, getState()));
    dispatch({
      type: ActionType.ALL_SCREENS_LOADED,
      allScreens: pScreens,
      rootScreens: groupScreens(pScreens),
    });
  };
}

export interface TScreenWithData {
  type: ActionType.SCREEN_AND_DATA_LOADED;
  screenData: ScreenData;
  screenEdits: EditFile<AllEdits<ElEditType>> | null;
  remoteEdits: EditItem[];
  screen: P_RespScreen;
}

export function loadScreenAndData(screenRid: string) {
  return async (dispatch: Dispatch<TScreenWithData | TGenericLoading>, getState: () => TState) => {
    dispatch({
      type: ActionType.SCREEN_LOADING,
    });

    const state = getState();
    let screen: P_RespScreen | null = null;
    let isScreenFound = false;
    for (const s of state.default.allScreens) {
      if (s.rid === screenRid) {
        screen = s;
        isScreenFound = true;
        break;
      }
    }
    if (!isScreenFound) {
      try {
        const data = await api<null, ApiResp<RespScreen>>(`/screen?rid=${screenRid}`);
        screen = processRawScreenData(data.data, state);
      } catch (e) {
        const err = e as Error;
        throw new Error(`Error encountered while getting screen with id=${screenRid} with message ${err.message}`);
      }
    }
    if (screen) {
      const [data, edits] = await Promise.all([
        api<null, ScreenData>(screen.dataFileUri.href),
        screen.parentScreenId
          ? api<null, EditFile<AllEdits<ElEditType>>>(screen.editFileUri.href)
          : Promise.resolve(null),
      ]);
      let remoteEdits: EditItem[] = [];
      if (edits !== null) {
        remoteEdits = convertEditsToLineItems(edits.edits, false);
      }
      dispatch({
        type: ActionType.SCREEN_AND_DATA_LOADED,
        screenData: data,
        screenEdits: edits,
        remoteEdits,
        screen: processRawScreenData(screen, getState()),
      });
    } else {
      throw new Error(`Can't find the screen with rid=${screenRid}`);
    }
  };
}

export function clearCurrentScreenSelection() {
  return async (dispatch: Dispatch<{ type: ActionType.CLEAR_CURRENT_SCREEN }>, getState: () => TState) => {
    dispatch({
      type: ActionType.CLEAR_CURRENT_SCREEN,
    });
  };
}

export function copyScreenForCurrentTour(tour: P_RespTour | null, withScreen: P_RespScreen, shouldNavigate = true) {
  return async (dispatch: Dispatch<TTourWithData>, getState: () => TState) => {
    let tourAnyway: P_RespTour;
    if (!tour) {
      const data = await api<ReqNewTour, ApiResp<RespTour>>('/newtour', {
        auth: true,
        body: {
          name: 'Untitled', // default name if no name is given
          description: '',
        },
      });
      tourAnyway = processRawTourData(data.data, getState());
    } else {
      tourAnyway = tour;
    }

    const screenResp = await api<ReqCopyScreen, ApiResp<RespScreen>>('/copyscreen', {
      auth: true,
      body: {
        parentId: withScreen.id,
        tourRid: tourAnyway.rid,
      },
    });
    const screen = screenResp.data;

    // it does nto change the reducer data because the screen would be refreshed anyway
    if (shouldNavigate) {
      window.location.replace(`/tour/${tourAnyway.rid}/${screen.rid}`);
    } else {
      loadTourAndData(tourAnyway.rid, true)(dispatch, getState);
    }
  };
}

/* ************************************************************************* */

export interface TGetAllTours {
  type: ActionType.ALL_TOURS_LOADED;
  tours: Array<P_RespTour>;
}

export function getAllTours() {
  return async (dispatch: Dispatch<TGetAllTours | TGenericLoading>, getState: () => TState) => {
    dispatch({
      type: ActionType.ALL_TOURS_LOADING,
    });
    const data = await api<null, ApiResp<RespTour[]>>('/tours', { auth: true });
    dispatch({
      type: ActionType.ALL_TOURS_LOADED,
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
    // TODO[now]  should not be required any more
    // if (mode !== 'replace') {
    //   dispatch({ type: ActionType.GENERIC_LOADING, entity: 'tour' });
    // }

    const data = await api<ReqNewTour, ApiResp<RespTour>>('/newtour', {
      auth: true,
      body: {
        name: tourName,
        description,
      },
    });
    const tour = processRawTourData(data.data, getState());
    dispatch({
      type: ActionType.TOUR,
      tour,
      performedAction: mode,
    });
  };
}

/* ************************************************************************* */

export function renameTour(tour: P_RespTour, newVal: string) {
  return async (dispatch: Dispatch<TTour>, getState: () => TState) => {
    const data = await api<ReqRenameTour, ApiResp<RespTour>>('/renametour', {
      auth: true,
      body: {
        newName: newVal,
        rid: tour.rid,
      },
    });
    const renamedTour = processRawTourData(data.data, getState());
    dispatch({
      type: ActionType.TOUR,
      tour: renamedTour,
      performedAction: 'rename',
    });
  };
}

export interface TTourWithData {
  type: ActionType.TOUR_AND_DATA_LOADED;
  tour: P_RespTour;
  tourData: TourData;
  annotations: Record<string, IAnnotationConfig[]>;
  opts: ITourDataOpts;
  allCorrespondingScreens: boolean,
}

export function loadTourAndData(tourRid: string, shouldGetScreens = false) {
  return async (dispatch: Dispatch<TTourWithData>, getState: () => TState) => {
    const state = getState();
    let tour: P_RespTour;
    try {
      const data = await api<null, ApiResp<RespTour>>(`/tour?rid=${tourRid}${shouldGetScreens ? '&s=1' : ''}`);
      tour = processRawTourData(data.data, state);
    } catch (e) {
      throw new Error(`Error while loading tour and corresponding data ${(e as Error).message}`);
    }
    const data = await api<null, TourData>(tour!.dataFileUri.href);
    const nData = normalizeTourDataFile(data);
    const annotationAndOpts = getThemeAndAnnotationFromDataFile(nData);
    dispatch({
      type: ActionType.TOUR_AND_DATA_LOADED,
      tourData: nData,
      tour: processRawTourData(tour!, getState()),
      annotations: annotationAndOpts.annotations,
      opts: annotationAndOpts.opts,
      allCorrespondingScreens: shouldGetScreens,
    });
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
  opts: ITourDataOpts,
  isLocal: boolean,
}

export function saveTourData(tour: P_RespTour, data: TourDataWoScheme) {
  return async (dispatch: Dispatch<TSaveTourEntities>, getState: () => TState) => {
    const annotationAndOpts = getThemeAndAnnotationFromDataFile(data as TourData);
    dispatch({
      type: ActionType.SAVE_TOUR_ENTITIES,
      tour,
      data: getState().default.tourData,
      annotations: annotationAndOpts.annotations,
      opts: annotationAndOpts.opts,
      isLocal: true,
    });
  };
}

export function flushTourDataToMasterFile(tour: P_RespTour, localEdits: Partial<TourDataWoScheme>) {
  return async (dispatch: Dispatch<TSaveTourEntities>, getState: () => TState) => {
    const savedData = getState().default.tourData;
    if (savedData) {
      savedData.lastUpdatedAtUtc = getCurrentUtcUnixTime();
      const mergedMasterData = mergeTourData(savedData, localEdits, true);
      const mergedData = {
        ...savedData,
        ...mergedMasterData
      };

      const tourResp = await api<ReqRecordEdit, ApiResp<RespTour>>('/recordtredit', {
        auth: true,
        body: {
          rid: tour.rid,
          editData: JSON.stringify(mergedData),
        },
      });

      const annotationAndOpts = getThemeAndAnnotationFromDataFile(mergedData, false);
      dispatch({
        type: ActionType.SAVE_TOUR_ENTITIES,
        tour,
        data: mergedData,
        annotations: annotationAndOpts.annotations,
        opts: annotationAndOpts.opts,
        isLocal: false,
      });
    }
  };
}
