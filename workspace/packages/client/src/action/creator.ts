/* TODO There are some repetation of code across creators, fix those
 */

import api from '@fable/common/dist/api';
import {
  ApiResp,
  ReqCopyScreen,
  ReqNewOrg,
  ReqNewTour,
  ReqRecordEdit,
  ReqRenameGeneric,
  RespCommonConfig,
  RespOrg,
  RespScreen,
  RespTour,
  RespUser,
  ResponseStatus,
  ReqUpdateUser,
  ReqScreenTour,
  ScreenType,
  ReqDuplicateTour,
  RespTourWithScreens
} from '@fable/common/dist/api-contract';
import {
  EditFile,
  IAnnotationConfig,
  ITourDataOpts,
  ScreenData,
  TourData,
  TourDataWoScheme,
  TourScreenEntity
} from '@fable/common/dist/types';
import { deepcopy, getCurrentUtcUnixTime } from '@fable/common/dist/utils';
import { Dispatch } from 'react';
import { setUser } from '@sentry/react';
import {
  convertEditsToLineItems,
  getThemeAndAnnotationFromDataFile,
  groupScreens,
  mergeEdits,
  mergeTourData,
  processRawScreenData,
  processRawTourData,
  P_RespScreen,
  P_RespTour
} from '../entity-processor';
import { TState } from '../reducer';
import { AllEdits, EditItem, ElEditType, Ops } from '../types';
import ActionType from './type';

