import { Action } from 'redux';
import { RespCommonConfig, RespOrg, RespUser } from '@fable/common/dist/api-contract';
import {
  EditFile,
  IAnnotationConfig,
  ITourDataOpts,
  LoadingStatus,
  ScreenData,
  TourData
} from '@fable/common/dist/types';
import ActionType from '../action/type';
import {
  TGenericLoading,
  TGetAllScreens,
  TGetAllTours,
  TInitialize,
  TSaveEditChunks,
  TSaveTourEntities,
  TScreen,
  TScreenWithData,
  TTour,
  TTourWithData,
  TIAm,
  TGetOrg,
  TOpsInProgress
} from '../action/creator';
import { remoteToLocalAnnotationConfigMap, P_RespScreen, P_RespTour } from '../entity-processor';
import { AllEdits, EditItem, ElEditType, Ops } from '../types';

export const initialState: {
  inited: boolean;
  commonConfig: RespCommonConfig | null;
  rootScreens: Array<P_RespScreen>;
  allScreens: Array<P_RespScreen>;
  principal: RespUser | null;
  principalLoadingStatus: LoadingStatus;
  orgs: RespOrg[];
  orgsLoadingStatus: LoadingStatus;
  allScreensLoadingStatus: LoadingStatus;
  tours: Array<P_RespTour>;
  allToursLoadingStatus: LoadingStatus;
  screenData: Record<string, ScreenData>;
  screenEdits: Record<string, EditFile<AllEdits<ElEditType>> | null>;
  currentScreen: P_RespScreen | null;
  screenLoadingStatus: LoadingStatus;
  currentTour: P_RespTour | null;
  newTourLoadingStatus: LoadingStatus;
  newScreenLoadingStatus: LoadingStatus;
  tourData: TourData | null;
  tourLoaded: boolean;
  opsInProgress: Ops;
  // TODO remote + local edits in one state for one time consumption
  localEdits: Record<string, EditItem[]>;
  remoteEdits: Record<string, EditItem[]>;
  // TODO remote + local annotation changes in one state for one time consumption
  localAnnotations: Record<string, IAnnotationConfig[]>;
  remoteAnnotations: Record<string, IAnnotationConfig[]>;
  // TODO remote + local opts changes in one state for one time consumption
  remoteTourOpts: ITourDataOpts | null;
  localTourOpts: ITourDataOpts | null;
  token : string;
} = {
  inited: false,
  commonConfig: null,
  rootScreens: [],
  allScreens: [],
  allScreensLoadingStatus: LoadingStatus.NotStarted,
  tours: [],
  allToursLoadingStatus: LoadingStatus.NotStarted,
  principalLoadingStatus: LoadingStatus.NotStarted,
  orgsLoadingStatus: LoadingStatus.NotStarted,
  principal: null,
  orgs: [],
  currentScreen: null,
  screenData: {},
  screenEdits: {},
  screenLoadingStatus: LoadingStatus.NotStarted,
  currentTour: null,
  newTourLoadingStatus: LoadingStatus.NotStarted,
  newScreenLoadingStatus: LoadingStatus.NotStarted,
  tourData: null,
  tourLoaded: false,
  opsInProgress: Ops.None,
  localEdits: {},
  remoteEdits: {},
  localAnnotations: {},
  remoteAnnotations: {},
  localTourOpts: null,
  remoteTourOpts: null,
  token: '',
};

function replaceScreens(oldScreens: P_RespScreen[], replaceScreen: string, replaceScreenWith: P_RespScreen) {
  const newScreens = oldScreens.slice(0);
  const idx = newScreens.findIndex(screen => screen.rid === replaceScreen);
  if (idx > -1) {
    newScreens[idx] = replaceScreenWith;
    return newScreens;
  }
  return oldScreens;
}

