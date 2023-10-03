import PreviewAndEmbedGuide from './preview-and-embed-guide';
import TourCardGuide from './tour-card-guide';
import ScreenEditorGuide from './screen-editor-guide';
import { removeDeprecatedTours, upsertFableUserGuide } from './utils';

const allUserGuides = [
  PreviewAndEmbedGuide,
  TourCardGuide,
  ScreenEditorGuide,
];

removeDeprecatedTours(allUserGuides);

export const upsertAllUserGuides = (): void => {
  allUserGuides.forEach(guide => upsertFableUserGuide(guide.guideInfo));
};
