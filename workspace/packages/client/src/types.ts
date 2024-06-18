import { IAnnotationConfig, ITourDataOpts, JourneyData, JourneyFlow } from '@fable/common/dist/types';
import { Tx } from './container/tour-editor/chunk-sync-manager';
import { P_RespScreen, P_RespTour } from './entity-processor';
import { IAnnotationConfigWithLocation } from './container/analytics';
import { IAnnotationConfigWithScreenId } from './component/annotation/annotation-config-utils';
import { FableLeadContactProps, FtmQueryParams } from './global';

export interface JourneyModuleWithAnns extends JourneyFlow {
  isPhony?: boolean;
  annsInOrder: IAnnotationConfigWithLocation[]
}

export const enum ElEditType {
  Text = 1,
  Image,
  Display,
  Blur,
  Mask,
  Input
}

export type EncodingTypeText = [timeInSec: number, oldValue: string, newValue: string | null];
export const enum IdxEncodingTypeText {
  TIMESTAMP = 0,
  OLD_VALUE,
  NEW_VALUE,
}

export type EncodingTypeInput = [timeInSec: number, oldValue: string, newValue: string | null];
export const enum IdxEncodingTypeInput {
  TIMESTAMP = 0,
  OLD_VALUE,
  NEW_VALUE,
}

export type EncodingTypeImage = [
  timeInSec: number,
  oldValue: string,
  newValue: string | null,
  height: string,
  width: string
];

export const enum IdxEncodingTypeImage {
  TIMESTAMP = 0,
  OLD_VALUE,
  NEW_VALUE,
  HEIGHT,
  WIDTH,
}

export type EncodingTypeBlur = [
  timeInSec: number,
  oldBlurValue: number,
  newBlurValue: number | null,
  oldFilterPropertyValue: string,
  newFilterPropertyValue: string | null
];
export const enum IdxEncodingTypeBlur {
  TIMESTAMP = 0,
  OLD_BLUR_VALUE,
  NEW_BLUR_VALUE,
  OLD_FILTER_VALUE,
  NEW_FILTER_VALUE,
}

export type EncodingTypeDisplay = [timeInSec: number, oldValue: string, newVal: string | null];
export const enum IdxEncodingTypeDisplay {
  TIMESTAMP = 0,
  OLD_VALUE,
  NEW_VALUE,
}

export type EncodingTypeMask = [timeInSec: number, newStyle: string | null, oldStyle: string];
export const enum IdxEncodingTypeMask {
  TIMESTAMP = 0,
  NEW_STYLE,
  OLD_STYLE,
}

export interface EditValueEncoding {
  [ElEditType.Text]: EncodingTypeText;
  [ElEditType.Image]: EncodingTypeImage;
  [ElEditType.Blur]: EncodingTypeBlur;
  [ElEditType.Display]: EncodingTypeDisplay;
  [ElEditType.Mask]: EncodingTypeMask;
  [ElEditType.Input]: EncodingTypeInput;
}

export const enum IdxEditEncodingText {
  TIMESTAMP = 0,
  OLD_VALUE,
  NEW_VALUE,
}

export type AllEdits<K extends keyof EditValueEncoding> = Record<string, Partial<Record<K, EditValueEncoding[K]>>>;

export type EditItem = [
  key: string,
  path: string,
  type: ElEditType,
  isLocalEdit: boolean,
  timestamp: number,
  edit: Partial<EditValueEncoding[keyof EditValueEncoding]>
];

export const enum IdxEditItem {
  KEY = 0,
  PATH,
  TYPE,
  EDIT_TYPE_LOCAL,
  TIMESTAMP,
  ENCODING,
}

export type NavFn = (uri: string, type: 'annotation-hotspot' | 'abs') => void;
export type AnnotationPerScreen = { screen: P_RespScreen, annotations: IAnnotationConfig[] };

export type TourDataChangeFn = (
  changeType: 'annotation-and-theme' | 'screen',
  screenId: number,
  changeObj: { config: IAnnotationConfig, opts?: ITourDataOpts | null, actionType: 'upsert' | 'delete' },
  tx?: Tx,
  isDefault?: boolean,
) => void;

export type onAnnCreateOrChangeFn = (
  screenId: number,
  config: IAnnotationConfig,
  actionType: 'upsert' | 'delete',
  opts: ITourDataOpts | null,
  tx?: Tx // TODO: remove optionality later
) => void;

export type FrameAssetLoadFn = (params: {
  foundAnnotation: boolean;
}) => void;

export type AnnotationMutationType = 'upsert' | 'delete';
export type AnnotationMutation = [
  screenId: number | null,
  updatedConfig: IAnnotationConfig,
  mutationType: AnnotationMutationType
];

export const enum IdxAnnotationMutation {
  ScreenId = 0,
  Config,
  MutationType,
}

export const enum Ops {
  None = 0,
  DuplicateTour
}

export interface IAnnotationConfigWithScreen extends IAnnotationConfig {
  screen: P_RespScreen;
  stepNumber: string;
}

export type SingleTimeline = Array<IAnnotationConfigWithScreen>;
export type Timeline = Array<SingleTimeline>;

export enum DestinationAnnotationPosition {
  next = 'next',
  prev = 'prev'
}

export interface GlobalSettings {
  shouldLogEvent?: boolean;
}

export type FWin = Window
  & { __fable_global_settings__?: GlobalSettings }
  & { __fable_global_user__?: FableLeadContactProps }
  & { __fable_global_query_param__?: FtmQueryParams }

export type ScreenPickerMode = 'create' | 'navigate';