// eslint-disable-next-line default-param-last
export default function projectReducer(state = initialState, action: Action) {
  switch (action.type) {
    case ActionType.INIT: {
      const tAction = action as TInitialize;
      const newState = { ...state };
      newState.commonConfig = tAction.config;
      newState.inited = true;
      return newState;
    }

    case ActionType.ALL_SCREENS_LOADING: {
      const newState = { ...state };
      newState.allScreensLoadingStatus = LoadingStatus.InProgress;
      newState.currentTour = null;
      return newState;
    }

    case ActionType.ALL_SCREENS_LOADED: {
      const tAction = action as TGetAllScreens;
      const newState = { ...state };
      // newState.allScreens = tAction.allScreens;
      newState.rootScreens = tAction.rootScreens;
      newState.allScreensLoadingStatus = LoadingStatus.Done;
      return newState;
    }

    case ActionType.USER_LOADING: {
      const newState = { ...state };
      newState.principalLoadingStatus = LoadingStatus.InProgress;
      return newState;
    }

    case ActionType.IAM: {
      const tAction = action as TIAm;
      const newState = { ...state };
      newState.principalLoadingStatus = LoadingStatus.Done;
      newState.principal = tAction.user;
      return newState;
    }

    case ActionType.ORG_LOADING: {
      const newState = { ...state };
      newState.orgsLoadingStatus = LoadingStatus.InProgress;
      return newState;
    }

    case ActionType.GET_ORGS: {
      const tAction = action as TGetOrg;
      const newState = { ...state };
      newState.orgs = tAction.orgs;
      newState.orgsLoadingStatus = LoadingStatus.Done;
      return newState;
    }

    case ActionType.ALL_TOURS_LOADING: {
      const newState = { ...state };
      newState.allToursLoadingStatus = LoadingStatus.InProgress;
      newState.currentTour = null;
      return newState;
    }

    case ActionType.ALL_TOURS_LOADED: {
      const tAction = action as TGetAllTours;
      const newState = { ...state };
      newState.tours = tAction.tours;
      newState.allToursLoadingStatus = LoadingStatus.Done;
      return newState;
    }

    case ActionType.OPS_IN_PROGRESS: {
      const tAction = action as TOpsInProgress;
      const newState = { ...state };
      newState.opsInProgress = tAction.ops;
      return newState;
    }

    case ActionType.TOUR: {
      const tAction = action as TTour;
      const newState = { ...state };

      newState.currentTour = tAction.tour;
      if (tAction.performedAction === 'new') {
        newState.newTourLoadingStatus = LoadingStatus.Done;
        const tours = newState.tours.slice(0);
        tours.unshift(tAction.tour);
        newState.tours = tours;
      } else if (tAction.performedAction === 'rename') {
        const tours = newState.tours.slice(0);
        const index = tours.findIndex(tour => tour.rid === tAction.oldTourRid);
        if (index !== -1) {
          tours.splice(index, 1);
        }
        tours.unshift(tAction.tour);
        newState.tours = tours;
      }
      newState.opsInProgress = Ops.None;
      return newState;
    }

    case ActionType.SCREEN: {
      const tAction = action as TScreen;
      const newState = { ...state };
      newState.currentScreen = tAction.screen;
      if (tAction.performedAction === 'new') newState.newScreenLoadingStatus = LoadingStatus.Done;
      if (tAction.performedAction === 'rename' && tAction.prevScreenRid) {
        newState.allScreens = replaceScreens(newState.allScreens, tAction.prevScreenRid, tAction.screen);
        if (newState.currentTour?.screens && newState.currentTour?.screens.length) {
          newState.currentTour.screens = replaceScreens(newState.currentTour.screens, tAction.prevScreenRid, tAction.screen);
        }
      }
      return newState;
    }

    case ActionType.SCREEN_LOADING: {
      const newState = { ...state };
      newState.screenLoadingStatus = LoadingStatus.InProgress;
      return newState;
    }

    case ActionType.CLEAR_CURRENT_SCREEN: {
      const newState = { ...state };
      newState.currentScreen = null;
      newState.screenLoadingStatus = LoadingStatus.NotStarted;
      return newState;
    }

    case ActionType.TOUR_LOADING: {
      const newState = { ...state };
      newState.tourLoaded = false;
      return newState;
    }

    case ActionType.CLEAR_CURRENT_TOUR: {
      const newState = { ...state };
      newState.currentTour = null;
      newState.tourData = null;
      newState.remoteTourOpts = null;
      newState.remoteAnnotations = {};
      newState.tourLoaded = false;
      newState.allScreens = [];
      newState.newTourLoadingStatus = LoadingStatus.NotStarted;
      return newState;
    }

    case ActionType.SCREEN_AND_DATA_LOADED: {
      const tAction = action as TScreenWithData;
      const newState = { ...state };
      if (!tAction.preloading) {
        // If a screen is being preloaded then don't change the current screen and loading status
        newState.currentScreen = tAction.screen;
        newState.screenLoadingStatus = LoadingStatus.Done;
      }
      newState.screenData = {
        ...newState.screenData,
        [tAction.screen.id]: tAction.screenData,
      };
      newState.screenEdits = {
        ...newState.screenEdits,
        [tAction.screen.id]: tAction.screenEdits,
      };
      newState.remoteEdits = {
        ...newState.remoteEdits,
        [tAction.screen.id]: tAction.remoteEdits
      };
      return newState;
    }

    case ActionType.TOUR_AND_DATA_LOADED: {
      const tAction = action as TTourWithData;
      const newState = { ...state };
      newState.currentTour = tAction.tour;
      newState.tourData = tAction.tourData;
      newState.remoteAnnotations = tAction.annotations;
      newState.remoteTourOpts = tAction.opts;
      newState.tourLoaded = true;
      if (tAction.allCorrespondingScreens && tAction.tour.screens) {
        newState.allScreens = tAction.tour.screens;
      }
      return newState;
    }

    case ActionType.GENERIC_LOADING: {
      const tAction = action as TGenericLoading;
      const newState = { ...state };
      return newState;
    }

    case ActionType.SAVE_EDIT_CHUNKS: {
      const tAction = action as TSaveEditChunks;
      const newState = { ...state };
      if (tAction.isLocal) {
        newState.localEdits[tAction.screen.id] = [...tAction.editList];
      } else {
        newState.remoteEdits[tAction.screen.id] = [...tAction.editList];
        newState.localEdits[tAction.screen.id] = [];
        newState.screenEdits[tAction.screen.id] = tAction.editFile!;
      }
      return newState;
    }

    case ActionType.SAVE_TOUR_ENTITIES: {
      const tAction = action as TSaveTourEntities;
      const newState = { ...state };
      if (tAction.isLocal) {
        newState.localTourOpts = tAction.opts;
        newState.localAnnotations = tAction.annotations;
      } else {
        newState.localTourOpts = null;
        newState.localAnnotations = {};
        newState.remoteAnnotations = tAction.annotations;
        newState.remoteTourOpts = tAction.opts;
        newState.tourData = tAction.data;
      }
      return newState;
    }

    default:
      return state;
  }
}
