import { AnnotationPositions, IAnnotationConfig } from '@fable/common/dist/types';

export function getPlaceholderAnnotationConfig(): IAnnotationConfig {
  return {
    localId: 0,
    bodyContent: 'Write a description about what this feature of your product does to your user. Write a description about what this feature of your product does to your user.',
    positioning: AnnotationPositions.Auto,
  };
}
