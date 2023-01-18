export const enum ElEditType {
  Text = 1,
  Image,
  Display,
  Blur,
}

export interface EditValueEncoding {
  [ElEditType.Text]: [timeInSec: number, oldValue: string, newValue: string];
  [ElEditType.Image]: [timeInSec: number, oldValue: string, newValue: string, height: string, width: string];
  [ElEditType.Blur]: [
    timeInSec: number,
    oldBlurValue: number,
    newBlurValue: number,
    oldFilterPropertyValue: string,
    newFilterPropertyValue: string
  ];
  [ElEditType.Display]: [timeInSec: number, oldValue: string, newVal: string];
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
  timestamp: number,
  edit: Partial<EditValueEncoding[keyof EditValueEncoding]>
];

export const enum IdxEditItem {
  KEY = 0,
  PATH,
  TYPE,
  TIMESTAMP,
  ENCODING,
}
