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
  RespDemoEntity,
  RespUser,
  ReqScreenTour,
  ScreenType,
  ReqDuplicateTour,
  RespDemoEntityWithSubEntities,
  ReqNewScreen,
  ReqThumbnailCreation,
  ReqTourRid,
  ReqSubscriptionInfo,
  Plan as PaymentTermsPlan,
  Interval as PaymentTermsInterval,
  RespSubscription,
  ReqActivateOrDeactivateUser,
  ReqTourPropUpdate,
  RespTourView,
  RespConversion,
  RespTourAnnWithPercentile,
  RespTourAnnViews,
  RespTourLeads,
  RespLeadActivityUrl,
  ReqUpdateScreenProperty,
  ReqUpdateUser,
  ReqAssignOrgToUser,
  ReqUpdateOrg,
  Status,
  RespVanityDomain,
  ReqCreateOrDeleteNewVanityDomain,
  RespCustomField,
  ReqCreateOrDeleteCustomFields,
  RespGlobalOpts,
  ReqUpdateGlobalOpts,
  ReqDemoHubRid,
  RespUploadUrl,
  ReqDemoHubPropUpdate,
  RespEntityMetrics,
  RespHouseLead,
  MEntityMetricsDaily,
  MEntitySubEntityDistribution,
  Activity,
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
  TourDataWoScheme,
  TourScreenEntity,
  IGlobalConfig,
} from '@fable/common/dist/types';
import { createLiteralProperty, deepcopy, getCurrentUtcUnixTime, getImgScreenData, sleep } from '@fable/common/dist/utils';
import { Dispatch } from 'react';
import { setUser } from '@sentry/react';
import { sentryCaptureException } from '@fable/common/dist/sentry';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import {
  convertEditsToLineItems,
  getThemeAndAnnotationFromDataFile,
  groupScreens,
  mergeEdits,
  mergeTourData,
  processRawScreenData,
  processRawSubscriptionData,
  processRawTourData,
  P_RespScreen,
  P_RespSubscription,
  P_RespTour,
  mergeAndTransformFeaturePerPlan,
  P_RespVanityDomain,
  processRawVanityDomain,
  processLoader,
  normalizeBackwardCompatibilityForLoader,
  processRawDemoHubData,
  processDemoHubConfig,
} from '../entity-processor';
import { TState } from '../reducer';
import {
  AllEdits,
  DestinationAnnotationPosition,
  EditItem,
  ElEditType,
  ElPathKey,
  IDemoHubConfig,
  LeadActivityData,
  Ops,
  P_RespDemoHub,
  STORAGE_PREFIX_KEY_QUERY_PARAMS,
} from '../types';
import ActionType from './type';
import { uploadImageAsBinary } from '../component/screen-editor/utils/upload-img-to-aws';
import { FABLE_LOCAL_STORAGE_ORG_ID_KEY } from '../constants';
import { FeatureForPlan, FeaturePerPlan } from '../plans';
import { mapPlanIdAndIntervals } from '../utils';

export interface TGenericLoading {
  type: ActionType.ALL_SCREENS_LOADING
  | ActionType.SCREEN_LOADING
  | ActionType.ALL_TOURS_LOADING
  | ActionType.USER_LOADING
  | ActionType.TOUR_LOADING
  | ActionType.ORG_LOADING
  | ActionType.DEFAULT_TOUR_LOADED
  | ActionType.ALL_USERS_FOR_ORG_LOADING
  | ActionType.DEMOHUB_LOADING
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

export interface TAutosavingLoader {
  type: ActionType.AUTOSAVING_LOADER;
  isAutosavingLoader: boolean;
}

export function startAutosavingLoader() {
  return async (dispatch: Dispatch<TAutosavingLoader>) => {
    dispatch({
      type: ActionType.AUTOSAVING_LOADER,
      isAutosavingLoader: true,
    });
  };
}

/* ************************************************************************* */

export interface TIAm {
  type: ActionType.IAM;
  user: RespUser;
}

export interface TLcOrgId {
  type: ActionType.LC_ORG_ID,
  orgId: number
}

export function iam() {
  return async (dispatch: Dispatch<TIAm | TLcOrgId | TGenericLoading | ReturnType<typeof fetchOrg>>) => {
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
    });
    dispatch({
      type: ActionType.IAM,
      user
    });

    let orgId;
    if (orgId = localStorage.getItem(FABLE_LOCAL_STORAGE_ORG_ID_KEY)) {
      dispatch({
        type: ActionType.LC_ORG_ID,
        orgId: +orgId
      });
    }

    return Promise.resolve();
  };
}

export function updateUser(firstName: string, lastName: string) {
  return async (dispatch: Dispatch<TIAm>) => {
    const data = await api<ReqUpdateUser, ApiResp<RespUser>>('/userprop', {
      auth: true,
      body: {
        firstName,
        lastName
      }
    });

    dispatch({
      type: ActionType.IAM,
      user: data.data
    });

    return Promise.resolve();
  };
}

/* ************************************************************************* */

export function createOrg(displayName: string) {
  return async (dispatch: Dispatch<TOrg | TGenericLoading | ReturnType<typeof getSubscriptionOrCheckoutNew> >, getState: () => TState) => {
    dispatch({
      type: ActionType.ORG_LOADING,
    });
    const data = await api<ReqNewOrg, ApiResp<RespOrg>>('/neworg', {
      auth: true,
      body: {
        displayName,
        thumbnail: ''
      },
    });

    localStorage.setItem(FABLE_LOCAL_STORAGE_ORG_ID_KEY, data.data.id.toString());
    await dispatch(getSubscriptionOrCheckoutNew());

    dispatch({
      type: ActionType.ORG,
      org: data.data,
    });
    return Promise.resolve(data.data);
  };
}

export interface TOrg {
  type: ActionType.ORG;
  org: RespOrg | null;
}

export function fetchOrg(fetchImplicitOrg = false) {
  return async (
    dispatch: Dispatch<TOrg | TGenericLoading | ReturnType<typeof getSubscriptionOrCheckoutNew>>,
  ) => {
    dispatch({
      type: ActionType.ORG_LOADING,
    });
    const data = await api<null, ApiResp<RespOrg>>(`/org?if=${+fetchImplicitOrg}`, { auth: true });
    const org = data.data;
    dispatch({
      type: ActionType.ORG,
      org: org.rid ? org : null,
    });
    if (!fetchImplicitOrg) dispatch(getSubscriptionOrCheckoutNew());
  };
}

export function assignOrgToUser(orgId: number) {
  return async (
    dispatch: Dispatch<TOrg | TGenericLoading | ReturnType<typeof getSubscriptionOrCheckoutNew>>
  ) => {
    dispatch({
      type: ActionType.ORG_LOADING,
    });
    const data = await api<ReqAssignOrgToUser, ApiResp<RespOrg>>('/orgstouser', {
      auth: true,
      body: {
        orgId
      },
    });

    localStorage.setItem(FABLE_LOCAL_STORAGE_ORG_ID_KEY, orgId.toString());
    await dispatch(getSubscriptionOrCheckoutNew());

    dispatch({
      type: ActionType.ORG,
      org: data.data,
    });

    return Promise.resolve(data.data);
  };
}

export interface TCustomDomain {
  type: ActionType.GET_CUSTOM_DOMAINS;
  vanityDomains: P_RespVanityDomain[] | null;
}

