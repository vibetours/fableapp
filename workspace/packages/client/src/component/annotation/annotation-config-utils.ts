import {
  AnnotationButtonSize,
  AnnotationButtonStyle,
  AnnotationPositions,
  IAnnotationButton,
  IAnnotationConfig,
  ITourEntityHotspot,
  IChronoUpdatable,
  ITourDataOpts,
  EAnnotationBoxSize,
  VideoAnnotationPositions,
  AnnotationButtonLayoutType
} from '@fable/common/dist/types';
import { deepcopy, getCurrentUtcUnixTime, getRandomId } from '@fable/common/dist/utils';
import { AnnotationMutation, AnnotationPerScreen } from '../../types';

export interface IAnnotationConfigWithScreenId extends IAnnotationConfig {
  screenId: number
}

export function getBigramId(config: IAnnotationConfig): string {
  return config.refId.substring(2);
}

export function updateAnnotationText<T extends IAnnotationConfig>(config: T, txt: string, displayText: string): T {
  const newConfig = newConfigFrom(config);
  newConfig.bodyContent = txt;
  newConfig.displayText = displayText;
  return newConfig;
}

export function updateAnnotationBoxSize<T extends IAnnotationConfig>(config: T, size: EAnnotationBoxSize): T {
  const newConfig = newConfigFrom(config);
  newConfig.size = size;
  return newConfig;
}

export function updateAnnotationPositioning<T extends IAnnotationConfig>(
  config: T,
  positioning: AnnotationPositions | VideoAnnotationPositions
): T {
  const newConfig = newConfigFrom(config);
  newConfig.positioning = positioning;
  return newConfig;
}

export function updateAnnotationVideoURL<T extends IAnnotationConfig>(config: T, videoUrl: string): T {
  const newConfig = newConfigFrom(config);
  newConfig.videoUrl = videoUrl;
  return newConfig;
}

export function updateAnnotationVideoURLMp4<T extends IAnnotationConfig>(config: T, videoUrl: string): T {
  const newConfig = newConfigFrom(config);
  newConfig.videoUrlMp4 = videoUrl;
  return newConfig;
}

export function updateAnnotationVideoURLHLS<T extends IAnnotationConfig>(config: T, videoUrl: string): T {
  const newConfig = newConfigFrom(config);
  newConfig.videoUrlHls = videoUrl;
  return newConfig;
}

export function updateAnnotationVideoURLWebm<T extends IAnnotationConfig>(config: T, videoUrl: string): T {
  const newConfig = newConfigFrom(config);
  newConfig.videoUrlWebm = videoUrl;
  return newConfig;
}

export function updateAnnotationTypeToCover(config: IAnnotationConfig) : IAnnotationConfig {
  const newConfig = newConfigFrom(config);
  newConfig.type = 'cover';
  newConfig.id = `$#${newConfig.refId}`;
  newConfig.size = 'medium';

  return newConfig;
}

export function updateAnnotationTypeToDefault(
  config: IAnnotationConfig,
  elPath: string
) : IAnnotationConfig {
  const newConfig = newConfigFrom(config);
  newConfig.type = 'default';
  newConfig.id = elPath;
  newConfig.size = 'small';
  newConfig.hideAnnotation = false;
  return newConfig;
}

export function updateAnnotationIsHotspot(config: IAnnotationConfig, isHotspot: boolean): IAnnotationConfig {
  const newConfig = newConfigFrom(config);
  newConfig.isHotspot = isHotspot;
  return newConfig;
}

export function clearAnnotationAllVideoURL(config: IAnnotationConfig): IAnnotationConfig {
  const newConfig = newConfigFrom(config);
  newConfig.videoUrl = '';
  newConfig.videoUrlMp4 = '';
  newConfig.videoUrlWebm = '';
  newConfig.videoUrlHls = '';
  return newConfig;
}

export function updateAnnotationHotspotElPath<T extends IAnnotationConfig>(
  config: T,
  hotspotElPath: string | null
): T {
  const newConfig = newConfigFrom(config);
  newConfig.hotspotElPath = hotspotElPath;
  return newConfig;
}

export function updateAnnotationHideAnnotation<T extends IAnnotationConfig>(config: T, hideAnnotation: boolean): T {
  const newConfig = newConfigFrom(config);
  newConfig.hideAnnotation = hideAnnotation;
  return newConfig;
}

export function updateAnnotationButtonLayout<T extends IAnnotationConfig>(
  config: T,
  buttonLayout: AnnotationButtonLayoutType
): T {
  const newConfig = newConfigFrom(config);
  newConfig.buttonLayout = buttonLayout;
  return newConfig;
}

