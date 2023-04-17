import {
  IAnnotationConfig,
  ITourEntityHotspot,
  ScreenData,
  SerDoc,
  SerNode,
  TourData,
  TourScreenEntity
} from '@fable/common/dist/types';
import api from '@fable/common/dist/api';
import {
  ApiResp,
  ReqCopyScreen,
  ReqNewScreen,
  ReqNewTour,
  ReqProxyAsset,
  ReqRecordEdit,
  RespProxyAsset,
  RespScreen,
  RespTour
} from '@fable/common/dist/api-contract';
import { createEmptyTourDataFile, getSampleConfig, getCurrentUtcUnixTime } from '@fable/common/dist/utils';
import { FrameDataToBeProcessed, ScreenInfo } from './types';
import { P_RespTour } from '../../entity-processor';

export async function saveScreens(
  data: FrameDataToBeProcessed[][],
  cookies: chrome.cookies.Cookie[],
): Promise<ScreenInfo[]> {
  const screenFramesToBeProcessed: FrameDataToBeProcessed[][] = data || [];
  const screens: ScreenInfo[] = [];
  for (const frames of screenFramesToBeProcessed) {
    const screenInfo = await processScreen(frames, cookies);
    screens.push(screenInfo);
  }

  return screens;
}

export async function saveAsTour(
  screens: ScreenInfo[],
  existingTour: P_RespTour | null,
  tourName: string = 'Untitled',
): Promise<ApiResp<RespTour>> {
  const { tourDataFile, tourRid } = await addAnnotationConfigs(screens, existingTour, tourName);
  const res = await saveTour(tourRid, tourDataFile);
  return res;
}

// --- tour creation util ---

async function createNewTour(tourName: string): Promise<RespTour> {
  const { data } = await api<ReqNewTour, ApiResp<RespTour>>('/newtour', {
    auth: true,
    body: {
      name: tourName,
      description: '',
    },
  });
  return data;
}

async function addScreenToTour(tourRid: string, screenId: number): Promise<RespScreen> {
  const screenResp = await api<ReqCopyScreen, ApiResp<RespScreen>>('/copyscreen', {
    auth: true,
    body: {
      parentId: screenId,
      tourRid,
    },
  });
  return screenResp.data;
}

function createAnnotationHotspot(screenId: number, annotationRefId: string): ITourEntityHotspot {
  return {
    type: 'an-btn',
    on: 'click',
    target: '$this',
    actionType: 'navigate',
    actionValue: `${screenId}/${annotationRefId}`
  };
}

async function addAnnotationConfigs(
  screenInfo: Array<ScreenInfo>,
  existingTour: P_RespTour | null,
  tourName: string
): Promise<{tourDataFile: TourData, tourRid: string}> {
  let tourDataFile: TourData;
  let tourRid: string;

  if (existingTour) {
    tourRid = existingTour.rid;
    tourDataFile = await api<null, TourData>(existingTour.dataFileUri.href);
  } else {
    const tourData = await createNewTour(tourName);
    tourRid = tourData.rid;
    tourDataFile = createEmptyTourDataFile();
  }

  const annConfigs: Array<IAnnotationConfig> = [];
  const screensInTourPromises: Array<Promise<RespScreen>> = [];

  for (const screen of screenInfo) {
    const newScreen = addScreenToTour(tourRid, screen.id);
    screensInTourPromises.push(newScreen);
    annConfigs.push(getSampleConfig(screen.elPath));
  }

  const screensInTour: Array<RespScreen> = await Promise.all(screensInTourPromises);

  if (tourDataFile.opts.main === '') {
    tourDataFile.opts.main = `${screensInTour[0].id}/${annConfigs[0].refId}`;
  }
  tourDataFile.lastUpdatedAtUtc = getCurrentUtcUnixTime();

  for (let i = 0; i < screenInfo.length; i++) {
    const screen = screenInfo[i];
    const annotationConfig = annConfigs[i];
    if (!(i === 0 && i === screenInfo.length - 1)) {
      // If there is only one annotation in the tour then there is no point in connection, as both next and prev
      // will be empty
      const nextBtn = annotationConfig.buttons.filter(btn => btn.type === 'next')[0];
      const prevBtn = annotationConfig.buttons.filter(btn => btn.type === 'prev')[0];
      switch (i) {
        case 0:
          nextBtn.hotspot = createAnnotationHotspot(screensInTour[i + 1].id, annConfigs[i + 1].refId);
          // first annotation won't have any prev
          break;
        case screenInfo.length - 1:
          prevBtn.hotspot = createAnnotationHotspot(screensInTour[i - 1].id, annConfigs[i - 1].refId);
          // last annotation won't have any next
          break;
        default:
          nextBtn.hotspot = createAnnotationHotspot(screensInTour[i + 1].id, annConfigs[i + 1].refId);
          prevBtn.hotspot = createAnnotationHotspot(screensInTour[i - 1].id, annConfigs[i - 1].refId);
          break;
      }
    }

    const newScreen = screensInTour[i];
    tourDataFile.entities[newScreen.id] = {
      type: 'screen',
      ref: newScreen.id.toString(),
      annotations: {
        [annConfigs[i].id]: annConfigs[i]
      }
    } as TourScreenEntity;
  }

  return { tourDataFile, tourRid };
}