export function getCustomDomains() {
  return async (
    dispatch: Dispatch<TCustomDomain>,
    getState: () => TState
  ) => {
    const state = getState();
    if (state.default.vanityDomains === null) {
      const data = await api<null, ApiResp<RespVanityDomain[]>>('/vanitydomains', {
        auth: true,
      });

      dispatch({
        type: ActionType.GET_CUSTOM_DOMAINS,
        vanityDomains: data.data.map(d => processRawVanityDomain(d)),
      });
    }

    return Promise.resolve();
  };
}

export interface TAddCustomDomain {
  type: ActionType.ADD_CUSTOM_DOMAIN;
  vanityDomain: P_RespVanityDomain;
}

export function addNewCustomDomain(domainName: string, subdomainName: string, apexDomainName: string) {
  return async (dispatch: Dispatch<TAddCustomDomain>) => {
    const data = await api<ReqCreateOrDeleteNewVanityDomain, ApiResp<RespVanityDomain>>('/vanitydomain', {
      auth: true,
      body: {
        domainName,
        subdomainName,
        apexDomainName
      }
    });

    dispatch({
      type: ActionType.ADD_CUSTOM_DOMAIN,
      vanityDomain: processRawVanityDomain(data.data),
    });

    return Promise.resolve();
  };
}

export function removeCustomDomain(domainName: string, subdomainName: string, apexDomainName: string) {
  return async (dispatch: Dispatch<TCustomDomain>) => {
    const data = await api<ReqCreateOrDeleteNewVanityDomain, ApiResp<RespVanityDomain[]>>('/delvanitydomains', {
      auth: true,
      body: {
        domainName,
        subdomainName,
        apexDomainName
      }
    });

    dispatch({
      type: ActionType.GET_CUSTOM_DOMAINS,
      vanityDomains: data.data.map(d => processRawVanityDomain(d)),
    });

    return Promise.resolve();
  };
}

export interface TUpdateCustomDomain {
  type: ActionType.SET_CUSTOM_DOMAIN;
  domain: P_RespVanityDomain;
}
export function pollForDomainUpdate(domain: RespVanityDomain) {
  return async (dispatch: Dispatch<TUpdateCustomDomain>) => {
    const data = await api<ReqCreateOrDeleteNewVanityDomain, ApiResp<RespVanityDomain>>('/vanitydomain/probe', {
      auth: true,
      body: {
        domainName: domain.domainName,
        subdomainName: domain.subdomainName,
        apexDomainName: domain.apexDomainName
      }
    });

    const updatedDomain = processRawVanityDomain(data.data);
    if (domain.status !== updatedDomain.status || domain.records.length !== updatedDomain.records.length) {
      dispatch({
        type: ActionType.SET_CUSTOM_DOMAIN,
        domain: updatedDomain,
      });
    }

    return Promise.resolve();
  };
}

export function updateUseCasesForOrg(useCases: string[], othersText: string) {
  return async (
    dispatch: Dispatch<TOrg | TGenericLoading>
  ) => {
    const data = await api<ReqUpdateOrg, ApiResp<RespOrg>>('/updtorgprops', {
      auth: true,
      body: {
        orgInfo: {
          useCases,
          othersText
        },
      }
    });

    dispatch({
      type: ActionType.ORG,
      org: data.data,
    });

    return Promise.resolve();
  };
}

/* ************************************************************************* */

export interface TSubs {
  type: ActionType.SUBS;
  subs: P_RespSubscription;
}

export function checkout(
  chosenPlan: 'solo' | 'startup' | 'business' | 'lifetime',
  chosenInterval: 'annual' | 'monthly' | 'lifetime',
  license?: string,
) {
  return async (dispatch: Dispatch<TSubs>, getState: () => TState) => {
    const { plan, interval } = mapPlanIdAndIntervals(chosenPlan, chosenInterval);

    const data = await api<ReqSubscriptionInfo, ApiResp<RespSubscription>>('/checkout', {
      method: 'POST',
      body: {
        pricingPlan: plan!,
        pricingInterval: interval!,
        lifetimeLicense: license
      }
    });
    const subs = data.data;

    if (license) {
      // must delete a license key if it's present once the processing is done
      localStorage.removeItem('fable/asll');
    }

    dispatch({
      type: ActionType.SUBS,
      subs: processRawSubscriptionData(subs),
    });

    return Promise.resolve(subs);
  };
}

