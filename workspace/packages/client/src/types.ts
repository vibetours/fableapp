import { IAnnotationConfig, ITourDataOpts, JourneyFlow } from '@fable/common/dist/types';
import { Tx } from './container/tour-editor/chunk-sync-manager';
import { P_RespScreen, P_RespTour } from './entity-processor';
import { IAnnotationConfigWithLocation } from './container/analytics';
import { IAnnotationConfigWithScreenId } from './component/annotation/annotation-config-utils';

export interface JourneyModuleWithAnns extends JourneyFlow {
  annsInOrder: IAnnotationConfigWithLocation[]
}

export const enum ElEditType {
  Text = 1,
  Image,
  Display,
  Blur,
  Mask
}

export type EncodingTypeText = [timeInSec: number, oldValue: string, newValue: string | null];
export const enum IdxEncodingTypeText {
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
export type AnnotationPerScreen = {screen: P_RespScreen, annotations: IAnnotationConfig[]};

export type TourDataChangeFn = (
    changeType: 'annotation-and-theme' | 'screen',
    screenId: number | null,
    changeObj: {config: IAnnotationConfig, opts?: ITourDataOpts | null, actionType: 'upsert' | 'delete'},
    tx?: Tx,
    isDefault?: boolean,
) => void;

export type onAnnCreateOrChangeFn = (
  screenId: number | null,
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

export interface GlobalUser {
  userEmail: string;
  lastName: string;
  org: string
}

export type FWin = Window
  & { __fable_global_settings__?: GlobalSettings }
  & { __fable_global_user__?: GlobalUser };

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

export interface Payload_DemoLoadingStarted extends CommonPayloadProps{}
export interface Payload_DemoLoadingFinished{
  annConfigs:IAnnotationConfigWithScreenId[] | null,
  journeyData: JourneyModuleWithAnns[] | null
}
export interface Payload_JourneySwitch{
  fromJourney: string | null;
  currentJourney: string;
}
export interface Payload_Navigation{
  currentAnnotationRefId: string;
  journeyIndex: number;
}

export interface Payload_NavToAnnotation{
  main?: string
  action?: 'prev' | 'next'
}

export interface GlobalAppData {
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
