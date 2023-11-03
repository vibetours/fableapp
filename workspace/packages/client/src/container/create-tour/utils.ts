import {
  DEFAULT_BORDER_RADIUS,
  IAnnotationConfig,
  ITourDataOpts,
  ITourEntityHotspot,
  ScreenData,
  SerDoc,
  SerNode,
  TourData,
  TourScreenEntity,
  NODE_NAME,
  ThemeBorderRadiusCandidatePerNode,
  ThemeColorCandidatPerNode,
  ProxyAttrs
} from '@fable/common/dist/types';
import api from '@fable/common/dist/api';
import {
  ApiResp,
  ReqCopyScreen,
  ReqNewScreen,
  ReqNewTour,
  ReqProxyAsset,
  ReqRecordEdit,
  ReqScreenTour,
  ReqThumbnailCreation,
  RespProxyAsset,
  RespScreen,
  RespTour,
  ScreenType
} from '@fable/common/dist/api-contract';
import {
  createEmptyTourDataFile,
  getSampleConfig,
  getCurrentUtcUnixTime,
  getDefaultTourOpts,
  hexToRGB,
  rgbToHex,
  getImgScreenData
} from '@fable/common/dist/utils';
import { nanoid } from 'nanoid';
import { sentryCaptureException } from '@fable/common/dist/sentry';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { FrameDataToBeProcessed, ScreenInfo } from './types';
import { P_RespTour } from '../../entity-processor';
import { getColorContrast } from '../../utils';
import { uploadFileToAws, uploadImageAsBinary } from '../../component/screen-editor/utils/upload-img-to-aws';

export function getNodeFromDocTree(docTree: SerNode, nodeName: string): SerNode | null {
  const queue: SerNode[] = [docTree];

  while (queue.length > 0) {
    const currNode = queue.shift()!;

    if (currNode.name.toLowerCase() === nodeName.toLowerCase()) {
      return currNode;
    }

    for (let i = 0; i < currNode.chldrn.length; i++) {
      queue.push(currNode.chldrn[i]);
    }
  }

  return null;
}

export async function saveScreen(
  frames: FrameDataToBeProcessed[],
  cookies: chrome.cookies.Cookie[],
  onProgress: (doneProcessing: number, totalProcessing: number) => void,
): Promise<ScreenInfo> {
  const screenInfo = await processScreen(frames, cookies, onProgress);
  return screenInfo;
}

