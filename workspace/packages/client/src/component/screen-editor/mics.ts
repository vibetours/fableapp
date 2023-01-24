import { AnnotationButtonSize, AnnotationButtonStyle, AnnotationPositions, IAnnotationConfig, IAnnotationTheme } from '@fable/common/dist/types';

export function getPlaceholderAnnotationConfig(): IAnnotationConfig {
  return {
    id: '0',
    bodyContent: 'Write a description about what this feature of your product does to your user. Write a description about what this feature of your product does to your user.',
    positioning: AnnotationPositions.Auto,
    buttons: [{
      id: '1234',
      type: 'next',
      style: AnnotationButtonStyle.Primary,
      size: AnnotationButtonSize.Large,
      text: 'Next',
    }, {
      id: '2345',
      type: 'prev',
      style: AnnotationButtonStyle.Outline,
      size: AnnotationButtonSize.Medium,
      text: 'Prev',
    },
    {
      id: '3456',
      type: 'custom',
      style: AnnotationButtonStyle.Link,
      size: AnnotationButtonSize.Small,
      text: 'Goto payment',
    }
    ],
    hotspots: []
  };
}

export function getDefaultThemeConfig(): IAnnotationTheme {
  return {
    primaryColor: '#7567FF',
  };
}
