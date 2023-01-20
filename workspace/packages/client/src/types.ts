export const enum ElEditType {
  Text = 1,
  Image,
  Display,
  Blur,
}

export type EncodingTypeText = [timeInSec: number, oldValue: string, newValue: string];
export const enum IdxEncodingTypeText {
  TIMESTAMP = 0,
  OLD_VALUE,
  NEW_VALUE
}

export type EncodingTypeImage = [timeInSec: number, oldValue: string, newValue: string, height: string, width: string];
export type EncodingTypeBlur = [
    timeInSec: number,
    oldBlurValue: number,
    newBlurValue: number,
    oldFilterPropertyValue: string,
    newFilterPropertyValue: string
  ];
export type EncodingTypeDisplay = [timeInSec: number, oldValue: string, newVal: string];

export interface EditValueEncoding {
  [ElEditType.Text]: EncodingTypeText;
  [ElEditType.Image]: EncodingTypeImage;
  [ElEditType.Blur]: EncodingTypeBlur;
  [ElEditType.Display]: EncodingTypeDisplay;
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