export function updateOverlay<T extends IAnnotationConfig>(config: T, showOverlay: boolean): T {
  const newConfig = newConfigFrom(config);
  newConfig.showOverlay = showOverlay;
  return newConfig;
}

export function updateTourDataOpts(
  opts: ITourDataOpts,
  key: keyof ITourDataOpts,
  value: ITourDataOpts[keyof ITourDataOpts]
): ITourDataOpts {
  const newOpts = newConfigFrom(opts);
  (newOpts as any)[key] = value;
  return newOpts;
}

function newConfigFrom<T extends IChronoUpdatable>(c: T): T {
  const newConfig = { ...c };
  newConfig.monoIncKey++;
  newConfig.updatedAt = getCurrentUtcUnixTime();
  return newConfig;
}

export function removeButtonWithId<T extends IAnnotationConfig>(config: T, id: string): T {
  const newConf = newConfigFrom(config);
  const buttons = newConf.buttons.slice(0).filter(b => b.id !== id);
  newConf.buttons = buttons;
  return newConf;
}

function findBtnById(config: IAnnotationConfig, id: string): [IAnnotationButton, number][] {
  const thisButton = config.buttons.map((b, i) => ([b, i] as [IAnnotationButton, number]))
    .filter(([b]) => b.id === id);
  return thisButton;
}

export function updateButtonProp<T extends IAnnotationConfig>(
  config: T,
  id: string,
  prop: keyof IAnnotationButton,
  value: IAnnotationButton[keyof IAnnotationButton]
): T {
  const newConfig = newConfigFrom(config);
  const buttons = newConfig.buttons.slice(0);
  const thisButton = findBtnById(newConfig, id);
  buttons[thisButton[0][1]] = {
    ...thisButton[0][0],
    [prop]: value
  };
  newConfig.buttons = buttons;
  return newConfig;
}

export function toggleBooleanButtonProp<T extends IAnnotationConfig>(
  config: T,
  id: string,
  prop: keyof IAnnotationButton
): T {
  const newConfig = newConfigFrom(config);
  const buttons = newConfig.buttons.slice(0);
  const thisButton = findBtnById(config, id);
  buttons[thisButton[0][1]] = {
    ...thisButton[0][0],
    [prop]: !thisButton[0][0][prop]
  };
  newConfig.buttons = buttons;
  return newConfig;
}

function getCustomBtnTemplate(order: number, size: AnnotationButtonSize): IAnnotationButton {
  return {
    id: getRandomId(),
    type: 'custom',
    style: AnnotationButtonStyle.Outline,
    size,
    text: 'Your custom button',
    order,
    hotspot: null
  };
}

export function getLatestBtnOrder(config: IAnnotationConfig): number {
  let order = 1;
  for (const btn of config.buttons) {
    if (btn.type !== 'custom') {
      continue;
    }

    order = Math.max(order, btn.order);
  }
  return order;
}

export function addCustomBtn<T extends IAnnotationConfig>(config: T): T {
  const order = getLatestBtnOrder(config);
  const nextBtn = config.buttons.filter(btn => btn.type === 'next')[0];
  const size = nextBtn.size;
  const btn = getCustomBtnTemplate(order, size);

  const newConfig = newConfigFrom(config);
  newConfig.buttons = newConfig.buttons.slice(0);
  newConfig.buttons.push(btn);
  return newConfig;
}

export function shallowCloneAnnotation(elPath: string, from: IAnnotationConfig): IAnnotationConfig {
  const newConf: IAnnotationConfig = {
    ...from,
    id: elPath,
    updatedAt: getCurrentUtcUnixTime(),
    monoIncKey: from.monoIncKey + 1,
  };
  return newConf;
}

export function replaceAnnotation(
  allAnnotationsForTour: AnnotationPerScreen[],
  replaceThisAnn: IAnnotationConfig,
  replaceWithAnn: IAnnotationConfig,
  currentScreenId: number
): AnnotationMutation[] {
  const flatAnnotationMap: Record<string, IAnnotationConfig> = {};
  for (const entry of allAnnotationsForTour) {
    for (const an of entry.annotations) {
      flatAnnotationMap[`${entry.screen.id}/${an.refId}`] = an;
    }
  }
  const updates: AnnotationMutation[] = [];

  updates.push([+currentScreenId, replaceThisAnn, 'delete']);
  updates.push([+currentScreenId, replaceWithAnn, 'upsert']);

  return updates;
}

export function isCoverAnnotation(annId: string): boolean {
  return annId.split('#')[0] === '$';
}
