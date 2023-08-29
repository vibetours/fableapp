import { IAnnotationConfig, ITourDataOpts } from '@fable/common/dist/types';
import { Tx } from './container/tour-editor/chunk-sync-manager';
import { P_RespScreen } from './entity-processor';

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
}

export type ConnectedOrderedAnnGroupedByScreen = Array<Array<Array<IAnnotationConfigWithScreen>>>;
export type OrderedAnnGroupedByScreen = Array<Array<IAnnotationConfigWithScreen>>;

export enum DestinationAnnotationPosition {
  next,
  prev
}

export interface GlobalSettings {
  shouldLogEvent?: boolean;
}

export type FWin = Window & { __fable_global_settings__?: GlobalSettings }

export type ScreenPickerMode = 'create' | 'navigate';

export type ScreenPickerData = {
  screenPickerMode: ScreenPickerMode;
  annotation: IAnnotationConfigWithScreen | null,
  position: DestinationAnnotationPosition,
  showCloseButton: boolean
}