async function saveTour(rid: string, tourDataFile: TourData): Promise<ApiResp<RespTour>> {
  const tourResp = await api<ReqRecordEdit, ApiResp<RespTour>>('/recordtredit', {
    auth: true,
    body: {
      rid,
      editData: JSON.stringify(tourDataFile),
    },
  });
  return tourResp;
}

async function processScreen(
  frames: Array<FrameDataToBeProcessed>,
  cookies: chrome.cookies.Cookie[]
):
    Promise<ScreenInfo> {
  for (const frame of frames) {
    if (frame.type === 'serdom') {
      const serDoc = frame.data as SerDoc;
      serDoc.docTree = JSON.parse(serDoc.docTreeStr);
    }
  }
  const { data, elPath } = await postProcessSerDocs(frames, cookies);
  return {
    id: data.id,
    elPath
  };
}

function resolveElementFromPath(node: SerNode, path: Array<number>): SerNode {
  const idx = path.shift();
  if (idx !== undefined) {
    return resolveElementFromPath(node.chldrn[idx], path);
  }
  return node;
}

interface PostProcessSerDocsReturnType {
    mainFrame: SerDoc;
    data: RespScreen;
    elPath: string;
}

async function postProcessSerDocs(
  results: Array<FrameDataToBeProcessed>,
  cookies: chrome.cookies.Cookie[]
): Promise<PostProcessSerDocsReturnType> {
  let imageData = '';
  let mainFrame;
  let iconPath: string | undefined;
  const lookupWithProp = new CreateLookupWithProp<FrameDataToBeProcessed>();
  for (const r of results) {
    if (r.type === 'thumbnail') {
      imageData = r.data as string;
      continue;
    } else if (r.type !== 'serdom') {
      continue;
    }

    const data = r.data as SerDoc;
    if (r.frameId === 0) {
      mainFrame = r;
    } else {
      lookupWithProp.push('frameId', `${r.frameId}`, r);
      !(data.name === undefined || data.name === null || data.name === '')
          && lookupWithProp.push('name', data.name, r);
      lookupWithProp.push('url', data.frameUrl, r);
      lookupWithProp.push('dim', `${data.rect.width}:${data.rect.height}`, r);
    }
  }

  if (!(mainFrame && mainFrame.data)) {
    throw new Error('Main frame not found, this should never happen');
  }

  const allCookies = cookies;
  let elPath = '';
  async function process(frame: SerDoc, frameId: number, traversePath: string) {
    for (const postProcess of frame.postProcesses) {
      if (postProcess.type === 'elpath') {
        elPath = traversePath ? `${traversePath}${postProcess.path}` : postProcess.path;
        continue;
      }
      const traversalPath = postProcess.path.split('.').map((_) => +_);
      const node = resolveElementFromPath(frame.docTree!, traversalPath);

      if (postProcess.type === 'iframe') {
        let subFrame;
        let subFrames = [];
        if ((subFrames = lookupWithProp.find('name', node.attrs.name)).length === 1) {
          // If we find a unique frame record with name then we take it
          // Sometimes the <iframe name="" /> is blank, in that case we do following lookup
          subFrame = subFrames[0];
        } else if ((subFrames = lookupWithProp.find('url', node.attrs.src)).length === 1) {
          // If we find a unique frame record with url then we take the entry
          // Sometimes the <iframe src="" /> from inside iframe
          subFrame = subFrames[0];
        } else if (
          node.props.rect
            && (subFrames = lookupWithProp.find('dim', `${node.props.rect.width}:${node.props.rect.height}`)).length === 1
        ) {
          // If none of the above condition matches we try to get iframe with same dimension
          subFrame = subFrames[0];
        }

        if (!subFrame) {
          console.warn('Node', node);
          throw new Error('No sub frame present for node ^^^');
        } else {
          const subFrameData = subFrame.data as SerDoc;
          node.chldrn.push(subFrameData.docTree!);
          await process(subFrameData, subFrame.frameId, `${traversePath}1.${postProcess.path}.`);
        }
      } else {
        const url = new URL(frame.frameUrl);
        const cookieStr = getCookieHeaderForUrl(allCookies, url);
        const clientInfo = btoa(
          JSON.stringify({
            kie: cookieStr,
            ua: frame.userAgent,
          })
        );

        const assetUrlStr = getAbsoluteUrl(node.props.proxyUrl || '', frame.baseURI);
        const assetUrl = new URL(assetUrlStr);
        if (assetUrl.protocol === 'http:' || assetUrl.protocol === 'https:') {
          const data = await api<ReqProxyAsset, ApiResp<RespProxyAsset>>('/proxyasset', {
            method: 'POST',
            body: {
              origin: assetUrlStr,
              clientInfo,
            },
          });
          node.props.origHref = node.props.proxyUrl;
          node.attrs[node.props.proxyAttr || ''] = data.data.proxyUri;
        }

        if (frameId === 0 && postProcess.path === frame.icon?.path) {
          // Only save icon for main frame
          iconPath = node.attrs.href || undefined;
        }
      }
    }
  }

  const mainFrameData = mainFrame.data as SerDoc;
  await process(mainFrameData as SerDoc, mainFrame.frameId, '');
  const screenBody: ScreenData = {
    version: '2023-01-10',
    vpd: {
      h: mainFrameData.rect.height,
      w: mainFrameData.rect.width,
    },
    docTree: mainFrameData.docTree!,
  };
  const { data } = await api<ReqNewScreen, ApiResp<RespScreen>>('/newscreen', {
    method: 'POST',
    body: {
      name: mainFrameData.title,
      url: mainFrameData.frameUrl,
      thumbnail: imageData,
      body: JSON.stringify(screenBody),
      favIcon: iconPath,
    },
  });

  // TODO error handling with data

  return { mainFrame: mainFrameData, data, elPath };
}

