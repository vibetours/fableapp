import { SerDoc } from '@fable/common/dist/types';

export interface FrameDataToBeProcessed {
    oid: number;
    frameId: number;
    tabId: number;
    type: 'serdom' | 'thumbnail' | 'sigstop';
    data: SerDoc | string;
}

export interface ScreenInfo {
    id: number;
    elPath: string;
    icon: string;
}

export interface DBData {
    id: string;
    screensData: string;
    cookies: string;
    screenStyleData: string;
}

export enum ModalTab {
  INIT,
  CREATE_TOUR,
  SELECT_THEME,
  SELECT_BORDER_RADIUS
}
