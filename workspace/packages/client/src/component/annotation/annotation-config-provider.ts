import {
  AnnotationButtonSize,
  AnnotationButtonStyle,
  AnnotationPositions,
  IAnnotationButton,
  IAnnotationConfig,
  IAnnotationTheme
} from '@fable/common/dist/types';
import { getRandomId } from '@fable/common/dist/utils';

export default class AnnotationConfigProvider {
  private config: IAnnotationConfig;

  private globalThemeConfig: IAnnotationTheme;

  private latestBtnOrder: number;

  constructor(
    initalConfig: IAnnotationConfig = AnnotationConfigProvider.generateSampleConfig(),
    initalThemeConfig: IAnnotationTheme = AnnotationConfigProvider.getDefaultThemeConfig()
  ) {
    this.config = initalConfig;
    this.globalThemeConfig = initalThemeConfig;
    this.latestBtnOrder = this.getLatestBtnOrder();
  }

  getConfig(): IAnnotationConfig {
    return this.config;
  }

  getGlobalThemeConfig(): IAnnotationTheme {
    return this.globalThemeConfig;
  }

  getLatestBtnOrder(): number {
    let order = 1;
    for (const btn of this.config.buttons) {
      if (btn.type !== 'custom') {
        continue;
      }

      order = Math.max(order, btn.order);
    }
    return order;
  }

  addCustomBtn(): IAnnotationConfig {
    const order = this.latestBtnOrder++;
    const nextBtn = this.config.buttons.filter(btn => btn.type === 'next')[0];
    const size = nextBtn.size;
    const btn = AnnotationConfigProvider.getCustomBtnTemplate(order, size);
    const newConfig = { ...this.config };
    newConfig.buttons = newConfig.buttons.slice(0);
    newConfig.buttons.push(btn);
    this.config = newConfig;
    return newConfig;
  }

  private static getCustomBtnTemplate(order: number, size: AnnotationButtonSize): IAnnotationButton {
    return {
      id: getRandomId(),
      type: 'custom',
      style: AnnotationButtonStyle.Outline,
      size,
      text: 'Your custom button',
      order
    };
  }

  static getDefaultThemeConfig(): IAnnotationTheme {
    return {
      primaryColor: '#7567FF',
    };
  }

  static generateSampleConfig(): IAnnotationConfig {
    return {
      id: getRandomId(),
      bodyContent: 'Write a description about what this feature of your product does to your user.',
      positioning: AnnotationPositions.Auto,
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
        text: 'Prev',
        order: 0
      }],
      hotspots: []
    };
  }
}
