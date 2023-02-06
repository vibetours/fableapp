import { Action } from 'redux';
import { RespCommonConfig } from '@fable/common/dist/api-contract';
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
} from '../action/creator';
import { remoteToLocalAnnotationConfigMap, P_RespScreen, P_RespTour } from '../entity-processor';
import { AllEdits, EditItem, ElEditType } from '../types';

export const initialState: {
  inited: boolean;
  principalFetched: boolean;
  commonConfig: RespCommonConfig | null;
  rootScreens: Array<P_RespScreen>;
  allScreens: Array<P_RespScreen>;
  allScreensLoadingStatus: LoadingStatus;
  tours: Array<P_RespTour>;
  allToursLoadingStatus: LoadingStatus;
  screenData: ScreenData | null;
  screenEdits: EditFile<AllEdits<ElEditType>> | null;
  currentScreen: P_RespScreen | null;
  screenLoadingStatus: LoadingStatus;
  currentTour: P_RespTour | null;
  newTourLoadingStatus: LoadingStatus;
  newScreenLoadingStatus: LoadingStatus;
  tourData: TourData | null;
  tourLoaded: boolean;
  localEdits: Record<string, EditItem[]>;
  remoteEdits: Record<string, EditItem[]>;
  // TODO remote + local edits in one state for one time consumption
  localAnnotations: Record<string, IAnnotationConfig[]>;
  remoteAnnotations: Record<string, IAnnotationConfig[]>;
  // TODO remote + local annotation changes in one state for one time consumption
  remoteTourOpts: ITourDataOpts | null;
  localTourOpts: ITourDataOpts | null;
  // TODO remote + local opts changes in one state for one time consumption
} = {
  inited: false,
  commonConfig: null,
  principalFetched: false,
  rootScreens: [],
  allScreens: [],
  allScreensLoadingStatus: LoadingStatus.NotStarted,
  tours: [],
  allToursLoadingStatus: LoadingStatus.NotStarted,
  currentScreen: null,
  screenData: null,
  screenEdits: null,
  screenLoadingStatus: LoadingStatus.NotStarted,
  currentTour: null,
  newTourLoadingStatus: LoadingStatus.NotStarted,
  newScreenLoadingStatus: LoadingStatus.NotStarted,
  tourData: null,
  tourLoaded: false,
  localEdits: {},
  remoteEdits: {},
  localAnnotations: {},
  remoteAnnotations: {},
  localTourOpts: null,
  remoteTourOpts: null,
};

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
      newState.allScreens = tAction.allScreens;
      newState.rootScreens = tAction.rootScreens;
      newState.allScreensLoadingStatus = LoadingStatus.Done;
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

    case ActionType.TOUR: {
      const tAction = action as TTour;
      const newState = { ...state };
      newState.currentTour = tAction.tour;
      if (tAction.performedAction === 'new') newState.newTourLoadingStatus = LoadingStatus.Done;
      return newState;
    }

    case ActionType.SCREEN: {
      const tAction = action as TScreen;
      const newState = { ...state };
      newState.currentScreen = tAction.screen;
      if (tAction.performedAction === 'new') newState.newScreenLoadingStatus = LoadingStatus.Done;
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

    case ActionType.CLEAR_CURRENT_TOUR: {
      const newState = { ...state };
      newState.currentTour = null;
      newState.newTourLoadingStatus = LoadingStatus.NotStarted;
      return newState;
    }

    case ActionType.SCREEN_AND_DATA_LOADED: {
      const tAction = action as TScreenWithData;
      const newState = { ...state };
      newState.currentScreen = tAction.screen;
      newState.screenData = tAction.screenData;
      newState.screenEdits = tAction.screenEdits;
      newState.screenLoadingStatus = LoadingStatus.Done;
      newState.remoteEdits[tAction.screen.id] = tAction.remoteEdits;
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
        newState.screenEdits = tAction.editFile!;
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
