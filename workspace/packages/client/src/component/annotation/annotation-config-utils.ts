import {
  AnnotationButtonSize,
  AnnotationButtonStyle,
  AnnotationPositions,
  IAnnotationButton,
  IAnnotationConfig,
  IChronoUpdatable,
  ITourDataOpts
} from '@fable/common/dist/types';
import { getCurrentUtcUnixTime, getRandomId } from '@fable/common/dist/utils';

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
  return {
    id: elPath,
    refId: getRandomId(),
    createdAt: getCurrentUtcUnixTime(),
    updatedAt: getCurrentUtcUnixTime(),
    bodyContent: 'Write a description about what this feature of your product does to your user.',
    positioning: AnnotationPositions.Auto,
    monoIncKey: 0,
    syncPending: true,
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
