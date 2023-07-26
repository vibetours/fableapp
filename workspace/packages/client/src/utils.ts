import { IAnnotationConfig } from '@fable/common/dist/types';
import { TState } from './reducer';
import { AnnotationPerScreen } from './types';
import defferedErr from './deffered-error';

export function isBodyEl(el: HTMLElement): boolean {
  return !!(el && el.tagName && el.tagName.toLowerCase() === 'body');
}

export function openTourExternalLink(uri: string) {
  const qParamsStr = window.location.search;
  const qParams = new URLSearchParams(qParamsStr);
  qParams.forEach((val, key) => {
    const pattern = `{{${key}}}`;
    uri = uri.replaceAll(pattern, val);
  });

  const url = new URL(uri);
  const sharefableUrl = new URL(process.env.REACT_APP_CLIENT_ENDPOINT as string);
  if (url.host === sharefableUrl.host) {
    window.open(uri, '_self');
  } else {
    window.open(uri, '_blank')?.focus();
  }
}

export function getAnnotationsPerScreen(state: TState): AnnotationPerScreen[] {
  const anPerScreen: AnnotationPerScreen[] = [];
  const combinedAnnotations: Record<string, IAnnotationConfig> = {};
  for (const [screenId, anns] of Object.entries(state.default.localAnnotations)) {
    for (const an of anns) {
      combinedAnnotations[`${screenId}/${an.refId}`] = an;
    }
  }
  for (const [screenId, anns] of Object.entries(state.default.remoteAnnotations)) {
    for (const an of anns) {
      const key = `${screenId}/${an.refId}`;
      if (!(key in combinedAnnotations)) {
        combinedAnnotations[key] = an;
      }
    }
  }
  const screenAnMap: Record<string, IAnnotationConfig[]> = {};
  for (const [qId, an] of Object.entries(combinedAnnotations)) {
    const [screenId] = qId.split('/');
    if (screenId in screenAnMap) {
      screenAnMap[screenId].push(an);
    } else {
      screenAnMap[screenId] = [an];
      const screen = state.default.allScreens.find(s => s.id === +screenId);
      if (screen) {
        anPerScreen.push({ screen, annotations: screenAnMap[screenId] });
      } else {
        defferedErr(new Error(`screenId ${screenId} is part of tour config, but is not present as part of entity association`));
      }
    }
  }
  // If there are screen present as part of a tour but no annotation is yet made then also we
  // show this
  const screensForTours = state.default.currentTour?.screens || [];
  for (const screen of screensForTours) {
    if (!(screen.id in screenAnMap)) {
      anPerScreen.push({ screen, annotations: [] });
    }
  }
  return anPerScreen;
}

export function isBlankString(str: string): boolean {
  return str.trim() === '';
}
export const isVideoAnnotation = (config: IAnnotationConfig): boolean => !isBlankString(config.videoUrl)
    || (!isBlankString(config.videoUrlMp4)
      || !isBlankString(config.videoUrlWebm)
      || !isBlankString(config.videoUrlHls));

export function flatten<T>(arr: Array<T[]>): T[] {
  const flatArr: T[] = [];
  for (const item of arr) {
    flatArr.push(...item);
  }
  return flatArr;
}
