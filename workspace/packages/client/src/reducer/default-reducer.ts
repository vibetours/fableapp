import { Action } from 'redux';
import { RespCommonConfig } from '@fable/common/dist/api-contract';
import { LoadingStatus, ScreenData, TourData, ScreenEdits } from '@fable/common/dist/types';
import ActionType from '../action/type';
import {
  TGenericLoading,
  TGetAllScreens,
  TGetAllTours,
  TInitialize,
  TScreenWithData,
  TTour,
  TTourWithData,
} from '../action/creator';
import { P_RespScreen, P_RespTour } from '../entity-processor';

export const initialState: {
  commonConfig: RespCommonConfig | null;
  screens: Array<P_RespScreen>;
  tours: Array<P_RespTour>;
  inited: boolean;
  principalFetched: boolean;
  screenLoaded: boolean;
  screenData: ScreenData | null;
  screenEdits: ScreenEdits | null;
  currentScreen: P_RespScreen | null;
  currentTour: P_RespTour | null;
  newTourLoadingStatus: LoadingStatus;
  tourData: TourData | null;
  tourLoaded: boolean;
} = {
  screens: [],
  tours: [],
  commonConfig: null,
  inited: false,
  principalFetched: false,
  screenLoaded: false,
  screenData: null,
  currentScreen: null,
  currentTour: null,
  screenEdits: null,
  newTourLoadingStatus: LoadingStatus.NotStarted,
  tourData: null,
  tourLoaded: false,
};

// eslint-disable-next-line default-param-last
export default function projectReducer(state = initialState, action: Action) {
  switch (action.type) {
    case ActionType.ALL_SCREENS_RETRIEVED: {
      const tAction = action as TGetAllScreens;
      const newState = { ...state };
      newState.screens = tAction.screens;
      return newState;
    }

    case ActionType.ALL_TOURS_RETRIEVED: {
      const tAction = action as TGetAllTours;
      const newState = { ...state };
      newState.tours = tAction.tours;
      newState.currentTour = null;
      return newState;
    }

    case ActionType.TOUR: {
      const tAction = action as TTour;
      const newState = { ...state };
      newState.currentTour = tAction.tour;
      if (tAction.performedAction === 'new') newState.newTourLoadingStatus = LoadingStatus.Done;
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
      newState.screenEdits = tAction.screenEdits;
      newState.screenLoaded = true;
      return newState;
    }

    case ActionType.TOUR_AND_DATA_LOADED: {
      const tAction = action as TTourWithData;
      const newState = { ...state };
      newState.currentTour = tAction.tour;
      newState.tourData = tAction.tourData;
      newState.tourLoaded = true;
      return newState;
    }

    case ActionType.GENERIC_LOADING: {
      const tAction = action as TGenericLoading;
      const newState = { ...state };
      if (tAction.entity === 'tour') newState.newTourLoadingStatus = LoadingStatus.InProgress;
      return newState;
    }

    default:
      return state;
  }
}
