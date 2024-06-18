import {
  Plan,
  RespCommonConfig,
  RespScreen,
  RespSubscription,
  RespTour,
  RespTourWithScreens,
  RespVanityDomain,
} from '@fable/common/dist/api-contract';
import {
  DEFAULT_ANN_DIMS,
  deepcopy,
  getDisplayableTime,
  getSampleJourneyData
} from '@fable/common/dist/utils';
import {
  AnnotationPositions,
  JourneyData,
  IAnnotationConfig,
  IAnnotationOriginConfig,
  ITourDataOpts,
  TourData,
  TourDataWoScheme,
  TourScreenEntity,
  VideoAnnotationPositions,
} from '@fable/common/dist/types';
import { DEFAULT_BLUE_BORDER_COLOR } from '@fable/common/dist/constants';
import {
  AllEdits,
  EditItem,
  ElEditType,
  EditValueEncoding,
  IdxEncodingTypeText,
  IdxEncodingTypeImage,
  IdxEncodingTypeBlur,
  IdxEncodingTypeDisplay,
  IdxEncodingTypeMask,
  IdxEncodingTypeInput,
  SiteData
} from './types';
import { getDefaultSiteData, isVideoAnnotation as isVideoAnn } from './utils';
import { isLeadFormPresentInHTMLStr } from './component/annotation-rich-text-editor/utils/lead-form-node-utils';
import { FeatureForPlan, FeaturePerPlan, PlanDetail } from './plans';

