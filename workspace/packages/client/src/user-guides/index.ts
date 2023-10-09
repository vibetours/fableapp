import PreviewAndEmbedGuide from './preview-and-embed-guide';
import TourCardGuide from './tour-card-guide';
import ScreenEditorGuide from './screen-editor-guide';
import { insertFableUserGuide, removeDeprecatedTours, upsertFableUserGuide } from './utils';

const allUserGuides = [
  PreviewAndEmbedGuide,
  TourCardGuide,
  ScreenEditorGuide,
];

export const removeOldGuides = (): void => removeDeprecatedTours(allUserGuides);

export const insertAllUserGuides = (): void => insertFableUserGuide(allUserGuides);

export const upsertAllUserGuides = (): void => {
  allUserGuides.forEach(guide => upsertFableUserGuide(guide.guideInfo));
};