export type ScreenPickerData = {
  screenPickerMode: ScreenPickerMode;
  annotation: IAnnotationConfigWithScreen | null,
  position: DestinationAnnotationPosition,
  showCloseButton: boolean
}

export const STORAGE_PREFIX_KEY_QUERY_PARAMS = 'fable/qp';

export interface FlowProgress {
  main: string;
  totalSteps: number;
  completedSteps: number;
}

export const JOURNEY_PROGRESS_LOCAL_STORE_KEY = 'fable/journey';

export enum InternalEvents {
  DemoLoadingStarted = 'demo_loading_started',
  DemoLoadingFinished = 'demo_loading_finished',
  OnAnnotationNav = 'on_annotation_navigation',
  OnNavigation = 'on_navigation',
  JourneySwitch = 'journey_switch',
  OnCtaClicked = 'on_cta_clicked',
  LeadAssign = 'lead_assign',
}

export enum ExtMsg {
  DemoLoadingStarted = 'demo-loading-started',
  DemoLoadingFinished = 'demo-loading-finished',
  OnNavigation = 'on-navigation',
  JourneySwitch = 'journey-switch',
  NavToAnnotation = 'navigate-to-annotation'
}

interface MsgBase {
  sender: 'sharefable.com',
  type: ExtMsg,
}

export interface Msg<T> extends MsgBase {
  payload: T
}

export interface CommonPayloadProps {
  demoRid: string,
  demoDisplayName: string,
  demoUrl: string
}

export interface Payload_DemoLoadingStarted extends CommonPayloadProps { }
export interface Payload_DemoLoadingFinished {
  annConfigs: IAnnotationConfigWithScreenId[] | null,
  journeyData: JourneyModuleWithAnns[] | null
}
export interface Payload_JourneySwitch {
  fromJourney: string | null;
  currentJourney: string;
}
export interface Payload_Navigation {
  currentAnnotationRefId: string;
  journeyIndex: number;
}

export interface Payload_NavToAnnotation {
  main?: string
  action?: 'prev' | 'next'
}

export interface GlobalAppData {
  ftmQueryParams?: FtmQueryParams,
  demo?: P_RespTour,
  journeyData?: JourneyNameIndexData
}

export interface JourneyNameIndexData {
  journeyName?: string | null,
  journeyIndex?: number
}

export type GlobalWin = Window & { __fable_global_app_data__?: GlobalAppData }
export type MultiNodeModalData = {
  leftCoord: number,
  selectedMultiNode: IAnnotationConfigWithScreen[] | null
}

export interface queryData {
  hm: 0 | 1, // hide module
  ha: 0 | 1 // hide annotation
}

export type TourApplyAllChangeFn = (
  tx?: Tx,
) => void;

export const SCREEN_EDITOR_ID = 'fable-ann-editorial-modal';

export interface LeadActivityData {
  aid: string;
  sid: string;
  uts: string;
  payloadAnnId:string;
  payloadButtonId: string;
}

export interface LeadActivityWithTime extends LeadActivityData {
  timeSpenOnAnnInSec: number
}

export type AnnInverseLookupIndex = Record<string, {
    journeyName: string,
    isJourneyPhony: boolean;
    stepNo: number,
    ann: IAnnotationConfigWithLocation,
    flowIndex: number,
    flowLength: number,
  }>;

export enum TourMainValidity {
  Valid,
  Main_Not_Set,
  Main_Not_Present,
  Journey_Main_Not_Present,
}

export type JourneyOrOptsDataChange = (
  newOpts: ITourDataOpts | null,
  newJourney: JourneyData | null, tx?: Tx
  )=> void;

export const SiteThemePresets = {
  light_green: { bg1: '#6DE195', bg2: '#C4E759' },
  dark_green: { bg1: '#41C7AF', bg2: '#54E38E' },
  light_blue: { bg1: '#ABC7FF', bg2: '#C1E3FF' },
  med_blue: { bg1: '#6CACFF', bg2: '#8DEBFF' },
  dark_blue: { bg1: '#5583EE', bg2: '#41D8DD' },
  violet: { bg1: '#A16BFE', bg2: '#DEB0DF' },
  viloet_pink: { bg1: '#D279EE', bg2: '#F8C390' },
  orange_yellow: { bg1: '#F78FAD', bg2: '#FDEB82' },
  maroon_violet: { bg1: '#BC3D2F', bg2: '#A16BFE' },
  pink_red: { bg1: '#A43AB2', bg2: '#E13680' },
  dark_red: { bg1: '#9D2E7D', bg2: '#E16E93' },
  light_pink: { bg1: '#F5CCF6', bg2: '#F1EEF9' },
  white: { bg1: '#F0EFF0', bg2: '#FAF8F9' },
  black: { bg1: '#121317', bg2: '#323B42' }
};

export interface SiteData {
    logo: string;
    title: string;
    navLink: string;
    ctaText: string;
    ctaLink: string;
    themePreset?: keyof typeof SiteThemePresets;
    bg1: string;
    bg2: string;
    headerBg: string;
    v: number;
  }

export interface IframePos {
  left: number,
  top: number,
  height: number,
  width: number
}

export interface ScreenSizeData {
  iframePos: IframePos,
  scaleFactor: number
}

export interface HiddenEls {
  displayNoneEls: HTMLElement[];
  visibilityHiddenEls: HTMLElement[];
  opacityZeroEls: HTMLElement[];
}

export const enum ScreenMode {
  DESKTOP = 'Desktop',
  MOBILE = 'Mobile'
}

export type ElPathKey = 'm_id' | 'id';

export interface FeatureAvailability {
  isAvailable: boolean,
  isInBeta: boolean
}