export async function saveAsTour(
  screens: ScreenInfo[],
  existingTour: P_RespTour | null,
  tourName: string = 'Untitled',
  // TODO[now] change this
  annotationBodyBackgroundColor: string = '#ffffff',
  annotationBorderRadius: number = DEFAULT_BORDER_RADIUS
): Promise<ApiResp<RespTour>> {
  if (annotationBodyBackgroundColor.length === 0) {
    annotationBodyBackgroundColor = '#ffffff';
  }
  const { tourDataFile, tourRid } = await addAnnotationConfigs(
    screens,
    existingTour,
    tourName,
    annotationBodyBackgroundColor,
    annotationBorderRadius
  );
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

async function addScreenToTour(
  tourRid: string,
  screenId: number,
  screenType: ScreenType,
  screenRid: string
): Promise<RespScreen> {
  let screenResp: ApiResp<RespScreen>;
  if (screenType === ScreenType.Img) {
    screenResp = await api<ReqScreenTour, ApiResp<RespScreen>>('/astsrntotour', {
      method: 'POST',
      body: {
        screenRid,
        tourRid,
      },
    });
  } else {
    screenResp = await api<ReqCopyScreen, ApiResp<RespScreen>>('/copyscreen', {
      auth: true,
      body: {
        parentId: screenId,
        tourRid,
      },
    });
  }

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
  tourName: string,
  annotationBodyBackgroundColor: string,
  annotationBorderRadius: number
): Promise<{ tourDataFile: TourData, tourRid: string }> {
  let tourDataFile: TourData;
  let tourRid: string;

  if (existingTour) {
    tourRid = existingTour.rid;
    tourDataFile = await api<null, TourData>(existingTour.dataFileUri.href);
    if (!tourDataFile.opts) tourDataFile.opts = getDefaultTourOpts();
    if (!tourDataFile.diagnostics) tourDataFile.diagnostics = {};
  } else {
    const tourData = await createNewTour(tourName);
    tourRid = tourData.rid;
    tourDataFile = createEmptyTourDataFile();
  }

  const annConfigs: Array<IAnnotationConfig> = [];
  const screensInTourPromises: Array<Promise<RespScreen>> = [];

  const grpId = nanoid();

  screenInfo = screenInfo.filter(screen => !screen.skipped);

  for (let i = 0; i < screenInfo.length; i++) {
    const screen = screenInfo[i].info!;
    const newScreen = addScreenToTour(tourRid, screen.id, screen.type, screen.rid);
    screensInTourPromises.push(newScreen);
    const screenConfig = getSampleConfig(screen.elPath, grpId);
    screenConfig.showOverlay = false;
    screenConfig.isHotspot = true;

    if (screen.replacedWithImgScreen) {
      const error = {
        code: 100,
        reason: 'Interactive recording failed as main frame not found. Replaced it with image screen',
        type: 'interactive_recording_failed'
      };
      const tourDiag = tourDataFile.diagnostics;
      if (!tourDiag[screen.id]) tourDiag[screen.id] = [];
      tourDiag[screen.id].push(error);
    }

    if (!existingTour) {
      // If we are adding the annotations in existing tour then don' change any of this.
      if (i === 0) {
        screenConfig.buttons.forEach((button) => {
          if (button.type === 'prev') {
            button.exclude = true;
          }
        });

        screenConfig.buttonLayout = 'full-width';
      }

      if (i === screenInfo.length - 1) {
        screenConfig.buttons.forEach((button) => {
          if (button.type === 'next') {
            button.text = 'Book a demo';
          }
        });
      }
    }
    annConfigs.push(screenConfig);
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

  // If we are adding annotations to existing tour then don't change anything from the theme
  if (!existingTour) {
    tourDataFile.opts.annotationBodyBackgroundColor = annotationBodyBackgroundColor;
    const relevantColors = getRelevantColors(annotationBodyBackgroundColor);
    tourDataFile.opts.primaryColor = relevantColors.primary;
    tourDataFile.opts.borderRadius = annotationBorderRadius;
    tourDataFile.opts.annotationSelectionColor = relevantColors.selection;
    tourDataFile.opts.annotationFontColor = relevantColors.font;
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
  cookies: chrome.cookies.Cookie[],
  onProgress: (doneProcessing: number, totalProcessing: number) => void,
): Promise<ScreenInfo> {
  for (const frame of frames) {
    if (frame.type === 'serdom') {
      const serDoc = frame.data as SerDoc;
      serDoc.docTree = JSON.parse(serDoc.docTreeStr);
    }
  }
  const res = await postProcessSerDocs(frames, cookies, onProgress);
  if (res.skipped) {
    return { info: null, skipped: true };
  }

  const data = res.data!;
  return {
    info: {
      id: data.id,
      elPath: res.elPath,
      icon: data.icon,
      type: data.type,
      rid: data.rid,
      replacedWithImgScreen: res.replacedWithImgScreen,
    },
    skipped: res.skipped
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
  data: RespScreen | null;
  elPath: string;
  replacedWithImgScreen: boolean;
  skipped: boolean;
}

async function postProcessSerDocs(
  results: Array<FrameDataToBeProcessed>,
  cookies: chrome.cookies.Cookie[],
  onProgress: (doneProcessing: number, totalProcessing: number) => void,
): Promise<PostProcessSerDocsReturnType> {
  let imageData = '';
  let mainFrame: FrameDataToBeProcessed | undefined;
  let iconPath: string | undefined;
  let totalItemsToPostProcess = 0;
  const lookupWithProp = new CreateLookupWithProp<FrameDataToBeProcessed>();

  let isMainFrameFound = true;
  let replacedWithImgScreen = false;

  for (const r of results) {
    if (r.type === 'thumbnail') {
      imageData = r.data as string;
      continue;
    } else if (r.type !== 'serdom') {
      continue;
    }

    const data = r.data as SerDoc;
    totalItemsToPostProcess += data.postProcesses.length;
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
    isMainFrameFound = false;
    sentryCaptureException(
      new Error('Main frame not found, this should never happen'),
      JSON.stringify(results),
      'screendata.txt'
    );
  }

  let elPath = '';
  const allCookies = cookies;
  async function process(
    frame: SerDoc,
    frameId: number,
    traversePath: string,
    numberOfProcessingDone: number
  ): Promise<void> {
    const svgSpriteUrls: Record<string, number> = {};
    for (const postProcess of frame.postProcesses) {
      numberOfProcessingDone++;
      if (postProcess.type === 'elpath') {
        elPath = traversePath ? `${traversePath}${postProcess.path}` : postProcess.path;
        continue;
      }
      const traversalPath = postProcess.path.split('.').map((_) => +_);
      const node = resolveElementFromPath(frame.docTree!, traversalPath);
      if (postProcess.type === 'iframe' || postProcess.type === 'object') {
        const urlLookupProp = postProcess.type === 'object' ? 'data' : 'src';
        let subFrame;
        let subFrames = [];
        if ((subFrames = lookupWithProp.find('name', node.attrs.name)).length === 1) {
          // If we find a unique frame record with name then we take it
          // Sometimes the <iframe name="" /> is blank, in that case we do following lookup
          subFrame = subFrames[0];
        } else if ((subFrames = lookupWithProp.find('url', node.attrs[urlLookupProp])).length === 1) {
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
          raiseDeferredError(new Error(`No sub frame present for node ^^^. src=${node.attrs.src}`));
        } else {
          const subFrameData = subFrame.data as SerDoc;
          node.chldrn.push({
            type: 10,
            name: 'html',
            attrs: {},
            props: { proxyUrlMap: {} },
            chldrn: [],
            sv: node.sv,
          });
          node.chldrn.push(subFrameData.docTree!);
          await process(
            subFrameData,
            subFrame.frameId,
            `${traversePath}1.${postProcess.path}.`,
            numberOfProcessingDone
          );
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

        // COMPATIBILITY this is to support the type change proxyUrl (string -> string[]).
        // While the old extension is not released by chromestore we have to support proxyUrl
        // being both string & string[]
        // FIXME Delete this once extension is released
        if (!node.sv) node.sv = 0;
        if (node.sv < 2) {
          const props = node.props as any;
          const proxyUrl = props.proxyUrl as string[];
          const attr = props.proxyAttr as keyof typeof ProxyAttrs;
          node.props.proxyUrlMap = {};
          if (proxyUrl && proxyUrl.length) {
            node.props.proxyUrlMap[attr] = proxyUrl;
          }
        }

        if (node.props.base64Img) {
          const originalBlobUrl = node.props.proxyUrlMap.src![0];

          try {
            const binaryData = atob(node.props.base64Img);
            const arrayBuffer = new ArrayBuffer(binaryData.length);
            const uint8Array = new Uint8Array(arrayBuffer);

            for (let i = 0; i < binaryData.length; i++) {
              uint8Array[i] = binaryData.charCodeAt(i);
            }

            const blob = new Blob([uint8Array]);
            const file = new File([blob], 'image.png', { type: 'image/png' });
            const urlString = await uploadFileToAws(file);

            node.attrs.src = urlString;
            node.props.base64Img = '';
          } catch (e) {
            raiseDeferredError(e as Error);
            node.attrs.src = getAbsoluteUrl(
              originalBlobUrl,
              frame.baseURI,
              frame.frameUrl
            );
          } finally {
            node.props.origHref = originalBlobUrl;
          }
        } else {
          const headNode = getNodeFromDocTree(frame.docTree!, 'head');
          for (const [proxyAttr, proxyUrls] of Object.entries(node.props.proxyUrlMap)) {
            for (const pUrl of proxyUrls) {
              const assetUrlStr = node.props.absoluteUrl ?? getAbsoluteUrl(pUrl, frame.baseURI, frame.frameUrl);
              let assetUrl;
              try {
                assetUrl = new URL(assetUrlStr);
              } catch (e) {
                raiseDeferredError(e as Error);
                assetUrl = new URL(getAbsoluteUrl(pUrl, frame.baseURI, frame.frameUrl));
              }

              if (!(assetUrl.protocol === 'http:' || assetUrl.protocol === 'https:')) continue;

              let proxyiedUrl = assetUrlStr;
              let proxyiedContent: string = '';
              if (!(`${assetUrl.origin}${assetUrl.pathname}${assetUrl.search}` in svgSpriteUrls)) {
                try {
                  const data = await api<ReqProxyAsset, ApiResp<RespProxyAsset>>('/proxyasset', {
                    method: 'POST',
                    body: {
                      origin: assetUrlStr,
                      clientInfo,
                      body: node.props.isInlineSprite || false
                    },
                  });
                  if (data && data.data && data.data.proxyUri) proxyiedUrl = data.data.proxyUri;
                  proxyiedContent = data.data.content ?? '';
                } catch (e) {
                  raiseDeferredError(e as Error);
                }
              }

              try {
                if (proxyAttr === 'style' || proxyAttr === 'cssRules') {
                  const attrVal = node.attrs[proxyAttr];
                  if (attrVal) node.attrs[proxyAttr] = getAllPossibleCssUrlReplace(attrVal, pUrl, proxyiedUrl);
                } else if (proxyAttr === 'xlink:href' || proxyAttr === 'href' || proxyAttr === 'src') {
                  node.props.origHref = pUrl;
                  if (node.props.isInlineSprite) {
                    svgSpriteUrls[`${assetUrl.origin}${assetUrl.pathname}${assetUrl.search}`] = 1;
                    node.attrs.href = node.props.spriteId ?? assetUrl.hash;
                    headNode?.chldrn.push({
                      type: -1,
                      name: '-data-f-sprite',
                      attrs: {},
                      props: {
                        proxyUrlMap: {},
                        content: proxyiedContent,
                      },
                      chldrn: [],
                      sv: 2
                    });
                  } else {
                    node.attrs[proxyAttr] = proxyiedUrl;
                  }
                } else if (proxyAttr === 'srcset') {
                  node.attrs.srcset = replaceSrcsetUrl(node.attrs.srcset!, pUrl, proxyiedUrl);
                }
              } catch (e) {
                raiseDeferredError(e as Error);
              }
            }
          }
        }

        if (frameId === 0 && postProcess.path === frame.icon?.path) {
          // Only save icon for main frame
          iconPath = node.attrs.href || undefined;
        }
      }
      onProgress(numberOfProcessingDone, totalItemsToPostProcess);
    }
  }

  let data: RespScreen;
  if (isMainFrameFound) {
    const mainFrameData = mainFrame!.data as SerDoc;
    await process(mainFrameData as SerDoc, mainFrame!.frameId, '', 1);
    const screenBody: ScreenData = {
      version: '2023-07-27',
      vpd: {
        h: mainFrameData.rect.height,
        w: mainFrameData.rect.width,
      },
      docTree: mainFrameData.docTree!,
    };

    const resp = await api<ReqNewScreen, ApiResp<RespScreen>>('/newscreen', {
      method: 'POST',
      body: {
        name: mainFrameData.title,
        url: mainFrameData.frameUrl,
        thumbnail: imageData,
        body: JSON.stringify(screenBody),
        favIcon: iconPath,
        type: ScreenType.SerDom,
      },
    });

    data = resp.data;
  } else if (!imageData) {
    return { data: null, elPath: '', replacedWithImgScreen: false, skipped: true };
  } else {
    const screenImgFile = dataURLtoFile(imageData, 'img.png');
    const resp = await api<ReqNewScreen, ApiResp<RespScreen>>('/newscreen', {
      method: 'POST',
      body: {
        name: 'Untitled',
        type: ScreenType.Img,
        body: JSON.stringify(getImgScreenData()),
        contentType: screenImgFile.type
      },
    });

    data = resp.data;
    await uploadImageAsBinary(screenImgFile, data.uploadUrl!);
    await api<ReqThumbnailCreation, ApiResp<RespScreen>>('/genthumb', {
      method: 'POST',
      body: {
        screenRid: data.rid
      },
    });
    elPath = '$';
    replacedWithImgScreen = true;
  }

  // TODO error handling with data

  return { data, elPath, replacedWithImgScreen, skipped: false };
}

function getAllPossibleCssUrlReplace(str: string, replaceThisUrl: string, replaceWithUrl: string): string {
  return str
    .replaceAll(`url('${replaceThisUrl}')`, `url('${replaceWithUrl}')`)
    .replaceAll(`url("${replaceThisUrl}")`, `url("${replaceWithUrl}")`)
    .replaceAll(`url(${replaceThisUrl})`, `url(${replaceWithUrl})`);
}

function replaceSrcsetUrl(origSrcset: string, origUrl: string, proxyUri: string): string {
  return origSrcset.replace(origUrl, proxyUri);
}

function dataURLtoFile(dataurl: string, filename: string): File {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]); let n = bstr.length; const
    u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
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

export function getAbsoluteUrl(urlStr: string, baseUrl: string, frameUrl: string): string {
  try {
    const url = new URL(urlStr, frameUrl);
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

export function getThemeAnnotationOpts(color: string, radius: number = DEFAULT_BORDER_RADIUS): ITourDataOpts {
  const opts = getDefaultTourOpts();
  if (color) {
    opts.annotationBodyBackgroundColor = color;
    const relevantColors = getRelevantColors(opts.annotationBodyBackgroundColor);
    opts.primaryColor = relevantColors.primary;
    opts.annotationFontColor = relevantColors.font;
  }
  opts.borderRadius = radius;
  opts.annotationPadding = '18';
  return opts;
}

export const getRelevantColors = (annotationBodyBackgroundColor: string): {
  primary: string,
  selection: string,
  font: string
} => {
  const font = getColorContrast(annotationBodyBackgroundColor) === 'dark' ? '#ffffff' : '#424242';
  if (annotationBodyBackgroundColor.toLowerCase() === '#ffffff') {
    return {
      primary: '#7567FF',
      selection: '#7567FF',
      font,
    };
  }

  if (getColorContrast(annotationBodyBackgroundColor) === 'dark') {
    return {
      primary: '#ffffff',
      selection: annotationBodyBackgroundColor,
      font
    };
  }

  const darkerShade = generateShadeColor(annotationBodyBackgroundColor, 25);
  return {
    primary: darkerShade,
    selection: darkerShade,
    font
  };
};

function generateShadeColor(color: string, percentage: number): string {
  const { red, green, blue } = hexToRGB(color);
  const darkerR = Math.max(0, Math.round(red * (1 - percentage / 100)));
  const darkerG = Math.max(0, Math.round(green * (1 - percentage / 100)));
  const darkerB = Math.max(0, Math.round(blue * (1 - percentage / 100)));

  const darkenRGB = `rgb(${darkerR}, ${darkerG}, ${darkerB})`;
  const darkerHexColor = rgbToHex(darkenRGB);

  return darkerHexColor;
}

function areColorsDistant(color1: string, color2: string): boolean {
  const color1Rgb = hexToRGB(color1);
  const color2Rgb = hexToRGB(color2);

  const d = deltaE([color1Rgb.red, color1Rgb.green, color1Rgb.blue], [color2Rgb.red, color2Rgb.green, color2Rgb.blue]);
  // d <= 1.0 not visible by human eyes
  // d (1, 2] perceptible through close observation
  // d (2, 10] perceptible at a glance
  // d (10, 49] more similar to opposite color
  // d == 100 opposite
  return d > 20;
}

(window as any).ffn = areColorsDistant;

function deltaE(rgbA: [number, number, number], rgbB: [number, number, number]): number {
  const labA = rgb2lab(rgbA);
  const labB = rgb2lab(rgbB);
  const deltaL = labA[0] - labB[0];
  const deltaA = labA[1] - labB[1];
  const deltaB = labA[2] - labB[2];
  const c1 = Math.sqrt(labA[1] * labA[1] + labA[2] * labA[2]);
  const c2 = Math.sqrt(labB[1] * labB[1] + labB[2] * labB[2]);
  const deltaC = c1 - c2;
  let deltaH = deltaA * deltaA + deltaB * deltaB - deltaC * deltaC;
  deltaH = deltaH < 0 ? 0 : Math.sqrt(deltaH);
  const sc = 1.0 + 0.045 * c1;
  const sh = 1.0 + 0.015 * c1;
  const deltaLKlsl = deltaL / (1.0);
  const deltaCkcsc = deltaC / (sc);
  const deltaHkhsh = deltaH / (sh);
  const i = deltaLKlsl * deltaLKlsl + deltaCkcsc * deltaCkcsc + deltaHkhsh * deltaHkhsh;
  return i < 0 ? 0 : Math.sqrt(i);
}

function rgb2lab(rgb: [number, number, number]): [number, number, number] {
  let r = rgb[0] / 255;
  let g = rgb[1] / 255;
  let b = rgb[2] / 255;
  let x;
  let y;
  let z;
  r = (r > 0.04045) ? ((r + 0.055) / 1.055) ** 2.4 : r / 12.92;
  g = (g > 0.04045) ? ((g + 0.055) / 1.055) ** 2.4 : g / 12.92;
  b = (b > 0.04045) ? ((b + 0.055) / 1.055) ** 2.4 : b / 12.92;
  x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
  z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  x = (x > 0.008856) ? x ** (1 / 3) : (7.787 * x) + 16 / 116;
  y = (y > 0.008856) ? y ** (1 / 3) : (7.787 * y) + 16 / 116;
  z = (z > 0.008856) ? z ** (1 / 3) : (7.787 * z) + 16 / 116;
  return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)];
}

export const getOrderedColorsWithScore = (colorsPerNode: ThemeColorCandidatPerNode): Array<{
  hex: string,
  occurrence: number,
  default?: boolean
}> => {
  const newColors: Record<string, number> = {};

  for (const [tag, colorMap] of Object.entries(colorsPerNode)) {
    let factor = 1;
    if (tag === NODE_NAME.a) {
      factor = 8;
    } else if (tag === NODE_NAME.button) {
      factor = 3;
    }

    for (const [hex, occurrence] of Object.entries(colorMap)) {
      if (hex in newColors) newColors[hex] += occurrence * factor;
      else newColors[hex] = occurrence * factor;
    }
  }

  let orderedCandidates = Object.entries(newColors).map(kv => ({
    hex: kv[0],
    occurrence: kv[1]
  })).sort((m, n) => n.occurrence - m.occurrence);

  // remove color with similar shade
  if (orderedCandidates.length === 1) {
    return orderedCandidates;
  }

  const candidateColorMap = orderedCandidates.slice(0, 30).reduce((ob, c) => {
    ob[c.hex] = c.occurrence;
    return ob;
  }, {} as Record<string, number>);

  const candidateColors = Object.keys(candidateColorMap);

  for (let i = 0; i < candidateColors.length - 1; i++) {
    for (let k = i + 1; k < candidateColors.length; k++) {
      if (!areColorsDistant(candidateColors[i], candidateColors[k])) {
        const scoreI = candidateColorMap[candidateColors[i]];
        const scoreK = candidateColorMap[candidateColors[k]];
        if (scoreK > scoreI) delete candidateColorMap[candidateColors[i]];
        else delete candidateColorMap[candidateColors[k]];
      }
    }
  }

  orderedCandidates = Object.entries(candidateColorMap).map(kv => ({
    hex: kv[0],
    occurrence: kv[1]
  })).sort((m, n) => n.occurrence - m.occurrence);

  return orderedCandidates;
};

const median = (arr: number[]): number => {
  const mid = Math.floor(arr.length / 2);
  const nums = [...arr].sort((a, b) => a - b);
  return arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
};

export const getBorderRadius = (nodeBorderRadius: ThemeBorderRadiusCandidatePerNode): [number, number] => {
  const divBr = nodeBorderRadius[NODE_NAME.div];
  const orderedBorderRadius = Object.entries(divBr).sort((m, n) => n[1] - m[1]);
  const mostUsedBorderRadius = orderedBorderRadius[0];

  let option1;
  let option2;
  // check if the most frequently used border radius is in perceptible range from DEFAULT_BORDER_RADIUS
  if (+mostUsedBorderRadius[0] - DEFAULT_BORDER_RADIUS <= 4) {
    option1 = +mostUsedBorderRadius[0];
    option2 = (2.5 * option1) | 0;
  } else {
    option1 = DEFAULT_BORDER_RADIUS;
    option2 = +mostUsedBorderRadius[0];
  }

  return [option1, option2];
};
