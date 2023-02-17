import {
  AnnotationButtonSize,
  AnnotationButtonStyle,
  AnnotationPositions,
  IAnnotationButton,
  IAnnotationConfig,
  ITourEntityHotspot,
  IChronoUpdatable,
  ITourDataOpts
} from '@fable/common/dist/types';
import { deepcopy, getCurrentUtcUnixTime, getRandomId } from '@fable/common/dist/utils';
import { AnnotationMutation, AnnotationPerScreen } from '../../types';

export function getBigramId(config: IAnnotationConfig): string {
  return config.refId.substring(2);
}

export function updateAnnotationText(config: IAnnotationConfig, txt: string): IAnnotationConfig {
  const newConfig = newConfigFrom(config);
  newConfig.bodyContent = txt;
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

export function removeButtonWithId(config: IAnnotationConfig, id: string) {
  const newConf = newConfigFrom(config);
  const buttons = newConf.buttons.slice(0).filter(b => b.id !== id);
  newConf.buttons = buttons;
  return newConf;
}

function findBtnById(config: IAnnotationConfig, id: string) {
  const thisButton = config.buttons.map((b, i) => ([b, i] as [IAnnotationButton, number]))
    .filter(([b]) => b.id === id);
  return thisButton;
}

export function updateButtonProp(
  config: IAnnotationConfig,
  id: string,
  prop: keyof IAnnotationButton,
  value: IAnnotationButton[keyof IAnnotationButton]
) {
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

export function toggleBooleanButtonProp(
  config: IAnnotationConfig,
  id: string,
  prop: keyof IAnnotationButton
): IAnnotationConfig {
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

export function addCustomBtn(config: IAnnotationConfig): IAnnotationConfig {
  const order = getLatestBtnOrder(config);
  const nextBtn = config.buttons.filter(btn => btn.type === 'next')[0];
  const size = nextBtn.size;
  const btn = getCustomBtnTemplate(order, size);

  const newConfig = newConfigFrom(config);
  newConfig.buttons = newConfig.buttons.slice(0);
  newConfig.buttons.push(btn);
  return newConfig;
}

export function getDefaultTourOpts(): ITourDataOpts {
  return {
    main: '',
    primaryColor: '#7567FF',
    monoIncKey: 0,
    createdAt: getCurrentUtcUnixTime(),
    updatedAt: getCurrentUtcUnixTime(),
  };
}

export function getSampleConfig(elPath: string): IAnnotationConfig {
  const isCoverAnn = elPath === '$';
  const id = getRandomId();

  return {
    id: isCoverAnn ? `$#${id}` : elPath,
    refId: id,
    createdAt: getCurrentUtcUnixTime(),
    updatedAt: getCurrentUtcUnixTime(),
    bodyContent: 'Write a description about what this feature of your product does to your user.',
    positioning: AnnotationPositions.Auto,
    monoIncKey: 0,
    syncPending: true,
    type: isCoverAnn ? 'cover' : 'default',
    buttons: [{
      id: getRandomId(),
      type: 'next',
      style: AnnotationButtonStyle.Primary,
      size: AnnotationButtonSize.Large,
      text: 'Next',
      order: 9999,
      hotspot: null,
    }, {
      id: getRandomId(),
      type: 'prev',
      style: AnnotationButtonStyle.Outline,
      size: AnnotationButtonSize.Large,
      text: 'Back',
      order: 0,
      hotspot: null
    }],
  };
}

export function cloneAnnotation(elPath: string, from: IAnnotationConfig): IAnnotationConfig {
  const newConf: IAnnotationConfig = {
    ...from,

    id: elPath,
    refId: getRandomId(),
    updatedAt: getCurrentUtcUnixTime(),
    monoIncKey: 0,
    buttons: from.buttons.map(btn => ({
      ...btn,
      id: getRandomId(),
    }))
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
  const btns = replaceThisAnn.buttons;
  const nextBtn = btns.find(btn => btn.type === 'next')!;
  const prevBtn = btns.find(btn => btn.type === 'prev')!;

  if (nextBtn.hotspot) {
    const nextAnnId = nextBtn.hotspot.actionValue;
    const [screenId] = nextAnnId.split('/');
    const nextAnn = flatAnnotationMap[nextAnnId];
    const prevBtnOfNextAnn = nextAnn.buttons.find(btn => btn.type === 'prev')!;
    const hotspot = prevBtnOfNextAnn.hotspot;
    let newHostspotVal: ITourEntityHotspot | null = null;
    if (!prevBtnOfNextAnn.exclude && hotspot && hotspot.actionType === 'navigate') {
      newHostspotVal = {
        ...hotspot,
        actionValue: `${currentScreenId}/${replaceWithAnn.refId}`,
      };
    }
    const update = updateButtonProp(nextAnn, prevBtnOfNextAnn.id, 'hotspot', newHostspotVal);
    updates.push([+screenId, update, 'upsert']);
  }
  if (prevBtn.hotspot) {
    const prevAnnId = prevBtn.hotspot.actionValue;
    const [screenId] = prevAnnId.split('/');
    const prevAnn = flatAnnotationMap[prevAnnId];
    const nextBtnOfPrevAnn = prevAnn.buttons.find(btn => btn.type === 'next')!;
    const hotspot = nextBtnOfPrevAnn.hotspot;
    let newHostspotVal: ITourEntityHotspot | null = null;
    if (!nextBtnOfPrevAnn.exclude && hotspot && hotspot.actionType === 'navigate') {
      newHostspotVal = {
        ...hotspot,
        actionValue: `${currentScreenId}/${replaceWithAnn.refId}`,
      };
    }
    const update = updateButtonProp(prevAnn, nextBtnOfPrevAnn.id, 'hotspot', newHostspotVal);
    updates.push([+screenId, update, 'upsert']);
  }

  updates.push([+currentScreenId, replaceThisAnn, 'delete']);
  updates.push([+currentScreenId, replaceWithAnn, 'upsert']);

  return updates;
}

export function deleteAnnotation(
  allAnnotationsForTour: AnnotationPerScreen[],
  ann: IAnnotationConfig,
  currentScreenId: number | null,
): AnnotationMutation[] {
  const flatAnnotationMap: Record<string, IAnnotationConfig> = {};
  for (const entry of allAnnotationsForTour) {
    for (const an of entry.annotations) {
      flatAnnotationMap[`${entry.screen.id}/${an.refId}`] = an;
    }
  }
  const btns = ann.buttons;
  const nextBtn = btns.find(btn => btn.type === 'next')!;
  const prevBtn = btns.find(btn => btn.type === 'prev')!;
  const updates: AnnotationMutation[] = [];
  if (nextBtn.hotspot) {
    const nextAnnId = nextBtn.hotspot.actionValue;
    const [screenId] = nextAnnId.split('/');
    const nextAnn = flatAnnotationMap[nextAnnId];
    const prevBtnOfNextAnn = nextAnn.buttons.find(btn => btn.type === 'prev')!;
    const update = updateButtonProp(nextAnn, prevBtnOfNextAnn.id, 'hotspot', null);
    updates.push([+screenId, update, 'upsert']);
  }
  if (prevBtn.hotspot) {
    const prevAnnId = prevBtn.hotspot.actionValue;
    const [screenId] = prevAnnId.split('/');
    const prevAnn = flatAnnotationMap[prevAnnId];
    const nextBtnOfPrevAnn = prevAnn.buttons.find(btn => btn.type === 'next')!;
    const update = updateButtonProp(prevAnn, nextBtnOfPrevAnn.id, 'hotspot', null);
    updates.push([+screenId, update, 'upsert']);
  }

  updates.push([currentScreenId, ann, 'delete']);
  return updates;
}
