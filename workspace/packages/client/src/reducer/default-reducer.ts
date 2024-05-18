import { Action } from 'redux';
import {
  RespCommonConfig,
  RespOrg,
  RespUser
} from '@fable/common/dist/api-contract';
import {
  JourneyData,
  EditFile,
  IAnnotationConfig,
  ITourDataOpts,
  ITourLoaderData,
  LoadingStatus,
  ScreenData,
  TourData,
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
  TOrg,
  TOpsInProgress,
  TAddScreenEntities,
  AnnAdd,
  TAutosaving,
  TTourDelete,
  TSubs,
  TGetAllUsers,
  TUserPropChange,
  TTourWithLoader,
  TSaveTourLoader,
  TAutosavingLoader,
  TScreenUpdate,
  TShowPaymentModal,
  TTourPublished,
  TElpath,
  TGetAllUserOrgs,
} from '../action/creator';
import { P_RespScreen, P_RespTour, P_RespSubscription } from '../entity-processor';
import { AllEdits, EditItem, ElEditType, ElPathKey, Ops } from '../types';

export const initialState: {
  allUserOrgs: RespOrg[] | null;
  inited: boolean;
  commonConfig: RespCommonConfig | null;
  rootScreens: Array<P_RespScreen>;
  allScreens: Array<P_RespScreen>;
  principal: RespUser | null;
  principalLoadingStatus: LoadingStatus;
  org: RespOrg | null;
  subs: P_RespSubscription | null;
  orgsLoadingStatus: LoadingStatus;
  allScreensLoadingStatus: LoadingStatus;
  allUsersLoadingStatus: LoadingStatus;
  users: Array<RespUser>;
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
  localAnnotationsIdMap: Record<string, string[]>;
  remoteAnnotations: Record<string, IAnnotationConfig[]>;
  // TODO remote + local opts changes in one state for one time consumption
  remoteTourOpts: ITourDataOpts | null;
  localTourOpts: ITourDataOpts | null;
  tourLoaderData: ITourLoaderData | null;
  token : string;
  relayScreenId: number | null;
  relayAnnAdd: AnnAdd | null;
  isAutoSaving: boolean;
  isAutoSavingLoader: boolean;
  allScreensForCurrentTourLoadingStatus: LoadingStatus;
  journey: JourneyData | null;
  defaultTourLoadingStatus: LoadingStatus;
  isPaymentModalShown: boolean;
  elpathKey: ElPathKey;
} = {
  allUserOrgs: null,
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
  org: null,
  subs: null,
  allUsersLoadingStatus: LoadingStatus.NotStarted,
  users: [],
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
  localAnnotationsIdMap: {},
  remoteAnnotations: {},
  localTourOpts: null,
  remoteTourOpts: null,
  tourLoaderData: null,
  token: '',
  relayScreenId: null,
  relayAnnAdd: null,
  isAutoSaving: false,
  isAutoSavingLoader: false,
  allScreensForCurrentTourLoadingStatus: LoadingStatus.NotStarted,
  journey: null,
  defaultTourLoadingStatus: LoadingStatus.NotStarted,
  isPaymentModalShown: false,
  elpathKey: 'id'
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
      return newState;
    }

    case ActionType.ALL_SCREENS_LOADED: {
      const tAction = action as TGetAllScreens;
      const newState = { ...state };
      if (tAction.resetFromLocalState) {
        newState.rootScreens = state.rootScreens.slice(0);
        newState.allScreensLoadingStatus = LoadingStatus.Done;
      } else {
        newState.rootScreens = tAction.rootScreens;
        newState.allScreensLoadingStatus = LoadingStatus.Done;
      }
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

    case ActionType.ALL_USER_ORGS_LOADED: {
      const tAction = action as TGetAllUserOrgs;
      const newState = { ...state };
      newState.allUserOrgs = tAction.orgs;
      return newState;
    }

    case ActionType.ORG_LOADING: {
      const newState = { ...state };
      newState.orgsLoadingStatus = LoadingStatus.InProgress;
      return newState;
    }

    case ActionType.ORG: {
      const tAction = action as TOrg;
      const newState = { ...state };
      newState.org = tAction.org;
      newState.orgsLoadingStatus = LoadingStatus.Done;
      return newState;
    }

    case ActionType.SUBS: {
      const tAction = action as TSubs;
      const newState = { ...state };
      newState.subs = tAction.subs;
      return newState;
    }

    case ActionType.ALL_USERS_FOR_ORG_LOADING: {
      const newState = { ...state };
      newState.allUsersLoadingStatus = LoadingStatus.InProgress;
      return newState;
    }

    case ActionType.ALL_USERS_FOR_ORG_LOADED: {
      const tAction = action as TGetAllUsers;
      const newState = { ...state };
      newState.users = tAction.users;
      newState.allUsersLoadingStatus = LoadingStatus.Done;
      return newState;
    }

    case ActionType.USER_UPDATED: {
      const tAction = action as TUserPropChange;
      const newState = { ...state };
      const newUsers = newState.users.map(u => {
        if (u.id === tAction.user.id) return tAction.user;
        return u;
      });
      newState.users = newUsers;
      return newState;
    }

    case ActionType.ALL_TOURS_LOADING: {
      const newState = { ...state };
      newState.allToursLoadingStatus = LoadingStatus.InProgress;
      newState.currentTour = null;
      newState.tourLoaded = false;
      return newState;
    }

    case ActionType.ALL_TOURS_LOADED: {
      const tAction = action as TGetAllTours;
      const newState = { ...state };
      newState.tours = tAction.tours;
      newState.allToursLoadingStatus = LoadingStatus.Done;
      return newState;
    }

    case ActionType.AUTOSAVING: {
      const tAction = action as TAutosaving;
      const newState = { ...state };
      newState.isAutoSaving = tAction.isAutosaving;
      return newState;
    }

    case ActionType.AUTOSAVING_LOADER: {
      const tAction = action as TAutosavingLoader;
      const newState = { ...state };
      newState.isAutoSavingLoader = tAction.isAutosavingLoader;
      return newState;
    }

    case ActionType.OPS_IN_PROGRESS: {
      const tAction = action as TOpsInProgress;
      const newState = { ...state };
      newState.opsInProgress = tAction.ops;
      return newState;
    }

    case ActionType.SHOW_PAYMENT_MODAL: {
      const tAction = action as TShowPaymentModal;
      const newState = { ...state };
      newState.isPaymentModalShown = tAction.show;
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
      } else if (tAction.performedAction === 'publish' || tAction.performedAction === 'edit') {
        const updatedTour = {
          ...tAction.tour,
          screens: state.currentTour?.screens?.slice(0)
        };
        newState.currentTour = updatedTour;
        newState.tours = state.tours.map(tour => (tour.rid === updatedTour.rid ? updatedTour : tour));
      }
      newState.opsInProgress = Ops.None;
      return newState;
    }

    case ActionType.DELETE_TOUR: {
      const tAction = action as TTourDelete;
      const newState = { ...state };
      newState.tours = newState.tours.filter(tour => tour.rid !== tAction.ridOfTourToBeDeleted);
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

    case ActionType.SCREEN_UPDATE: {
      const tAction = action as TScreenUpdate;
      const newState = { ...state };

      newState.allScreens = replaceScreens(newState.allScreens, tAction.updatedScreen.rid, tAction.updatedScreen);

      if (newState.currentTour && newState.currentTour.screens && newState.currentTour.screens.length) {
        newState.currentTour.screens = replaceScreens(
          newState.currentTour.screens,
          tAction.updatedScreen.rid,
          tAction.updatedScreen
        );
      }

      if (newState.currentScreen && newState.currentScreen.rid === tAction.updatedScreen.rid) {
        newState.currentScreen = tAction.updatedScreen;
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
      newState.tourLoaderData = null;
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

    case ActionType.TOUR_AND_LOADER_LOADED: {
      const tAction = action as TTourWithLoader;
      const newState = { ...state };
      newState.currentTour = tAction.tour;
      newState.tourLoaderData = tAction.loader;
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
      newState.journey = tAction.journey;

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
        newState.localEdits[tAction.screenId] = [...tAction.editList];
      } else {
        newState.remoteEdits[tAction.screenId] = [...tAction.editList];
        newState.localEdits[tAction.screenId] = [];
        newState.screenEdits[tAction.screenId] = tAction.editFile!;
      }
      return newState;
    }

    case ActionType.SAVE_TOUR_ENTITIES: {
      const tAction = action as TSaveTourEntities;
      const newState = { ...state };
      if (tAction.isLocal) {
        newState.localTourOpts = tAction.opts;
        newState.localAnnotations = tAction.annotations;
        newState.localAnnotationsIdMap = tAction.idMap;
        newState.journey = tAction.journey;
      } else {
        newState.localTourOpts = null;
        newState.localAnnotations = {};
        newState.localAnnotationsIdMap = {};
        newState.remoteAnnotations = tAction.annotations;
        newState.remoteTourOpts = tAction.opts;
        newState.tourData = tAction.data;
        newState.journey = tAction.journey;
      }
      return newState;
    }

    case ActionType.SAVE_TOUR_LOADER: {
      const tAction = action as TSaveTourLoader;
      const newState = { ...state };
      newState.tourLoaderData = tAction.loader;
      newState.isAutoSavingLoader = false;
      return newState;
    }

    case ActionType.SAVE_TOUR_RELAY_ENTITIES: {
      const tAction = action as TAddScreenEntities;
      const newState = { ...state };
      newState.currentTour = tAction.tour;
      newState.allScreens = tAction.tour.screens || [];
      newState.relayScreenId = tAction.screenId;
      newState.relayAnnAdd = tAction.annAdd;
      return newState;
    }

    case ActionType.CLEAR_RELAY_SCREEN_ANN_ADD: {
      const newState = { ...state };
      newState.relayScreenId = null;
      newState.relayAnnAdd = null;
      return newState;
    }

    case ActionType.DEFAULT_TOUR_LOADED: {
      const newState = { ...state };
      newState.defaultTourLoadingStatus = LoadingStatus.Done;
      return newState;
    }

    case ActionType.TOUR_LOADED: {
      const tAction = action as TTourPublished;
      const newState = { ...state };
      newState.currentTour = tAction.tour;

      return newState;
    }

    case ActionType.UPDATE_ELPATH: {
      const tAction = action as TElpath;
      const newState = { ...state };
      newState.elpathKey = tAction.elPath;

      return newState;
    }

    default:
      return state;
  }
}