export function getCookieHeaderForUrl(cookies: chrome.cookies.Cookie[], pageUrl: URL): String {
  const host = pageUrl.host;
  const path = pageUrl.pathname;
  const hostParts = host.split('.');
  const allSubDomains: Record<string, number> = {};

  let cumulativeSubDomain = `.${hostParts[hostParts.length - 1]}`;
  for (let i = hostParts.length - 2; i >= 0; i--) {
    cumulativeSubDomain = `${i > 0 ? '.' : ''}${hostParts[i]}${cumulativeSubDomain}`;
    allSubDomains[cumulativeSubDomain] = 1;
  }

  return cookies
    .filter((cookie) => cookie.domain in allSubDomains && path.startsWith(cookie.path || '/'))
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');
}

export function getAbsoluteUrl(urlStr: string, baseUrl: string) {
  try {
    const url = new URL(urlStr);
    return url.href;
  } catch {
    const first2CharOfUrl = urlStr.substring(0, 2);
    if (first2CharOfUrl === '//') {
      // https://stackoverflow.com/a/9646435/2474269
      return new URL(baseUrl).protocol + urlStr;
    }
    if (first2CharOfUrl.charAt(0) === '/') {
      return new URL(baseUrl).origin + urlStr;
    }
    return baseUrl + urlStr;
  }
}

type LookupWithPropType = 'name' | 'url' | 'dim' | 'frameId';
class CreateLookupWithProp<T> {
  private rec: Record<LookupWithPropType, Record<string, T[]>> = {
    name: {},
    url: {},
    dim: {},
    frameId: {},
  };

  static getNormalizedUrlStr(urlStr: string): string {
    try {
      const url = new URL(urlStr);
      urlStr = `${url.origin}${url.pathname}`;
    } catch (e) {
      /* noop */
    }
    return urlStr;
  }

  push = (prop: LookupWithPropType, key: string, val: T) => {
    if (prop === 'url') {
      key = CreateLookupWithProp.getNormalizedUrlStr(key);
    }
    if (key in this.rec) {
      this.rec[prop][key].push(val);
    } else {
      this.rec[prop][key] = [val];
    }
  };

  find = (prop: LookupWithPropType, key: string | null | undefined): T[] => {
    if (key === null || key === undefined) {
      key = '';
    }
    if (prop === 'url') {
      key = CreateLookupWithProp.getNormalizedUrlStr(key);
    }
    if (!(key in this.rec[prop])) {
      return [];
    }

    return this.rec[prop][key];
  };
}