export interface TGenericLoading {
  type: ActionType.ALL_SCREENS_LOADING
      | ActionType.SCREEN_LOADING
      | ActionType.ALL_TOURS_LOADING
      | ActionType.USER_LOADING
      | ActionType.TOUR_LOADING
      | ActionType.ORG_LOADING ;
  shouldCache?: boolean;
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

export interface TAutosaving {
  type: ActionType.AUTOSAVING;
  isAutosaving: boolean;
}

export function startAutosaving() {
  return async (dispatch: Dispatch<TAutosaving>) => {
    dispatch({
      type: ActionType.AUTOSAVING,
      isAutosaving: true,
    });
  };
}

/* ************************************************************************* */

export interface TIAm {
  type: ActionType.IAM;
  user: RespUser;
}

export function iam() {
  return async (dispatch: Dispatch<TIAm | TGenericLoading>) => {
    dispatch({
      type: ActionType.USER_LOADING,
    });
    const data = await api<null, ApiResp<RespUser>>('/iam', { auth: true });
    const user = data.data;
    setUser({
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      org: user.belongsToOrg,
    });
    dispatch({
      type: ActionType.IAM,
      user
    });
  };
}

export interface TUpdateUser {
  type: ActionType.UPDATE_USER_PROP;
  user: RespUser;
}

export function updateUser(firstName: string, lastName: string) {
  return async () => {
    const data = await api<ReqUpdateUser, ApiResp<RespUser>>('/userprop', {
      auth: true,
      body: {
        firstName,
        lastName
      }
    });
  };
}

/* ************************************************************************* */

export interface TCreateNewOrg {
  type: ActionType.CREATE_NEW_ORG;
  org: RespOrg;
}

export function createOrg(displayName: string) {
  return async () => {
    const data = await api<ReqNewOrg, ApiResp<RespOrg>>('/neworg', {
      auth: true,
      body: {
        displayName,
        thumbnail: ''
      },
    });
  };
}

export interface TGetOrg {
  type: ActionType.GET_ORGS;
  orgs: RespOrg[];
}

export function fetchOrgs() {
  return async (dispatch: Dispatch<TGetOrg | TGenericLoading>) => {
    dispatch({
      type: ActionType.ORG_LOADING,
    });
    const data = await api<null, ApiResp<RespOrg[]>>('/orgforiam', { auth: true });
    const orgs = data.data;
    dispatch({
      type: ActionType.GET_ORGS,
      orgs,
    });
  };
}

export function assignImplicitOrgToUser() {
  return async () => {
    const data = await api<null, ApiResp<RespOrg>>('/assgnimplorg', { auth: true, method: 'POST' });
  };
}

/* ************************************************************************* */

export interface TGetAllScreens {
  type: ActionType.ALL_SCREENS_LOADED;
  allScreens: Array<P_RespScreen>;
  rootScreens: Array<P_RespScreen>;
  resetFromLocalState?: boolean;
}

export function getAllScreens(shouldRefreshIfPresent = true) {
  return async (dispatch: Dispatch<TGetAllScreens | TGenericLoading>, getState: () => TState) => {
    const state = getState().default;
    if (shouldRefreshIfPresent || state.rootScreens.length === 0) {
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
    } else {
      dispatch({
        type: ActionType.ALL_SCREENS_LOADED,
        allScreens: [],
        rootScreens: [],
        resetFromLocalState: true
      });
    }
  };
}

export interface TScreenWithData {
  type: ActionType.SCREEN_AND_DATA_LOADED;
  screenData: ScreenData;
  screenEdits: EditFile<AllEdits<ElEditType>> | null;
  remoteEdits: EditItem[];
  screen: P_RespScreen;
  preloading: boolean;
}

export interface TScreen {
  type: ActionType.SCREEN;
  screen: P_RespScreen;
  prevScreenRid?: string;
  performedAction: SupportedPerformedAction;
}

export function renameScreen(screen: P_RespScreen, newVal: string) {
  return async (dispatch: Dispatch<TScreen>, getState: () => TState) => {
    const data = await api<ReqRenameGeneric, ApiResp<RespScreen>>('/renamescreen', {
      auth: true,
      body: {
        newName: newVal,
        rid: screen.rid,
      },
    });
    const renamedScreen = processRawScreenData(data.data, getState());
    dispatch({
      type: ActionType.SCREEN,
      screen: renamedScreen,
      prevScreenRid: screen.rid,
      performedAction: 'rename',
    });

    // After we rename the screen, the rid changes, hence we have to update the url so that
    // the new url contains the renamed screen's rid
    const href = window.location.href;
    const hrefArr = href.split('/');
    const newHref = hrefArr.map(frag => {
      if (frag === screen.rid) {
        return renamedScreen.rid;
      }
      return frag;
    }).join('/');
    window.history.replaceState({}, '', newHref);
  };
}

export function loadScreenAndData(screenRid: string, shouldUseCache = false, preloading = false) {
  return async (dispatch: Dispatch<TScreenWithData | TGenericLoading>, getState: () => TState) => {
    if (!preloading) {
      // Only for screens that are not preloading (the current loading) set this true
      dispatch({
        type: ActionType.SCREEN_LOADING,
      });
    }

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

    const cacheDataAvailable = shouldUseCache && screen!.id in state.default.screenData;
    let data;
    let edits;
    let remoteEdits: EditItem[] = [];
    if (cacheDataAvailable) {
      data = state.default.screenData[screen!.id];
      remoteEdits = state.default.remoteEdits[screen!.id];
      edits = state.default.screenEdits[screen!.id];
    } else {
      [data, edits] = await Promise.all([
        api<null, ScreenData>(screen!.dataFileUri.href),
        screen!.parentScreenId
          ? api<null, EditFile<AllEdits<ElEditType>>>(screen!.editFileUri.href)
          : Promise.resolve(null),
      ]);
      if (edits !== null) {
        remoteEdits = convertEditsToLineItems(edits.edits, false);
      }
    }

    dispatch({
      type: ActionType.SCREEN_AND_DATA_LOADED,
      screenData: data,
      screenEdits: edits,
      remoteEdits,
      screen: processRawScreenData(screen!, getState()),
      preloading
    });
  };
}

export function clearCurrentScreenSelection() {
  return async (dispatch: Dispatch<{ type: ActionType.CLEAR_CURRENT_SCREEN }>, getState: () => TState) => {
    dispatch({
      type: ActionType.CLEAR_CURRENT_SCREEN,
    });
  };
}

export function clearRelayScreenAndAnnAdd() {
  return async (dispatch: Dispatch<{ type: ActionType.CLEAR_RELAY_SCREEN_ANN_ADD}>, getState: () => TState) => {
    dispatch({
      type: ActionType.CLEAR_RELAY_SCREEN_ANN_ADD,
    });
  };
}

export function clearCurrentTourSelection() {
  return async (dispatch: Dispatch<{ type: ActionType.CLEAR_CURRENT_TOUR }>, getState: () => TState) => {
    dispatch({
      type: ActionType.CLEAR_CURRENT_TOUR,
    });
  };
}

export interface TAddScreenEntities {
  type: ActionType.SAVE_TOUR_RELAY_ENTITIES;
  tour: P_RespTour;
  screenId: number;
  annAdd: AnnAdd;
}

export type AnnAdd = {
  pos: 'prev' | 'next',
  refId: string,
  screenId: number,
  grpId: string
}

export type AddScreenToTour = (
  screen: P_RespScreen,
  tourRid: string,
  shouldNavigate: boolean,
  annAdd?: AnnAdd
) => void;

export function addScreenToTour(
  screen: P_RespScreen,
  tourRid: string,
  shouldNavigate: boolean,
  annAdd?: AnnAdd,
) {
  return async (dispatch: Dispatch<TAddScreenEntities | TTourWithData | TGenericLoading>, getState: () => TState) => {
    let screenResp: ApiResp<RespScreen>;
    if (screen.type === ScreenType.SerDom) {
      screenResp = await api<ReqCopyScreen, ApiResp<RespScreen>>('/copyscreen', {
        auth: true,
        body: {
          parentId: screen.id,
          tourRid,
        },
      });
    } else {
      screenResp = await api<ReqScreenTour, ApiResp<RespScreen>>('/astsrntotour', {
        method: 'POST',
        body: {
          screenRid: screen.rid,
          tourRid,
        },
      });
    }

    if (annAdd) {
      try {
        const data = await api<null, ApiResp<RespTour>>(`/tour?rid=${tourRid}&s=1`);
        const updatedTour = processRawTourData(data.data, getState());

        dispatch({
          type: ActionType.SAVE_TOUR_RELAY_ENTITIES,
          tour: updatedTour,
          screenId: screenResp.data.id,
          annAdd,
        });
      } catch (e) {
        throw new Error(`Error while loading tour and corresponding data ${(e as Error).message}`);
      }

      return;
    }

    if (shouldNavigate) {
      window.location.replace(`/tour/${tourRid}/${screenResp.data.rid}`);
    } else {
      loadTourAndData(tourRid, true, false)(dispatch as Dispatch<TTourWithData | TGenericLoading>, getState);
    }
  };
}

/* ************************************************************************* */

export interface TGetAllTours {
  type: ActionType.ALL_TOURS_LOADED;
  tours: Array<P_RespTour>;
}

export function getAllTours(shouldRefreshIfPresent = true) {
  return async (dispatch: Dispatch<TGetAllTours | TGenericLoading>, getState: () => TState) => {
    const state = getState().default;
    if (shouldRefreshIfPresent || state.tours.length === 0) {
      dispatch({
        type: ActionType.ALL_TOURS_LOADING,
      });
      const data = await api<null, ApiResp<RespTour[]>>('/tours', { auth: true });
      dispatch({
        type: ActionType.ALL_TOURS_LOADED,
        tours: data.data.map((d: RespTour) => processRawTourData(d, getState())),
      });
    }
  };
}

/* ************************************************************************* */

type SupportedPerformedAction = 'new' | 'get' | 'rename' | 'replace';
export interface TTour {
  type: ActionType.TOUR;
  tour: P_RespTour;
  oldTourRid: string;
  performedAction: SupportedPerformedAction;
}

export function createNewTour(shouldNavigate = false, tourName = 'Untitled', mode: SupportedPerformedAction = 'new') {
  return async (dispatch: Dispatch<TTour | TGenericLoading>, getState: () => TState) => {
    const data = await api<ReqNewTour, ApiResp<RespTour>>('/newtour', {
      auth: true,
      body: {
        name: tourName,
        description: '',
      },
    });
    const tour = processRawTourData(data.data, getState());
    if (shouldNavigate) {
      window.location.replace(`/tour/${tour.rid}`);
    }
    dispatch({
      type: ActionType.TOUR,
      tour,
      oldTourRid: '',
      performedAction: mode,
    });
  };
}

/* ************************************************************************* */

export function renameTour(tour: P_RespTour, newVal: string) {
  return async (dispatch: Dispatch<TTour>, getState: () => TState) => {
    const data = await api<ReqRenameGeneric, ApiResp<RespTour>>('/renametour', {
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
      oldTourRid: tour.rid,
      performedAction: 'rename',
    });
  };
}

export interface TOpsInProgress {
  type: ActionType.OPS_IN_PROGRESS;
  ops: Ops
}

export function duplicateTour(tour: P_RespTour, newVal: string) {
  return async (dispatch: Dispatch<TTour | TOpsInProgress | TAutosaving>, getState: () => TState) => {
    startAutosaving();
    dispatch({
      type: ActionType.OPS_IN_PROGRESS,
      ops: Ops.DuplicateTour,
    });

    const data = await api<ReqDuplicateTour, ApiResp<RespTourWithScreens>>('/duptour', {
      auth: true,
      body: {
        duplicateTourName: newVal,
        fromTourRid: tour.rid,
      },
    });
    const duplicatedTour = processRawTourData(data.data, getState());
    const idxm = data.data.idxm;
    if (idxm) {
      const tourDataFile = await api<null, TourData>(duplicatedTour.dataFileUri.href);
      // update the old screen index with new one
      const newEntities: typeof tourDataFile.entities = {};
      for (const [screenId, entity] of Object.entries(tourDataFile.entities)) {
        if (screenId in idxm) {
          const newEntity = deepcopy(entity);
          const newScreenId = idxm[screenId];

          if (newEntity.type === 'screen') {
            const tNewEntity = newEntity as TourScreenEntity;
            for (const ann of Object.values(tNewEntity.annotations)) {
              for (const btn of ann.buttons) {
                if (btn.hotspot && btn.hotspot.actionType === 'navigate') {
                  const actionValueSplit = btn.hotspot.actionValue.split('/');
                  if (actionValueSplit[0] in idxm) {
                    actionValueSplit[0] = idxm[actionValueSplit[0]];
                    btn.hotspot.actionValue = actionValueSplit.join('/');
                  }
                }
              }
            }
          }

          newEntity.ref = newScreenId;
          newEntities[newScreenId] = newEntity;
        } else {
          newEntities[screenId] = entity;
        }
      }
      tourDataFile.entities = newEntities;

      if (tourDataFile.opts.main) {
        const mainSplit = tourDataFile.opts.main.split('/');
        if (mainSplit[0] in idxm) {
          mainSplit[0] = idxm[mainSplit[0]];
          tourDataFile.opts.main = mainSplit.join('/');
        }
      }

      await api<ReqRecordEdit, ApiResp<RespTour>>('/recordtredit', {
        auth: true,
        body: {
          rid: duplicatedTour.rid,
          editData: JSON.stringify(tourDataFile),
        },
      });
    }
    dispatch({
      type: ActionType.TOUR,
      tour: duplicatedTour,
      oldTourRid: '',
      performedAction: 'new',
    });

    dispatch({
      type: ActionType.AUTOSAVING,
      isAutosaving: false
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

export function loadTourAndData(tourRid: string, shouldGetScreens = false, isFreshLoading = true) {
  return async (dispatch: Dispatch<TTourWithData | TGenericLoading>, getState: () => TState) => {
    const state = getState();
    if (isFreshLoading) {
      dispatch({
        type: ActionType.TOUR_LOADING,
      });
    }

    let tour: P_RespTour;
    try {
      const data = await api<null, ApiResp<RespTour>>(`/tour?rid=${tourRid}${shouldGetScreens ? '&s=1' : ''}`);
      tour = processRawTourData(data.data, state);
    } catch (e) {
      throw new Error(`Error while loading tour and corresponding data ${(e as Error).message}`);
    }
    const data = await api<null, TourData>(tour!.dataFileUri.href);
    const annotationAndOpts = getThemeAndAnnotationFromDataFile(data, false);
    dispatch({
      type: ActionType.TOUR_AND_DATA_LOADED,
      tourData: data,
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
  return async (dispatch: Dispatch<TSaveEditChunks | TAutosaving>, getState: () => TState) => {
    const savedEditData = getState().default.screenEdits[screen.id];
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

    dispatch({
      type: ActionType.AUTOSAVING,
      isAutosaving: false
    });
  };
}

/* ************************************************************************* */

export interface TSaveTourEntities {
  type: ActionType.SAVE_TOUR_ENTITIES;
  tour: P_RespTour;
  data: TourData | null,
  annotations: Record<string, IAnnotationConfig[]>,
  idMap: Record<string, string[]>,
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
      idMap: annotationAndOpts.annotationsIdMap,
      isLocal: true,
    });
  };
}

export function flushTourDataToMasterFile(tour: P_RespTour, localEdits: Partial<TourDataWoScheme>) {
  return async (dispatch: Dispatch<TSaveTourEntities | TAutosaving>, getState: () => TState) => {
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
        idMap: annotationAndOpts.annotationsIdMap,
        opts: annotationAndOpts.opts,
        isLocal: false,
      });
    }

    dispatch({
      type: ActionType.AUTOSAVING,
      isAutosaving: false
    });
  };
}
