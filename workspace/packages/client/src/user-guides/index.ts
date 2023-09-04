import PreviewAndEmbedGuide from './preview-and-embed-guide';
import CanvasGuidePart1 from './getting-to-know-the-canvas/part-1';
import CanvasGuidePart2 from './getting-to-know-the-canvas/part-2';
import CanvasGuidePart3 from './getting-to-know-the-canvas/part-3';
import TourCardGuide from './tour-card-guide';
import { upsertFableUserGuide } from './utils';

const allUserGuides = [
  PreviewAndEmbedGuide,
  TourCardGuide,
  CanvasGuidePart1,
  CanvasGuidePart2,
  CanvasGuidePart3,
];

export const upsertAllUserGuides = (): void => {
  allUserGuides.forEach(guide => upsertFableUserGuide(guide.guideInfo));
};