export function getNumberOfDaysFromNow(d: Date): [string, number] {
  const msDiffs = +d - +new Date();
  const days = Math.floor(msDiffs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((msDiffs / (1000 * 60 * 60)) % 24);
  const res = days > 0 ? `in ${days} ${days > 1 ? 'days' : 'day'}` : `in ${hours} ${hours > 1 ? 'hours' : 'hour'}`;

  return [res, days];
}

export interface P_RespSubscription extends RespSubscription {
  dTrialEndsOn: Date;
  dTrialStartedOn: Date;
  displayableTrialEndsOn: String;
}

export function processRawSubscriptionData(sub: RespSubscription): P_RespSubscription {
  const d = new Date(sub.trialEndsOn);
  const [readableDays, days] = getNumberOfDaysFromNow(d);
  return {
    ...sub,
    dTrialEndsOn: d,
    dTrialStartedOn: new Date(sub.trialStartedOn),
    displayableTrialEndsOn: readableDays ? `Expiring ${readableDays}` : 'Expired'
  };
}

/* ************************************************************************* */

export interface P_RespScreen extends RespScreen {
  urlStructured: URL;
  thumbnailUri: URL;
  dataFileUri: URL;
  editFileUri: URL;
  displayableUpdatedAt: string;
  related: P_RespScreen[];
  numUsedInTours: number;
  isRootScreen: boolean;
}

function getFileUris(
  screen: RespScreen,
  config: RespCommonConfig,
  publishForTour?: RespTour
): {editFileUri: URL, dataFileUri: URL} {
  const screenAssetPath = config.screenAssetPath;
  const assetPrefixHash = screen.assetPrefixHash;
  const editFileName = publishForTour ? publishForTour.pubEditFileName : config.editFileName;
  const dataFileName = config.dataFileName;

  const dataFileUri = new URL(`${screenAssetPath}${assetPrefixHash}/${dataFileName}`);
  const editFileUri = new URL(`${screenAssetPath}${assetPrefixHash}/${editFileName}?ts=${+new Date()}`);

  return { editFileUri, dataFileUri };
}

export function processRawScreenData(screen: RespScreen, config: RespCommonConfig, publishForTour?: RespTour): P_RespScreen {
  const d = new Date(screen.updatedAt);
  const { editFileUri, dataFileUri } = getFileUris(screen, config, publishForTour);

  return {
    ...screen,
    createdAt: new Date(screen.createdAt),
    updatedAt: d,
    isRootScreen: screen.parentScreenId === 0,
    displayableUpdatedAt: getDisplayableTime(d),
    urlStructured: screen.url === ''
      ? new URL(`https://${screen.displayName.toLowerCase().trim().replace(/\W+/g, '-')}}.img.flbk.sharefable.com`)
      : new URL(screen.url),
    thumbnailUri: new URL(`${config.commonAssetPath}${screen.thumbnail}`),
    dataFileUri,
    editFileUri,
    related: [],
    numUsedInTours: 0,
  };
}

export function groupScreens(screens: P_RespScreen[]): P_RespScreen[] {
  const parentScreenMap: Record<number, P_RespScreen> = {};
  for (const s of screens) {
    if (s.isRootScreen) {
      parentScreenMap[s.id] = s;
    }
  }

  for (const s of screens) {
    if (s.isRootScreen) {
      continue;
    }
    parentScreenMap[s.parentScreenId].related.push(s);
  }

  const parentScreenArr: P_RespScreen[] = [];
  for (const s of Object.values(parentScreenMap)) {
    s.related.sort((m, n) => +n.updatedAt - +m.updatedAt);
    s.numUsedInTours = s.related.length;
    parentScreenArr.push(s);
  }
  return parentScreenArr.sort((m, n) => +n.updatedAt - +m.updatedAt);
}

/* ************************************************************************* */

export interface P_RespVanityDomain extends RespVanityDomain {
  displayableCreatedAt: string;
}

export function processRawVanityDomain(domain: RespVanityDomain): P_RespVanityDomain {
  const createdAt = new Date(domain.createdAt);
  return {
    ...domain,
    createdAt,
    displayableCreatedAt: getDisplayableTime(createdAt)
  };
}

/* ************************************************************************* */

export interface P_RespTour extends RespTour {
  dataFileUri: URL;
  displayableUpdatedAt: string;
  isPlaceholder: boolean;
  screens?: P_RespScreen[];
  loaderFileUri: URL;
  site: SiteData
}

function getDataFileUri(tour: RespTour | RespTourWithScreens, config: RespCommonConfig, publishForTour?: RespTour): URL {
  const tourAssetPath = config.tourAssetPath;
  const assetPrefixHash = tour.assetPrefixHash;
  const dataFileName = publishForTour
    ? publishForTour.pubDataFileName
    : config.dataFileName;

  const dataFileUri = new URL(`${tourAssetPath}${assetPrefixHash}/${dataFileName}?ts=${+new Date()}`);

  return dataFileUri;
}

function getLoaderFileUri(tour: RespTour | RespTourWithScreens, config: RespCommonConfig, publishForTour?: RespTour): URL {
  const tourAssetPath = config.tourAssetPath;
  const assetPrefixHash = tour.assetPrefixHash;
  const loaderFileName = publishForTour ? publishForTour.pubLoaderFileName : config.loaderFileName;
  const loaderFileUri = new URL(`${tourAssetPath}${assetPrefixHash}/${loaderFileName}?ts=${+new Date()}`);

  return loaderFileUri;
}

export function processRawTourData(
  tour: RespTour | RespTourWithScreens,
  config: RespCommonConfig,
  isPlaceholder = false,
  publishForTour: RespTour | undefined = undefined
): P_RespTour {
  const d = new Date(tour.updatedAt);

  let tTour;
  if ((tTour = (tour as RespTourWithScreens)).screens) {
    tTour.screens = tTour.screens.map(s => processRawScreenData(s, config, publishForTour));
  }

  const dataFileUri = getDataFileUri(tour, config, publishForTour);
  const loaderFileUri = getLoaderFileUri(tour, config, publishForTour);
  const site = normalizeBackwardCompatibilityForBrandData(tour);
  return {
    ...tour,
    createdAt: new Date(tour.createdAt),
    updatedAt: d,
    lastPublishedDate: tour.lastPublishedDate && new Date(tour.lastPublishedDate),
    displayableUpdatedAt: getDisplayableTime(d),
    dataFileUri,
    loaderFileUri,
    isPlaceholder,
    site
  } as P_RespTour;
}

export function getThemeAndAnnotationFromDataFile(data: TourData, isLocal = true): {
  annotations: Record<string, IAnnotationConfig[]>,
  annotationsIdMap: Record<string, string[]>,
  opts: ITourDataOpts,
  journey: JourneyData
} {
  const annotationsPerScreen: Record<string, IAnnotationConfig[]> = {};
  const annotationsIdMapPerScreen: Record<string, string[]> = {};
  for (const [screenId, entity] of Object.entries(data.entities)) {
    if (entity.type === 'screen') {
      const anns: IAnnotationConfig[] = [];
      const ids: string[] = [];
      for (const [annId, ann] of Object.entries((entity as TourScreenEntity).annotations)) {
        ids.push(annId);
        anns.push(ann as IAnnotationConfig);
      }
      annotationsPerScreen[screenId] = isLocal ? (anns as IAnnotationConfig[]) : anns.map(remoteToLocalAnnotationConfig);
      annotationsIdMapPerScreen[screenId] = ids;
    } else {
      throw new Error('TODO not yet implemented');
    }
  }

  return {
    annotations: isLocal ? annotationsPerScreen : remoteToLocalAnnotationConfigMap(
      annotationsPerScreen as Record<string, IAnnotationOriginConfig[]>,
      data.opts
    ),
    annotationsIdMap: annotationsIdMapPerScreen,
    opts: isLocal ? data.opts : normalizeBackwardCompatibilityForOpts(data.opts),
    journey: normalizeBackwardCompatibilityForJourney(data.journey, data.opts)
  };
}

/* ************************************************************************* */

const isEditToBeRemoved = (
  editType: ElEditType,
  editArray: EditValueEncoding[keyof EditValueEncoding]
): boolean => {
  switch (editType) {
    case ElEditType.Text:
      return editArray[IdxEncodingTypeText.NEW_VALUE] === null;

    case ElEditType.Image:
      return editArray[IdxEncodingTypeImage.NEW_VALUE] === null;

    case ElEditType.Blur:
      return editArray[IdxEncodingTypeBlur.NEW_BLUR_VALUE] === null;

    case ElEditType.Display:
      return editArray[IdxEncodingTypeDisplay.NEW_VALUE] === null;

    case ElEditType.Mask:
      return editArray[IdxEncodingTypeMask.NEW_STYLE] === null;

    case ElEditType.Input:
      return editArray[IdxEncodingTypeInput.NEW_VALUE] === null;

    default:
      return false;
  }
};

export function mergeEdits(master: AllEdits<ElEditType>, incomingEdits: AllEdits<ElEditType>): AllEdits<ElEditType> {
  for (const path of Object.keys(incomingEdits)) {
    if (path in master) {
      const perElEdit = incomingEdits[path];
      for (const editType of Object.keys(perElEdit)) {
        if (isEditToBeRemoved(+editType as ElEditType, perElEdit[+editType as ElEditType]!)) {
          delete master[path][+editType as ElEditType];
        } else {
          master[path][+editType as ElEditType] = perElEdit[+editType as ElEditType];
        }
      }
    } else {
      master[path] = incomingEdits[path];
    }
  }

  return master;
}

export function localToRemoteAnnotationConfig(lc: IAnnotationConfig): IAnnotationOriginConfig {
  return {
    id: lc.id,
    refId: lc.refId,
    grpId: lc.grpId,
    zId: lc.zId,
    bodyContent: lc.bodyContent,
    displayText: lc.displayText,
    buttons: lc.buttons,
    monoIncKey: lc.monoIncKey,
    createdAt: lc.createdAt,
    updatedAt: lc.updatedAt,
    positioning: lc.positioning,
    type: lc.type,
    size: lc.size,
    isHotspot: lc.isHotspot,
    hideAnnotation: lc.hideAnnotation,
    videoUrl: lc.videoUrl,
    hotspotElPath: lc.hotspotElPath,
    videoUrlHls: lc.videoUrlHls,
    videoUrlMp4: lc.videoUrlMp4,
    videoUrlWebm: lc.videoUrlWebm,
    showOverlay: lc.showOverlay,
    buttonLayout: lc.buttonLayout,
    selectionShape: lc.selectionShape,
    selectionEffect: lc.selectionEffect,
    targetElCssStyle: lc.targetElCssStyle,
    annCSSStyle: lc.annCSSStyle,
    customDims: lc.customDims,
    annotationSelectionColor: lc.annotationSelectionColor,
    isLeadFormPresent: lc.isLeadFormPresent,
    m_id: lc.m_id,
    scrollAdjustment: lc.scrollAdjustment,
    audio: lc.audio,
  };
}

export function remoteToLocalAnnotationConfig(rc: IAnnotationOriginConfig): IAnnotationConfig {
  return {
    ...rc,
    syncPending: false,
  };
}

export function remoteToLocalAnnotationConfigMap(
  config: Record<string, IAnnotationOriginConfig[]>,
  opts: ITourDataOpts
): Record<string, IAnnotationConfig[]> {
  const config2: Record<string, IAnnotationConfig[]> = {};
  for (const [screenId, anns] of Object.entries(config)) {
    config2[screenId] = anns.map(an => remoteToLocalAnnotationConfig(normalizeBackwardCompatibility(an, opts)));
  }
  return config2;
}

const replaceAbsoluteFontSizesWithCSSVars = (bodyContent: string): string => {
  const result = bodyContent
    .replaceAll('font-size: 18px', 'font-size: var(--f-font-normal)')
    .replaceAll('font-size: 24px', 'font-size: var(--f-font-large)')
    .replaceAll('font-size: 30px', 'font-size: var(--f-font-huge)');
  return result;
};

const DEMO_RESP_SUPPORTED_VERSION = 1714472243;

export function normalizeBackwardCompatibility(
  an: IAnnotationOriginConfig,
  opts: ITourDataOpts
): IAnnotationOriginConfig {
  if (an.createdAt < DEMO_RESP_SUPPORTED_VERSION) {
    an.bodyContent = replaceAbsoluteFontSizesWithCSSVars(an.bodyContent);
  }

  if (an.annotationSelectionColor === undefined || an.annotationSelectionColor === null) {
    // annotationSelectionColor was present in tour opts previous versions and now this config is moved to annotation cofnig
    const tOpts = opts as ITourDataOpts & { annotationSelectionColor?: string };
    an.annotationSelectionColor = tOpts.annotationSelectionColor || DEFAULT_BLUE_BORDER_COLOR;
  }

  if (an.type === 'cover') an.isHotspot = false;
  else an.isHotspot = true;

  if (an.hideAnnotation === undefined || an.hideAnnotation === null) {
    an.hideAnnotation = false;
  }

  if (an.videoUrl === undefined || an.videoUrl === null) {
    an.videoUrl = '';
  }

  if (an.videoUrlMp4 === undefined || an.videoUrlMp4 === null) {
    an.videoUrlMp4 = '';
  }

  if (an.videoUrlHls === undefined || an.videoUrlHls === null) {
    an.videoUrlHls = '';
  }

  if (an.videoUrlWebm === undefined || an.videoUrlWebm === null) {
    an.videoUrlWebm = '';
  }

  if (an.buttonLayout === undefined || an.buttonLayout === null) {
    an.buttonLayout = 'default';
  }

  if (an.selectionShape === undefined || an.selectionShape === null) {
    an.selectionShape = 'box';
  }

  if (an.selectionEffect === undefined || an.selectionEffect === null) {
    an.selectionEffect = 'regular';
  }

  if (an.scrollAdjustment === undefined || an.scrollAdjustment === null) {
    an.scrollAdjustment = 'auto';
  }

  if (an.targetElCssStyle === undefined || an.targetElCssStyle === null) {
    an.targetElCssStyle = '';
  }

  if (an.annCSSStyle === undefined || an.annCSSStyle === null) {
    an.annCSSStyle = '';
  }

  if (an.customDims === undefined || an.customDims === null) {
    an.customDims = DEFAULT_ANN_DIMS;
  }

  if (an.zId === undefined || an.zId === null) {
    an.zId = an.refId;
  }

  if (an.audio === undefined || an.audio === null) {
    an.audio = null;
  }

  if (an.audio && (an.audio.fb === undefined || an.audio.fb === null)) {
    an.audio.fb = { url: an.audio.webm, type: 'audio/webm' };
  }

  if (an.isLeadFormPresent === undefined || an.isLeadFormPresent === null) {
    an.isLeadFormPresent = isLeadFormPresentInHTMLStr(an.bodyContent);
  }

  const isVideoAnnotation = isVideoAnn(an as IAnnotationConfig);
  if (isVideoAnnotation && an.positioning === AnnotationPositions.Auto) {
    an.positioning = VideoAnnotationPositions.BottomRight;
  }

  if (an.showOverlay === undefined || an.showOverlay === null) {
    // showOverlay was present in tour opts previous versions and now this config is moved to annotation cofnig
    const tOpts = opts as ITourDataOpts & { showOverlay?: boolean };
    if (!(tOpts.showOverlay === undefined || tOpts.showOverlay === null)) {
      an.showOverlay = !!tOpts.showOverlay;
    } else {
      an.showOverlay = true;
    }
  }

  if (an.m_id === undefined || an.m_id === null) {
    an.m_id = an.id;
  }

  return an;
}

// the atomicity of merge is not granular (property level changes), rather logical entity level.
// like if an annotation config needs to be merged we merge the full annotation config object as a whole
// not property of config level
export function mergeTourData(
  master: TourDataWoScheme,
  incoming: Partial<TourDataWoScheme>,
  convertLocalToRemote = false
): TourDataWoScheme {
  const newMaster = deepcopy(master);
  if (incoming.opts) {
    newMaster.opts = incoming.opts;
  }
  if (incoming.entities) {
    for (const [entityKey, entity] of Object.entries(incoming.entities)) {
      if (entity === null) {
        delete newMaster.entities[entityKey];
        continue;
      }

      if (entityKey in newMaster.entities) {
        if (entity.type === 'screen') {
          const newMasterScreenEntity = newMaster.entities[entityKey] as TourScreenEntity;
          const screenEntity = entity as TourScreenEntity;
          for (const [anId, ann] of Object.entries(screenEntity.annotations)) {
            if (ann === null) {
              if (!convertLocalToRemote) {
                // TODO take care of the type in a better way this keeps the null value to the local copy of
                // the annotation data, otherwise while merging to master it would have no information about
                // the annotation that to be deleted
                (newMasterScreenEntity.annotations as any)[anId] = null;
              } else {
                delete newMasterScreenEntity.annotations[anId];
              }
              continue;
            }
            const typedConfig = (convertLocalToRemote
              ? localToRemoteAnnotationConfig(ann as IAnnotationConfig)
              : ann) as IAnnotationOriginConfig;
            newMasterScreenEntity.annotations[anId] = typedConfig;
          }
        } else {
          throw new Error('TODO not yet implemented');
        }
      } else {
        newMaster.entities[entityKey] = entity;
      }
    }
  }
  if (incoming.journey) {
    newMaster.journey = incoming.journey;
  }

  return newMaster;
}

export function convertEditsToLineItems(editChunks: AllEdits<ElEditType>, editTypeLocal: boolean): EditItem[] {
  const editList: EditItem[] = [];
  for (const [path, edits] of Object.entries(editChunks)) {
    for (const [type, editDetails] of Object.entries(edits)) {
      editList.push([`${path}:${type}`, path, +type, editTypeLocal, editDetails[0], editDetails]);
    }
  }
  return editList;
}

export function normalizeBackwardCompatibilityForOpts(opts: ITourDataOpts): ITourDataOpts {
  if (opts === null || opts === undefined) {
    return opts;
  }
  const newOpts = { ...opts };
  if (newOpts.annotationFontColor === undefined || newOpts.annotationFontColor === null) {
    newOpts.annotationFontColor = '#424242';
  }

  if (newOpts.annotationFontFamily === undefined) {
    newOpts.annotationFontFamily = null;
  }

  if (newOpts.borderRadius === undefined || newOpts.borderRadius === null) {
    newOpts.borderRadius = 4;
  }

  if (newOpts.annotationPadding === undefined || newOpts.annotationPadding === null) {
    newOpts.annotationPadding = '14 14';
  }

  if (newOpts.showFableWatermark === undefined || newOpts.showFableWatermark === null) {
    newOpts.showFableWatermark = true;
  }

  if (newOpts.showStepNum === undefined || newOpts.showStepNum === null) {
    newOpts.showStepNum = true;
  }

  return newOpts;
}

export function normalizeBackwardCompatibilityForJourney(
  journey: JourneyData,
  opts: ITourDataOpts
): JourneyData {
  if (journey === null || journey === undefined) {
    return getSampleJourneyData();
  }

  if (!journey.primaryColor) {
    journey.primaryColor = opts.primaryColor;
  }

  if (!journey.hideModuleOnLoad) {
    journey.hideModuleOnLoad = false;
  }

  return journey;
}

export function normalizeBackwardCompatibilityForBrandData(
  tour: RespTour
): SiteData {
  const defaultSiteData = getDefaultSiteData(tour);
  return {
    ...defaultSiteData,
    ...(tour.site || {})
  };
}

/*
  This method merge the featurePerPlan and userSpecificOverridesPerPlan and create a FeatureForPlan object
  which will store the detail for each feature according to users plan.
  eg. {
     no_of_demos: {
        test: Test.COUNT,
        value: '<=1',
        plan: Plan.SOLO
     },
     no_of_creator: {
      test: Test.COUNT,
      value: '<=1',
      plan: '*'
     }
  }
*/
export function mergeAndTransformFeaturePerPlan(
  featurePerPlan: FeaturePerPlan,
  userSpecificOverridesPerPlan : FeaturePerPlan | null | undefined,
  plan: Plan
): FeatureForPlan {
  const newFeaturePerPlan: FeaturePerPlan = { ...featurePerPlan, ...(userSpecificOverridesPerPlan || {}) };
  const featureForPlan: FeatureForPlan = {};

  for (const key in newFeaturePerPlan) {
    if (newFeaturePerPlan[key]) {
      let planFound = false;
      let forRemainingPlan: PlanDetail | null = null;
      const planDetails = newFeaturePerPlan[key].plans;
      const isInBeta = newFeaturePerPlan[key].isInBeta || false;
      for (const planDetail of planDetails) {
        if (planDetail.plan === plan) {
          featureForPlan[key] = { ...planDetail, isInBeta };
          planFound = true;
          break;
        } else if (planDetail.plan === '*') {
          forRemainingPlan = planDetail;
        }
      }

      if (!planFound) {
        featureForPlan[key] = { ...forRemainingPlan!, isInBeta };
      }
    }
  }

  return featureForPlan;
}
