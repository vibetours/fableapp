import { ScreenType } from '@fable/common/dist/api-contract';
import { SerDoc } from '@fable/common/dist/types';

export interface FrameDataToBeProcessed {
    oid: number;
    frameId: number;
    tabId: number;
    type: 'serdom' | 'thumbnail' | 'sigstop';
    data: SerDoc | string;
}

export interface ScreenInfo {
    info: {
        id: number;
        elPath: string;
        icon: string;
        type: ScreenType;
        rid: string;
        replacedWithImgScreen: boolean;
    } | null
    skipped: boolean;
    vpd: Vpd | null;
}

export interface Vpd {
    width: number;
    height: number;
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

export type AnnotationThemeType = 'global' | 'suggested' | 'page-generated';

export type ColorThemeItem = { color: string, type: AnnotationThemeType};
export type BorderRadiusThemeItem = { value: number | 'global', type: AnnotationThemeType};