export function getSubscriptionOrCheckoutNew() {
  return async (dispatch: Dispatch<TSubs | ReturnType<typeof checkout> | ReturnType<typeof getFeaturePlan>>) => {
    const data = await api<null, ApiResp<RespSubscription>>('/subs', { auth: true });
    let subs = data.data;
    const appsumoLicense = localStorage.getItem('fable/asll') || '';
    if (!appsumoLicense && subs) {
      await dispatch({
        type: ActionType.SUBS,
        subs: processRawSubscriptionData(subs),
      });
    } else if (appsumoLicense) {
      subs = (await dispatch(checkout('lifetime', 'lifetime', appsumoLicense))) as unknown as RespSubscription;
    } else {
      const chosenPlan = localStorage.getItem(`${STORAGE_PREFIX_KEY_QUERY_PARAMS}/wpp`) || '';
      const chosenInterval = localStorage.getItem(`${STORAGE_PREFIX_KEY_QUERY_PARAMS}/wpd`) || '';
      subs = (await dispatch(checkout(chosenPlan as any, chosenInterval as any))) as unknown as RespSubscription;
    }

    dispatch(getFeaturePlan(subs));
    localStorage.removeItem(`${STORAGE_PREFIX_KEY_QUERY_PARAMS}/wpp`);
    localStorage.removeItem(`${STORAGE_PREFIX_KEY_QUERY_PARAMS}/wpd`);

    return Promise.resolve();
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
      const pScreens = data.data.map((d: RespScreen) => processRawScreenData(d, getState().default.commonConfig!));
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
    const renamedScreen = processRawScreenData(data.data, getState().default.commonConfig!);
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

export interface TScreenUpdate {
  type: ActionType.SCREEN_UPDATE;
  updatedScreen: P_RespScreen,
}

export type UpdateScreenFn = (
  screen: P_RespScreen,
  propName: keyof P_RespScreen,
  propValue: P_RespScreen[keyof P_RespScreen]
) => void;

export function updateScreen(
  screen: P_RespScreen,
  propName: keyof P_RespScreen,
  propValue: P_RespScreen[keyof P_RespScreen]
) {
  return async (dispatch: Dispatch<TScreenUpdate>, getState: () => TState) => {
    dispatch({
      type: ActionType.SCREEN_UPDATE,
      updatedScreen: {
        ...screen,
        [propName]: propValue,
      },
    });

    const data = await api<ReqUpdateScreenProperty, ApiResp<RespScreen>>('/updatescreenproperty', {
      auth: true,
      method: 'POST',
      body: {
        rid: screen.rid,
        propName,
        propValue,
      },
    });

    const updatedScreen = processRawScreenData(data.data, getState().default.commonConfig!);
    dispatch({
      type: ActionType.SCREEN_UPDATE,
      updatedScreen
    });
  };
}

export function loadScreenAndData(
  screenRid: string,
  shouldUseCache = false,
  preloading = false,
  loadPublishedDataForTour: P_RespTour | undefined = undefined,
) {
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
        screen = processRawScreenData(data.data, state.default.commonConfig!, loadPublishedDataForTour);
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
        screen!.parentScreenId && screen!.type === ScreenType.SerDom
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
      screen: processRawScreenData(screen!, getState().default.commonConfig!, loadPublishedDataForTour),
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
  return async (dispatch: Dispatch<{ type: ActionType.CLEAR_RELAY_SCREEN_ANN_ADD }>, getState: () => TState) => {
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
  position: DestinationAnnotationPosition,
  refId: string,
  screenId: number,
  grpId: string
}

export function uploadImgScreenAndAddToTour(
  screenName: string,
  screenImgFile: File,
  tourRid: string,
) {
  return async (
    dispatch: Dispatch<TAddScreenEntities | ReturnType<typeof addScreenToTour>>,
    getState: () => TState
  ) => {
    const { data: screen } = await api<ReqNewScreen, ApiResp<RespScreen>>('/newscreen', {
      method: 'POST',
      body: {
        name: screenName,
        type: ScreenType.Img,
        body: JSON.stringify(getImgScreenData()),
        contentType: screenImgFile.type
      },
    });

    const pScreen = processRawScreenData(screen, getState().default.commonConfig!);

    await uploadImageAsBinary(screenImgFile, pScreen.uploadUrl!);
    await api<ReqThumbnailCreation, ApiResp<RespScreen>>('/genthumb', {
      method: 'POST',
      body: {
        screenRid: screen.rid
      },
    });

    return dispatch(addScreenToTour(
      pScreen,
      tourRid,
    ));
  };
}

export function addScreenToTour(
  screen: P_RespScreen,
  tourRid: string,
  annAdd?: AnnAdd,
) {
  return async (dispatch: Dispatch<TAddScreenEntities | TTourWithData | TGenericLoading | ReturnType<typeof loadTourAndData>>, getState: () => TState) => {
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
        const data = await api<null, ApiResp<RespDemoEntity>>(`/tour?rid=${tourRid}&s=1`);
        const state = getState().default;
        const updatedTour = processRawTourData(data.data, state.commonConfig!, state.globalConfig!);

        dispatch({
          type: ActionType.SAVE_TOUR_RELAY_ENTITIES,
          tour: updatedTour,
          screenId: screenResp.data.id,
          annAdd,
        });
      } catch (e) {
        throw new Error(`Error while loading tour and corresponding data ${(e as Error).message}`);
      }
    }
    dispatch(loadTourAndData(tourRid, true, false));
    return Promise.resolve(screenResp.data.rid);
  };
}

/* ************************************************************************* */

export interface TGetAllTours {
  type: ActionType.ALL_TOURS_LOADED;
  tours: Array<P_RespTour>;
  globalConfig: IGlobalConfig
}

export function getAllTours(shouldRefreshIfPresent = true, fetchUpdatedTours = false) {
  return async (dispatch: Dispatch<TGetAllTours | TGenericLoading>, getState: () => TState) => {
    const state = getState().default;
    if (shouldRefreshIfPresent || state.tours.length === 0 || fetchUpdatedTours) {
      if (shouldRefreshIfPresent) {
        dispatch({
          type: ActionType.ALL_TOURS_LOADING,
        });
      }
      const data = await api<null, ApiResp<RespDemoEntity[]>>('/tours', { auth: true });
      let gOptsData = state.globalConfig;
      if (!gOptsData) {
        const respGOpts = await api<null, ApiResp<RespGlobalOpts>>('/gopts', { auth: true });
        gOptsData = respGOpts.data.globalOpts;
      }

      const tours = data.data.map((d: RespDemoEntity) => processRawTourData(d, getState().default.commonConfig!, gOptsData!))
        .filter(t => !t.inProgress);
      dispatch({
        type: ActionType.ALL_TOURS_LOADED,
        tours,
        globalConfig: gOptsData!,
      });
    }
  };
}

export interface TTours {
  type : ActionType
  tours : Array<P_RespTour>;
}

/* ************************************************************************* */

export interface TGetAllUserOrgs {
  type: ActionType.ALL_USER_ORGS_LOADED;
  orgs: Array<RespOrg>;
}

export function getAllUserOrgs(): (dispatch: Dispatch<TGetAllUserOrgs>, getState: () => TState) => Promise<void> {
  return async (dispatch: Dispatch<TGetAllUserOrgs>, getState: () => TState) => {
    const data = await api<null, ApiResp<RespOrg[]>>('/orgsfruser', {
      auth: true,
    });

    dispatch({
      type: ActionType.ALL_USER_ORGS_LOADED,
      orgs: data.data,
    });
  };
}

type SupportedPerformedAction = 'new' | 'get' | 'rename' | 'replace' | 'publish' | 'edit';
export interface TTour {
  type: ActionType.TOUR;
  tour: P_RespTour;
  oldTourRid: string;
  performedAction: SupportedPerformedAction;
}

export function createNewTour(
  shouldNavigate = false,
  tourName = 'Untitled',
  mode: SupportedPerformedAction = 'new',
  description = ''
) {
  return async (dispatch: Dispatch<TTour | TGenericLoading>, getState: () => TState) => {
    const data = await api<ReqNewTour, ApiResp<RespDemoEntity>>('/newtour', {
      auth: true,
      body: {
        name: tourName,
        description,
      },
    });
    const state = getState().default;
    const tour = processRawTourData(data.data, state.commonConfig!, state.globalConfig!);

    if (shouldNavigate) {
      window.location.replace(`/demo/${tour.rid}`);
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

export function renameTour(tour: P_RespTour, newVal: string, description: string) {
  return async (dispatch: Dispatch<TTour>, getState: () => TState) => {
    const data = await api<ReqRenameGeneric, ApiResp<RespDemoEntity>>('/renametour', {
      auth: true,
      body: {
        newName: newVal,
        rid: tour.rid,
        description
      },
    });
    const state = getState().default;
    const renamedTour = processRawTourData(data.data, state.commonConfig!, state.globalConfig!);
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

    const data = await api<ReqDuplicateTour, ApiResp<RespDemoEntityWithSubEntities>>('/duptour', {
      auth: true,
      body: {
        duplicateTourName: newVal,
        fromTourRid: tour.rid,
      },
    });

    const duplicatedTour = await duplicateGivenTour(data.data, getState);

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

export interface TTourDelete {
  type: ActionType.DELETE_TOUR;
  ridOfTourToBeDeleted: string;
}

export function deleteTour(tourRid: string) {
  return async (dispatch: Dispatch<TTourDelete>) => {
    dispatch({
      type: ActionType.DELETE_TOUR,
      ridOfTourToBeDeleted: tourRid
    });
    await api<ReqTourRid, ApiResp<RespDemoEntity[]>>('/deltour', {
      auth: true,
      body: {
        tourRid
      }
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
  journey: JourneyData,
  globalConfig: IGlobalConfig,
}

export interface TTourWithLoader {
  type: ActionType.TOUR_AND_LOADER_LOADED;
  tour: P_RespTour;
  loader: ITourLoaderData;
  globalConfig: IGlobalConfig;
}

export function loadTourAndData(
  tourRid: string,
  shouldGetScreens = false,
  isFreshLoading = true,
  loadPublishedData = false,
  ts: string | null = null,
  shouldGetOnlyTour = false
) {
  return async (
    dispatch: Dispatch<TTourWithData | TTourWithLoader | TGenericLoading | TInitialize | TTourPublished>,
    getState: () => TState
  ) => {
    const state = getState();
    if (isFreshLoading) {
      dispatch({
        type: ActionType.TOUR_LOADING,
      });
    }

    let tour: P_RespTour;
    const newTs = ts || +new Date();

    try {
      const data = loadPublishedData
        ? await api<null, ApiResp<RespDemoEntity>>(`https://${process.env.REACT_APP_DATA_CDN}/${process.env.REACT_APP_DATA_CDN_QUALIFIER}/ptour/${tourRid}/0_d_data.json?ts=${newTs}`)
        : await api<null, ApiResp<RespDemoEntity>>(`/tour?rid=${tourRid}${shouldGetScreens ? '&s=1' : ''}`);

      let config: RespCommonConfig;
      if (loadPublishedData) {
        const tourWithScreen: RespDemoEntityWithSubEntities = data.data as RespDemoEntityWithSubEntities;
        config = tourWithScreen.cc!;
        dispatch({
          type: ActionType.INIT,
          config
        });
      } else {
        config = state.default.commonConfig!;
      }
      tour = processRawTourData(
        data.data,
        config,
        data.data.globalOpts!,
        false,
        loadPublishedData ? data.data : undefined
      );
    } catch (e) {
      throw new Error(`Error while loading tour and corresponding data ${(e as Error).message}`);
    }

    if (shouldGetOnlyTour) {
      dispatch({
        type: ActionType.TOUR_LOADED,
        tour,
      });
      return [newTs, null];
    }
    const loader = await api<null, ITourLoaderData>(tour!.loaderFileUri.href);

    dispatch({
      type: ActionType.TOUR_AND_LOADER_LOADED,
      tour,
      loader: processLoader(normalizeBackwardCompatibilityForLoader(loader), tour!.globalOpts),
      globalConfig: tour.globalOpts,
    });

    const data = await api<null, TourData>(tour!.dataFileUri.href);
    const annotationAndOpts = getThemeAndAnnotationFromDataFile(data, tour.globalOpts, false);
    dispatch({
      type: ActionType.TOUR_AND_DATA_LOADED,
      tourData: data,
      tour: processRawTourData(tour!, getState().default.commonConfig!, tour.globalOpts!, false, loadPublishedData ? tour : undefined),
      annotations: annotationAndOpts.annotations,
      opts: annotationAndOpts.opts,
      allCorrespondingScreens: shouldGetScreens,
      journey: annotationAndOpts.journey,
      globalConfig: tour.globalOpts,
    });
    return [newTs, data];
  };
}

export interface TTourPublished {
  type: ActionType.TOUR_LOADED;
  tour: P_RespTour;
}

export function publishTour(tour: P_RespTour) {
  return async (dispatch: Dispatch<TTour>, getState: () => TState) => {
    const state = getState();
    let publishSuccessful: boolean;
    try {
      const data = await api<any, ApiResp<RespDemoEntity>>('/tpub', {
        auth: true,
        body: { tourRid: tour.rid }
      });

      tour = processRawTourData(data.data, state.default.commonConfig!, state.default.globalConfig!, false);
      publishSuccessful = true;
    } catch (e) {
      sentryCaptureException(new Error(`Error while loading tour and corresponding data ${(e as Error).message}`));
      publishSuccessful = false;
    }

    dispatch({
      type: ActionType.TOUR,
      tour,
      oldTourRid: tour.rid,
      performedAction: 'publish'
    });

    return Promise.resolve(publishSuccessful);
  };
}

export function getTourData(tourRid : string) {
  return async (dispatch : Dispatch<TTour>, getState : () => TState) => {
    const state = getState();
    let tour : P_RespTour | null = null;

    try {
      const data = await api<null, ApiResp<RespDemoEntity>>(`/tour?rid=${tourRid}`);
      if (data.data) {
        tour = processRawTourData(data.data, state.default.commonConfig!);
      }
    } catch (e) {
      raiseDeferredError(e as Error);
    }

    return Promise.resolve(tour);
  };
}

/* ************************************************************************* */

export interface TSaveEditChunks {
  type: ActionType.SAVE_EDIT_CHUNKS;
  screenId: number;
  editList: EditItem[];
  isLocal: boolean;
  editFile?: EditFile<AllEdits<ElEditType>>
}

export function saveEditChunks(screen: P_RespScreen, editChunks: AllEdits<ElEditType>) {
  return async (dispatch: Dispatch<TSaveEditChunks>) => {
    dispatch({
      type: ActionType.SAVE_EDIT_CHUNKS,
      screenId: screen.id,
      editList: convertEditsToLineItems(editChunks, true),
      isLocal: true,
    });
  };
}

export function flushEditChunksToMasterFile(screenRidIdStr: string, localEdits: AllEdits<ElEditType>) {
  return async (dispatch: Dispatch<TSaveEditChunks | TAutosaving>, getState: () => TState) => {
    const [id, ...rid] = screenRidIdStr.split('/');
    const screenId = +id;
    const screenRid = rid.join('/');
    const savedEditData = getState().default.screenEdits[screenId];
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
            rid: screenRid,
            editData: JSON.stringify(savedEditData),
          },
        });

        dispatch({
          type: ActionType.SAVE_EDIT_CHUNKS,
          screenId,
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
  journey: JourneyData
}

export function saveTourData(tour: P_RespTour, data: TourDataWoScheme) {
  return async (dispatch: Dispatch<TSaveTourEntities>, getState: () => TState) => {
    const state = getState();
    const annotationAndOpts = getThemeAndAnnotationFromDataFile(data as TourData, state.default.globalConfig!);
    dispatch({
      type: ActionType.SAVE_TOUR_ENTITIES,
      tour,
      data: getState().default.tourData,
      annotations: annotationAndOpts.annotations,
      opts: annotationAndOpts.opts,
      idMap: annotationAndOpts.annotationsIdMap,
      isLocal: true,
      journey: annotationAndOpts.journey
    });
  };
}

export interface TSaveTourLoader {
  type: ActionType.SAVE_TOUR_LOADER,
  tour: P_RespTour,
  loader: ITourLoaderData
}

export function recordLoaderData(tour: P_RespTour, loaderData: ITourLoaderData) {
  return async (dispatch: Dispatch<TSaveTourLoader | TTour>, getState: () => TState) => {
    const state = getState();
    const globalOpts = state.default.globalConfig!;
    loaderData.lastUpdatedAtUTC = getCurrentUtcUnixTime();
    const data = await api<ReqRecordEdit, ApiResp<RespDemoEntity>>('/recordtrloaderedit', {
      auth: true,
      body: {
        rid: tour.rid,
        editData: JSON.stringify(loaderData),
      },
    });

    dispatch({
      type: ActionType.TOUR,
      tour: processRawTourData(data.data, state.default.commonConfig!, globalOpts, false),
      oldTourRid: tour.rid,
      performedAction: 'edit'
    });

    dispatch({
      type: ActionType.SAVE_TOUR_LOADER,
      tour,
      loader: processLoader(normalizeBackwardCompatibilityForLoader(loaderData), globalOpts)
    });
  };
}

export function flushTourDataToMasterFile(tour: P_RespTour, localEdits: Partial<TourDataWoScheme>) {
  return async (dispatch: Dispatch<TSaveTourEntities | TAutosaving | TTour>, getState: () => TState) => {
    const state = getState();
    const savedData = state.default.tourData;
    if (savedData) {
      savedData.lastUpdatedAtUtc = getCurrentUtcUnixTime();
      const mergedMasterData = mergeTourData(savedData, localEdits, true);
      const mergedData = {
        ...savedData,
        ...mergedMasterData
      };

      const annotationAndOpts = getThemeAndAnnotationFromDataFile(mergedData, state.default.globalConfig!, false);
      dispatch({
        type: ActionType.SAVE_TOUR_ENTITIES,
        tour,
        data: mergedData,
        annotations: annotationAndOpts.annotations,
        idMap: annotationAndOpts.annotationsIdMap,
        opts: annotationAndOpts.opts,
        journey: annotationAndOpts.journey,
        isLocal: false,
      });
      const data = await api<ReqRecordEdit, ApiResp<RespDemoEntity>>('/recordtredit', {
        auth: true,
        body: {
          rid: tour.rid,
          editData: JSON.stringify(mergedData),
        },
      });

      dispatch({
        type: ActionType.TOUR,
        tour: processRawTourData(data.data, state.default.commonConfig!, state.default.globalConfig!, false),
        oldTourRid: tour.rid,
        performedAction: 'edit'
      });
    }

    dispatch({
      type: ActionType.AUTOSAVING,
      isAutosaving: false
    });
  };
}

/* ************************************************************************* */

export interface TSetGlobalConfig {
  type: ActionType.SET_GLOBAL_CONFIG;
  globalConfig: IGlobalConfig;
}

export function getGlobalConfig() {
  return async (dispatch: Dispatch<TSetGlobalConfig>, getState: () => TState) => {
    const state = getState();

    if (state.default.globalConfig !== null) return;

    const data = await api<null, ApiResp<RespGlobalOpts>>('/gopts', { auth: true });

    const config: IGlobalConfig = data.data.globalOpts;

    dispatch({
      type: ActionType.SET_GLOBAL_CONFIG,
      globalConfig: config,
    });
  };
}

export function updateGlobalConfig(updatedGlobalConfig: IGlobalConfig) {
  return async (dispatch: Dispatch<TSetGlobalConfig>, getState: () => TState) => {
    const data = await api<ReqUpdateGlobalOpts, ApiResp<RespGlobalOpts>>('/updtgopts', {
      method: 'POST',
      body: {
        editData: JSON.stringify(updatedGlobalConfig)
      }
    });

    dispatch({
      type: ActionType.SET_GLOBAL_CONFIG,
      globalConfig: updatedGlobalConfig,
    });
  };
}

/* ************************************************************************* */

export interface TGetAllUsers {
  type: ActionType.ALL_USERS_FOR_ORG_LOADED;
  users: Array<RespUser>;
}

export function getAllUsersForOrg() {
  return async (dispatch: Dispatch<TGetAllUsers | TGenericLoading>, getState: () => TState) => {
    if (getState().default.allUsersLoadingStatus === LoadingStatus.Done) return;
    dispatch({
      type: ActionType.ALL_USERS_FOR_ORG_LOADING,
    });
    const data = await api<null, ApiResp<RespUser[]>>('/users', { auth: true });
    dispatch({
      type: ActionType.ALL_USERS_FOR_ORG_LOADED,
      users: data.data,
    });
  };
}

export interface TUserPropChange {
  type: ActionType.USER_UPDATED;
  user: RespUser;
}

export function activateOrDeactivateUser(id: number, shouldActivate: boolean) {
  return async (dispatch: Dispatch<TUserPropChange>) => {
    const data = await api<ReqActivateOrDeactivateUser, ApiResp<RespUser>>('/aodusr', {
      method: 'POST',
      body: {
        userId: id,
        shouldActivate,
      }
    });
    dispatch({
      type: ActionType.USER_UPDATED,
      user: data.data,
    });
  };
}

const duplicateGivenTour = async (
  tour: RespDemoEntityWithSubEntities,
  getState: () => TState,
): Promise<P_RespTour> => {
  const duplicatedTour = processRawTourData(tour, getState().default.commonConfig!, getState().default.globalConfig!);
  const idxm = tour.idxm;
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
                const actionValueSplit = btn.hotspot.actionValue._val.split('/');
                if (actionValueSplit[0] in idxm) {
                  actionValueSplit[0] = idxm[actionValueSplit[0]];
                  btn.hotspot.actionValue = createLiteralProperty(actionValueSplit.join('/'));
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

    if (tourDataFile.opts?.main) {
      const mainSplit = tourDataFile.opts.main.split('/');
      if (mainSplit[0] in idxm) {
        mainSplit[0] = idxm[mainSplit[0]];
        tourDataFile.opts.main = mainSplit.join('/');
      }
    }

    if (tourDataFile.journey?.flows.length > 0) {
      tourDataFile.journey.flows.forEach(flow => {
        const mainSplit = flow.main.split('/');
        if (mainSplit[0] in idxm) {
          mainSplit[0] = idxm[mainSplit[0]];
          flow.main = mainSplit.join('/');
        }
      });
    }

    await api<ReqRecordEdit, ApiResp<RespDemoEntity>>('/recordtredit', {
      auth: true,
      body: {
        rid: duplicatedTour.rid,
        editData: JSON.stringify(tourDataFile),
      },
    });
  }
  const updatedTourResp = await api<ReqTourPropUpdate, ApiResp<RespDemoEntity>>('/updtrprop', {
    auth: true,
    body: {
      tourRid: duplicatedTour.rid,
      inProgress: false
    },
    method: 'POST'
  });

  return processRawTourData(updatedTourResp.data, getState().default.commonConfig!, getState().default.globalConfig!);
};

// INFO this is commented out as createDefaultTour performance is very slow
// export function createDefaultTour() {
//   return async (
//     dispatch: Dispatch<TTour | TOpsInProgress | TAutosaving | TGetAllTours | TGenericLoading>,
//     getState: () => TState
//   ) => {
//     const data = await api<ReqDuplicateTour, ApiResp<RespDemoEntityWithSubEntities[]>>('/conbtrs', {
//       auth: true, method: 'POST'
//     });
//     const duplicatedTours: P_RespTour[] = [];

//     await Promise.all(data.data.map(async (tour) => {
//       const duplicatedTour = await duplicateGivenTour(tour, getState);
//       duplicatedTours.push(duplicatedTour);
//     }));

//     const state = getState();
//     const processedDuplicatedTours = duplicatedTours.filter(tr => !tr.inProgress);
//     const tours = [...processedDuplicatedTours, ...state.default.tours];

//     dispatch({
//       type: ActionType.DEFAULT_TOUR_LOADED,
//     });
//     dispatch({
//       type: ActionType.ALL_TOURS_LOADED,
//       tours,
//     });
//   };
// }

export function addNewTourToAllTours(newTour: RespDemoEntity) {
  return async (
    dispatch: Dispatch<TGetAllTours>,
    getState: () => TState
  ) => {
    const state = getState();
    const processedNewTours = [processRawTourData(newTour, state.default.commonConfig!, state.default.globalConfig!)];
    const tours = [...state.default.tours, ...processedNewTours];
    dispatch({
      type: ActionType.ALL_TOURS_LOADED,
      tours,
      globalConfig: state.default.globalConfig!,
    });
  };
}

export interface TAnalyticsTourTotalViews{
  type: ActionType.ANALYTICS_TOTAL_TOUR_VIEW,
  tourTotalView: RespTourView,
}

export function getTotalViewsForTour(rid: string, days: number) {
  return async (dispatch: Dispatch<TAnalyticsTourTotalViews>) => {
    const data = await api<null, ApiResp<RespTourView>>(`/totalviews?rid=${rid}&d=${days}`, {
      auth: true,
    });
    dispatch({
      type: ActionType.ANALYTICS_TOTAL_TOUR_VIEW,
      tourTotalView: data.data,
    });

    return Promise.resolve(data.data);
  };
}

export interface TAnalyticsConversion{
  type: ActionType.ANALYTICS_TOUR_CONVERSION,
  tourConversion: RespConversion,
}

export function getConversionDataForTour(rid: string, days: number) {
  return async (dispatch: Dispatch<TAnalyticsConversion>) => {
    const data = await api<null, ApiResp<RespConversion>>(`/convrsn?rid=${rid}&d=${days}`, {
      auth: true,
    });
    dispatch({
      type: ActionType.ANALYTICS_TOUR_CONVERSION,
      tourConversion: data.data,
    });

    return Promise.resolve(data.data);
  };
}

export interface TAnalyticsStepsVisited{
  type: ActionType.ANALYTICS_STEPS_VISITED,
  tourStepsVisited: RespTourAnnWithPercentile,
}

export function getStepsVisitedForTour(rid: string, days: number) {
  return async (dispatch: Dispatch<TAnalyticsStepsVisited>) => {
    const data = await api<null, ApiResp<RespTourAnnWithPercentile>>(`/stpsdur?rid=${rid}&d=${days}`, {
      auth: true,
    });
    dispatch({
      type: ActionType.ANALYTICS_STEPS_VISITED,
      tourStepsVisited: data.data,
    });
    return Promise.resolve(data.data);
  };
}

export interface TAnalyticsAnnInfo{
    type: ActionType.ANALYTICS_ANN_INFO,
    tourAnnViews: RespTourAnnViews,
}

export function getAnnViewsForTour(rid: string, days: number) {
  return async (dispatch: Dispatch<TAnalyticsAnnInfo>) => {
    const data = await api<null, ApiResp<RespTourAnnViews>>(`/annviews?rid=${rid}&d=${days}`, {
      auth: true,
    });
    dispatch({
      type: ActionType.ANALYTICS_ANN_INFO,
      tourAnnViews: data.data,
    });
    return Promise.resolve(data.data);
  };
}

export interface TAnalyticsLeads{
  type: ActionType.ANALYTICS_LEADS,
  leads: RespTourLeads,
}

export function getLeadsForTour(rid: string, days: number) {
  return async (dispatch: Dispatch<TAnalyticsLeads>) => {
    const data = await api<null, ApiResp<RespTourLeads>>(`/gettrleads?rid=${rid}&d=${days}`, {
      auth: true,
    });
    dispatch({
      type: ActionType.ANALYTICS_LEADS,
      leads: data.data,
    });
    return Promise.resolve(data.data);
  };
}

export interface TLeadActivity{
  type: ActionType.ANALYTICS_LEAD_ACTIVITY,
  leadData: LeadActivityData[],
}

export function getLeadActivityForTour(rid: string, aid: string) {
  return async (dispatch: Dispatch<TLeadActivity>) => {
    try {
      const data = await api<null, ApiResp<RespLeadActivityUrl>>(`/getleadactvitydatafile?rid=${rid}&aid=${aid}`, {
        auth: true,
      });
      const tmpActivityData = await api<null, any[]>(data.data.leadActivityUrl);
      const activityData: LeadActivityData[] = tmpActivityData.map(tmpData => ({
        sid: tmpData.sid,
        aid: tmpData.aid,
        uts: tmpData.uts,
        payloadAnnId: tmpData.payload_ann_id,
        payloadButtonId: tmpData.payload_btn_id
      }));

      dispatch({
        type: ActionType.ANALYTICS_LEAD_ACTIVITY,
        leadData: activityData,
      });
      return Promise.resolve(activityData);
    } catch (e) {
      console.warn(`Can't find lead activity for ${aid}`);
      return Promise.resolve([]);
    }
  };
}

export function updateTourProp<T extends keyof ReqTourPropUpdate>(
  rid: string,
  tourProp: T,
  value: ReqTourPropUpdate[T]
) {
  return async (dispatch: Dispatch<TTour>, getState: () => TState) => {
    const updatedTourResp = await api<ReqTourPropUpdate, ApiResp<RespDemoEntity>>('/updtrprop', {
      auth: true,
      body: {
        tourRid: rid,
        [tourProp]: value
      },
      method: 'POST'
    });

    const state = getState().default;
    const processedTour = processRawTourData(updatedTourResp.data, state.commonConfig!, state.globalConfig!);
    dispatch({
      type: ActionType.TOUR,
      tour: processedTour,
      oldTourRid: rid,
      performedAction: 'edit',
    });
  };
}

export interface TElpath {
  type: ActionType.UPDATE_ELPATH;
  elPath: ElPathKey;
}

export function updateElPathKey(newElPath: ElPathKey) {
  return async (dispatch: Dispatch<TElpath>, getState: () => TState) => {
    dispatch({
      type: ActionType.UPDATE_ELPATH,
      elPath: newElPath
    });
  };
}

export interface TFeaturePlan {
  type: ActionType.SET_FEATURE_FOR_PLAN;
  featureForPlan: FeatureForPlan;
}

export function getFeaturePlan(subs: RespSubscription) {
  return async (dispatch: Dispatch<TFeaturePlan>, getState: ()=> TState) => {
    let plan = PaymentTermsPlan.SOLO;
    if (subs.paymentPlan !== PaymentTermsPlan.SOLO && (subs.status === Status.ACTIVE || subs.status === Status.IN_TRIAL)) {
      plan = subs.paymentPlan;
    }

    const data = await api<null, ApiResp<FeaturePerPlan>>('/featureplanmtx');
    const featurePerPlan = (data.data ? data.data : {});
    const state = getState();
    const org = state.default.org;
    const featurePlanForOrg = mergeAndTransformFeaturePerPlan(featurePerPlan, org && org.info && org.info.bet && org.info.bet.featureGateOverride, plan);
    dispatch({
      type: ActionType.SET_FEATURE_FOR_PLAN,
      featureForPlan: featurePlanForOrg
    });
  };
}

export function loadMappedFields() {
  return async () => {
    const data = await api<null, ApiResp<RespCustomField[]>>('/cfields', { auth: true });
    return Promise.resolve(data.data);
  };
}

export function createMappedField(newFields: string[]) {
  return async () => {
    const data = await api<ReqCreateOrDeleteCustomFields, ApiResp<RespCustomField>>('/addcfields', {
      body: {
        customFields: newFields,
      },
      auth: true,
    });

    return Promise.resolve(data.data);
  };
}

export function deleteMappedField(fieldIds: string[]) {
  return async () => {
    const data = await api<ReqCreateOrDeleteCustomFields, ApiResp<RespCustomField>>('/delcfields', {
      body: {
        customFields: fieldIds,
      },
      auth: true,
    });

    return Promise.resolve(data.data);
  };
}

export interface TRemoveScreenData {
  type: ActionType.REMOVE_SCREEN_DATA;
  allScreenData: Record<string, ScreenData>;
}

export function removeScreenDataForRids(ids: number[]) {
  return async (dispatch: Dispatch<TRemoveScreenData>, getState: ()=> TState) => new Promise<void>((resolve, reject) => {
    try {
      const state = getState();
      const newAllScreenData = { ...state.default.screenData };
      for (const id in newAllScreenData) {
        if (newAllScreenData[id]) {
          if (!ids.includes(parseInt(id, 10))) {
            delete newAllScreenData[id];
          }
        }
      }
      dispatch({
        type: ActionType.REMOVE_SCREEN_DATA,
        allScreenData: newAllScreenData
      });

      resolve();
    } catch (err) {
      resolve();
    }
  });
}

/* ************************************************************************* */

export interface TDemoHubLoaded {
  type: ActionType.DEMOHUB_LOADED;
  data: P_RespDemoHub;
  config: IDemoHubConfig;
}

export function loadDemoHubAndData(
  demoHubRid: string,
  isFreshLoading = true,
  loadPublishedData = false,
  ts: string | null = null,
) {
  return async (
    dispatch: Dispatch<TDemoHubLoaded | TGenericLoading | TInitialize | TTourPublished>,
    getState: () => TState
  ) => {
    if (isFreshLoading) {
      dispatch({
        type: ActionType.DEMOHUB_LOADING,
      });
    }

    const newTs = ts || +new Date();
    const state = getState().default;

    try {
      const respDemoHub = loadPublishedData
        ? await api<null, ApiResp<RespDemoEntity>>(`https://${process.env.REACT_APP_DATA_CDN}/${process.env.REACT_APP_DATA_CDN_QUALIFIER}/pdh/${demoHubRid}/0_d_data.json?ts=${newTs}`)
        : await api<null, ApiResp<RespDemoEntity>>(`/dh?rid=${demoHubRid}`);

      const demoHub = processRawDemoHubData(
        respDemoHub.data,
        state.commonConfig!,
        respDemoHub.data.globalOpts!,
        loadPublishedData ? respDemoHub.data : undefined
      );

      let config = await api<null, IDemoHubConfig>(demoHub!.configFileUri.href);

      config = processDemoHubConfig(demoHub, config);

      dispatch({
        type: ActionType.DEMOHUB_LOADED,
        data: demoHub,
        config,
      });
    } catch (err) {
      throw new Error(`Error while loading demo hub and corresponding data ${(err as Error).message}`);
    }
    return newTs;
  };
}

export function loadDemoHubConfig(
  demoHub: P_RespDemoHub,
) {
  return async (
    dispatch: Dispatch<TDemoHubLoaded | TGenericLoading>,
    getState: () => TState
  ) => {
    // TODO api call goes here
    const config = await api<null, IDemoHubConfig>(demoHub!.configFileUri.href);

    return Promise.resolve(config);
  };
}

export function clearCurrentDemoHubSelection() {
  return async (dispatch: Dispatch<{ type: ActionType.CLEAR_CURRENT_DEMOHUB }>, getState: () => TState) => {
    dispatch({
      type: ActionType.CLEAR_CURRENT_DEMOHUB,
    });
  };
}

export interface TCreateDemoHubData {
  type: ActionType.CREATE_DEMOHUB_DATA;
  demoHub: P_RespDemoHub;
}

export function createDemoHub(name: string) {
  return async (dispatch: Dispatch<TCreateDemoHubData>, getState: () => TState) => {
    const dh = await api<ReqNewTour, ApiResp<RespDemoEntity>>('/demohub', {
      auth: true,
      body: {
        name,
      },
    });

    const state = getState().default;
    const processedDh = processRawDemoHubData(dh.data, state.commonConfig!);

    dispatch({
      type: ActionType.CREATE_DEMOHUB_DATA,
      demoHub: processedDh,
    });

    return Promise.resolve(processedDh);
  };
}

export interface TDeleteDemoHub {
  type: ActionType.DELETE_DEMOHUB_DATA;
  rid: string;
}

export function deleteDemoHub(rid: string) {
  return async (dispatch: Dispatch<TDeleteDemoHub>, getState: () => TState) => {
    dispatch({
      type: ActionType.DELETE_DEMOHUB_DATA,
      rid,
    });
    await api<ReqDemoHubRid, ApiResp<RespDemoEntity[]>>('/deldh', {
      auth: true,
      body: {
        rid
      }
    });
  };
}

export interface TUpdateDemoHub {
  type: ActionType.UPDATE_DEMOHUB_DATA;
  data: P_RespDemoHub;
}

export function renameDemoHub(rid: string, newName: string) {
  return async (dispatch: Dispatch<TUpdateDemoHub>, getState: () => TState) => {
    const renamedDH = await api<ReqRenameGeneric, ApiResp<RespDemoEntity>>('/renamedh', {
      auth: true,
      body: {
        rid,
        newName
      },
    });

    const state = getState().default;
    const processedDh = processRawDemoHubData(renamedDH.data, state.commonConfig!);

    dispatch({
      type: ActionType.UPDATE_DEMOHUB_DATA,
      data: processedDh,
    });
  };
}

export function publishDemoHub(demoHub: P_RespDemoHub) {
  return async (dispatch: Dispatch<TUpdateDemoHub>, getState: () => TState) => {
    let publishSuccessful: boolean;

    try {
      const publishedDH = await api<ReqDemoHubRid, ApiResp<RespDemoEntity>>('/pubdh', {
        auth: true,
        body: {
          rid: demoHub.rid,
        },
      });

      const state = getState().default;
      demoHub = processRawDemoHubData(publishedDH.data, state.commonConfig!);

      publishSuccessful = true;
    } catch {
      publishSuccessful = false;
    }

    dispatch({
      type: ActionType.UPDATE_DEMOHUB_DATA,
      data: demoHub,
    });

    return Promise.resolve(publishSuccessful);
  };
}

export interface TGetAllDemoHubs {
  type: ActionType.SET_ALL_DEMOHUBS;
  demoHubs: Array<P_RespDemoHub>;
}

export function getAllDemoHubs() {
  return async (dispatch: Dispatch<TGetAllDemoHubs>, getState: () => TState) => {
    const demhoHubs = await api<null, ApiResp<RespDemoEntity[]>>('/dhs', { auth: true });
    const state = getState().default;
    const processedDhs = demhoHubs.data.map(dh => processRawDemoHubData(dh, state.commonConfig!));

    dispatch({
      type: ActionType.SET_ALL_DEMOHUBS,
      demoHubs: processedDhs,
    });
  };
}

export interface TUpdateDemoHubConfig {
  type: ActionType.SET_CURRENT_DEMOHUB_CONFIG;
  config: IDemoHubConfig;
}

export interface TSetDHConfigUploadURL {
  type: ActionType.SET_DH_CONFIG_UPLOAD_URL,
  url: string,
}

export interface TSetCurrentDemoData {
  type: ActionType.SET_CURRENT_DEMOHUB_DATA,
  data: P_RespDemoHub,
}

export function updateDemoHubConfigData(rid: string, updatedConfig: IDemoHubConfig) {
  return async (
    dispatch: Dispatch<TUpdateDemoHubConfig | TSetDHConfigUploadURL | ReturnType<typeof updateDemoHubProp>>,
    getState: () => TState
  ) => {
    startAutosaving();

    dispatch({
      type: ActionType.SET_CURRENT_DEMOHUB_CONFIG,
      config: updatedConfig,
    });

    const state = getState().default;
    const data = await uploadDataToDHConfigJSON(rid, updatedConfig, state.demoHubConfigUploadUrl);

    dispatch({
      type: ActionType.SET_DH_CONFIG_UPLOAD_URL,
      url: data.datauploadUrl,
    });

    dispatch(updateDemoHubProp(rid, 'lastInteractedAt', (new Date().toISOString() as unknown as Date)));
  };
}

async function uploadDataToDHConfigJSON(
  rid: string,
  data: IDemoHubConfig,
  datauploadUrl: string,
  retryCount = 0
): Promise<{ datauploadUrl: string}> {
  try {
    if (!datauploadUrl) {
      datauploadUrl = await getDHConfigUploadURl(rid);
    }

    const res = await fetch(datauploadUrl, {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=0'
      }
    });

    if (!res.ok) {
      throw new Error(`Upload failed with status: ${res.status}`);
    }

    return { datauploadUrl };
  } catch (error) {
    if (retryCount < 3) {
      const newuploadUrl = await getDHConfigUploadURl(rid);
      return uploadDataToDHConfigJSON(rid, data, newuploadUrl, retryCount + 1);
    }
    return { datauploadUrl: '' };
  }
}

const getDHConfigUploadURl = async (rid: string): Promise<string> => {
  const data = await api<null, ApiResp<RespUploadUrl>>(`/recorddhedit?rid=${rid}`, { auth: true });
  return data.data.url;
};

export function updateDemoHubProp<T extends keyof ReqDemoHubPropUpdate>(
  rid: string,
  demoHubProp: T,
  value: ReqDemoHubPropUpdate[T]
) {
  return async (dispatch: Dispatch<TSetCurrentDemoData>, getState: () => TState) => {
    const updatedTourResp = await api<ReqDemoHubPropUpdate, ApiResp<RespDemoEntity>>('/updtdhprops', {
      auth: true,
      body: {
        rid,
        [demoHubProp]: value
      },
      method: 'POST'
    });

    const state = getState().default;
    const processedData = processRawDemoHubData(updatedTourResp.data, state.commonConfig!, state.globalConfig!);
    dispatch({
      type: ActionType.SET_CURRENT_DEMOHUB_DATA,
      data: processedData,
    });
  };
}

export function getEntityMetrics(tourId: string) {
  return async () => {
    const data = await api<null, ApiResp<RespEntityMetrics>>(`/entity_metrics?rid=${tourId}`, { auth: true });
    return Promise.resolve(data.data);
  };
}

export interface P_RespHouseLead extends RespHouseLead {
  nCreatedAt: Date;
  nUpdatedAt: Date;
  nLastInteractedAt: Date;
}

function getLeadsByDate(leads: P_RespHouseLead[]) {
  const leadByDateMap: Record<string, number> = {};

  leads.forEach(lead => {
    const dateStr = lead.nCreatedAt.toISOString().split('T')[0];
    if (leadByDateMap[dateStr]) {
      leadByDateMap[dateStr]++;
    } else {
      leadByDateMap[dateStr] = 1;
    }
  });

  const leadByDate = Object.entries(leadByDateMap).map(([date, count]) => ({
    date: new Date(date),
    count,
  }));

  return leadByDate;
}

export function getLeads(tourId: string) {
  return async () => {
    const data = await api<null, ApiResp<RespHouseLead[]>>(`/leads?rid=${tourId}`, { auth: true });
    const processedData: P_RespHouseLead[] = data.data.map(item => ({
      ...item,
      nCreatedAt: new Date(item.createdAt),
      nUpdatedAt: new Date(item.updatedAt),
      nLastInteractedAt: new Date(item.lastInteractedAt),
    }));

    return Promise.resolve({
      leads: processedData,
      leadsByDate: getLeadsByDate(processedData)
    });
  };
}

export interface P_MEntityMetricsDaily extends MEntityMetricsDaily {
  nDate: Date;
}

export function getDailySessionsAndConversion(tourId: string) {
  return async () => {
    const data = await api<null, ApiResp<MEntityMetricsDaily[]>>(`/entity_metrics_daily?rid=${tourId}`, { auth: true });
    const processedData: P_MEntityMetricsDaily[] = data.data.map(item => ({
      ...item,
      nDate: new Date(item.day)
    })).sort((m, n) => +n.nDate - +m.nDate);
    return Promise.resolve(processedData);
  };
}

export interface HistogramData {
  bucketMin: number;
  bucketMax: number;
  bucketCount: number;
  bins: string[];
  freq: number[];
}

export interface P_EntitySubEntityDistMetrics {
  avgSessionTimeInSec: number;
  avgCompletionPercentage: number;
  sessionTimeBucket: HistogramData;
  completionBucket: HistogramData;
  perAnnotationStat: Record<string, {
    viewsAll: number;
    timeSpentBucket: HistogramData;
  }>;
}

function createHistogramData(data: MEntitySubEntityDistribution[]): HistogramData {
  if (!data.length) {
    return {
      bucketMin: 0,
      bucketMax: 0,
      bucketCount: 0,
      bins: [],
      freq: [],
    };
  }

  const item = data[0];
  const bins = [];
  const freq = Array.from({ length: item.bucketCount }, () => 0);
  const bucketSize = Math.round((item.bucketMax - item.bucketMin) / item.bucketCount);
  for (let i = 1; i <= item.bucketCount; i++) {
    bins.push(`${item.bucketMin + (i - 1) * bucketSize}-${item.bucketMin + i * bucketSize}`);
  }

  // This function is called once for each subentity id, hence this function executes for
  // each and every bucket
  for (const item2 of data) {
    freq[item2.bucketNumber - 1] = item2.freq;
  }

  return {
    bucketMin: item.bucketMin,
    bucketMax: item.bucketMax,
    bucketCount: item.bucketCount,
    bins,
    freq,
  };
}

function processEntitySubEntityDist(data: MEntitySubEntityDistribution[]): P_EntitySubEntityDistMetrics {
  // separate completion data from annotation data
  const completionData = data.filter(item => item.subEntityType === 'completion');
  const annotationDataWithRollup = data.filter(item => item.subEntityType === 'ann');

  // separate annotation rollup data (subEntityId=$rollup) from normal annotation data
  const sessionTimeData = annotationDataWithRollup.filter(item => item.subEntityId === '$rollup');
  const annotationData = annotationDataWithRollup.filter(item => item.subEntityId !== '$rollup');

  const annDistmap: Record<string, MEntitySubEntityDistribution[]> = {};
  for (const item of annotationData) {
    if (item.subEntityId in annDistmap) {
      annDistmap[item.subEntityId].push(item);
    } else {
      annDistmap[item.subEntityId] = [item];
    }
  }

  const sessionTimeHistogram = createHistogramData(sessionTimeData);
  const completionHistogram = createHistogramData(completionData);
  return {
    avgCompletionPercentage: completionData[0]?.metric0 || 0,
    avgSessionTimeInSec: sessionTimeData[0]?.metric0 || 0,
    sessionTimeBucket: sessionTimeHistogram,
    completionBucket: completionHistogram,
    perAnnotationStat: Object.entries(annDistmap).reduce((store, [annId, dist]) => {
      const head = dist[0];
      store[annId] = {
        viewsAll: head.metric0,
        timeSpentBucket: createHistogramData(dist),
      };
      return store;
    }, {} as Record<string, {
      viewsAll: number;
      timeSpentBucket: HistogramData;
    }>),
  };
}

export function getEntitySubEntityDistribution(tourId: string) {
  return async () => {
    const data = await api<null, ApiResp<MEntitySubEntityDistribution[]>>(`/entity_subentity_dist_metrics?rid=${tourId}`, { auth: true });
    return Promise.resolve(processEntitySubEntityDist(data.data));
  };
}

export function getActivityData(rid: string, aid: string) {
  return async () => {
    const data = await api<null, ApiResp<Activity[]>>(`/activity_data/${rid}/${aid}`, { auth: true });
    return Promise.resolve(data.data);
  };
}
