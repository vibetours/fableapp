import {
  AnnotationButtonSize,
  AnnotationButtonStyle,
  AnnotationPositions,
  IAnnotationButton,
  IAnnotationConfig,
  IAnnotationTheme
} from '@fable/common/dist/types';
import { getCurrentUtcUnixTime, getRandomId } from '@fable/common/dist/utils';

export function getBigramId(config: IAnnotationConfig): string {
  return config.refId.substring(2);
}

export function updateAnnotationText(config: IAnnotationConfig, txt: string): IAnnotationConfig {
  const newConfig = newConfigFrom(config);
  newConfig.bodyContent = txt;
  newConfig.updatedAt = getCurrentUtcUnixTime();
  return newConfig;
}

export function updateGlobalThemeConfig(
  theme: IAnnotationTheme,
  key: keyof IAnnotationTheme,
  value: IAnnotationTheme[keyof IAnnotationTheme]
): IAnnotationTheme {
  const newGlobalTheme = newConfigFrom(theme);
  (newGlobalTheme as any)[key] = value;
  newGlobalTheme.monoIncKey++;
  return newGlobalTheme;
}

function newConfigFrom<T extends IAnnotationTheme | IAnnotationConfig>(c: T): T {
  const newConfig = { ...c };
  newConfig.monoIncKey++;
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
    order
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

export function getDefaultThemeConfig(): IAnnotationTheme {
  return {
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
    buttons: [{
      id: getRandomId(),
      type: 'next',
      style: AnnotationButtonStyle.Primary,
      size: AnnotationButtonSize.Large,
      text: 'Next',
      order: 9999,

    }, {
      id: getRandomId(),
      type: 'prev',
      style: AnnotationButtonStyle.Outline,
      size: AnnotationButtonSize.Large,
      text: 'Back',
      order: 0
    }],
  };
}
