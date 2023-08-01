import { IAnnotationButton, IAnnotationConfig, ITourDataOpts } from '@fable/common/dist/types';
import { nanoid } from 'nanoid';
import { AnnotationPerScreen, DestinationAnnotationPosition } from '../../types';
import { IAnnotationConfigWithScreenId, updateAnnotationGrpId } from './annotation-config-utils';
import { AnnUpdate, AnnUpdateType, GroupUpdatesByAnnotationType } from '../timeline/types';
import { isNavigateHotspot, updateLocalTimelineGroupProp } from '../../utils';

export const addPrevAnnotation = (
  newAnnConfig: IAnnotationConfigWithScreenId,
  selectedAnnId: string,
  allAnnotationsForTour: AnnotationPerScreen[],
  main: string | null,
): AnnUpdateType => {
  let newMain = null;
  const updates: AnnUpdate[] = [];

  const selectedAnnConfig = getAnnotationByRefId(selectedAnnId, allAnnotationsForTour)!;

  const nextBtnOfNewAnn = getAnnotationBtn(newAnnConfig, 'next');

  const prevBtnOfSelectedAnn = getAnnotationBtn(selectedAnnConfig, 'prev');

  const nextBtnOfNewAnnUpdate = {
    config: newAnnConfig,
    btnId: nextBtnOfNewAnn.id,
    screenId: newAnnConfig.screenId,
    actionValue: `${selectedAnnConfig.screenId}/${selectedAnnConfig.refId}`,
  };
  updates.push(nextBtnOfNewAnnUpdate);

  const prevBtnOfSelectedAnnUpdate = {
    config: selectedAnnConfig,
    btnId: prevBtnOfSelectedAnn.id,
    screenId: selectedAnnConfig.screenId,
    actionValue: `${newAnnConfig.screenId}/${newAnnConfig.refId}`,
  };

  updates.push(prevBtnOfSelectedAnnUpdate);

  if (prevBtnOfSelectedAnn.hotspot && prevBtnOfSelectedAnn.hotspot.actionType === 'navigate') {
    const [prevScreenId, prevAnnRefId] = prevBtnOfSelectedAnn.hotspot.actionValue.split('/');
    const oldPrevAnnOfSelectedAnnConfig = getAnnotationByRefId(prevAnnRefId, allAnnotationsForTour)!;
    const nextBtnOfOldPrevAnn = getAnnotationBtn(oldPrevAnnOfSelectedAnnConfig, 'next');

    const prevBtnOfNewAnn = getAnnotationBtn(newAnnConfig, 'prev');

    const nextBtnOfPrevAnnUpdate = {
      config: oldPrevAnnOfSelectedAnnConfig,
      btnId: nextBtnOfOldPrevAnn.id,
      screenId: +prevScreenId,
      actionValue: `${newAnnConfig.screenId}/${newAnnConfig.refId}`,
    };
    updates.push(nextBtnOfPrevAnnUpdate);

    const prevBtnOfNewAnnUpdate = {
      config: newAnnConfig,
      btnId: prevBtnOfNewAnn.id,
      screenId: newAnnConfig.screenId,
      actionValue: prevBtnOfSelectedAnn.hotspot.actionValue,
    };

    updates.push(prevBtnOfNewAnnUpdate);
  } else {
    const prevBtnOfNewAnn = getAnnotationBtn(newAnnConfig, 'prev');

    const prevBtnOfNewAnnUpdate = {
      config: newAnnConfig,
      btnId: prevBtnOfNewAnn.id,
      screenId: newAnnConfig.screenId,
      actionValue: null,
    };

    updates.push(prevBtnOfNewAnnUpdate);
  }

  if ((
    !prevBtnOfSelectedAnn.hotspot
    || prevBtnOfSelectedAnn.hotspot.actionType === 'open')
    && main && selectedAnnConfig.refId === main.split('/')[1]) {
    newMain = `${newAnnConfig.screenId}/${newAnnConfig.refId}`;
  }

  const groupedUpdates = groupUpdatesByAnnotation(updates);
  return { groupedUpdates, updates, main: newMain, deletionUpdate: null };
};

export const deleteAnnotation = (
  annToBeDeletedConfig: IAnnotationConfigWithScreenId,
  allAnnotationsForTour: AnnotationPerScreen[],
  main: string | null,
  hardDelete: boolean
): AnnUpdateType => {
  const updates: AnnUpdate[] = [];
  let newMain = null;
  let deletionUpdate: AnnUpdate| null = null;

  const nextBtnOfCurrentAnn = getAnnotationBtn(annToBeDeletedConfig, 'next');
  const prevBtnOfCurrentAnn = getAnnotationBtn(annToBeDeletedConfig, 'prev');

  if (prevBtnOfCurrentAnn.hotspot && prevBtnOfCurrentAnn.hotspot.actionType === 'navigate') {
    const [prevScreenId, prevAnnRefId] = prevBtnOfCurrentAnn.hotspot.actionValue.split('/');
    const oldPrevAnnOfAnnToBeDeletedConfig = getAnnotationByRefId(prevAnnRefId, allAnnotationsForTour)!;
    const nextBtnOfOldPrevAnn = getAnnotationBtn(oldPrevAnnOfAnnToBeDeletedConfig, 'next');

    if (nextBtnOfCurrentAnn.hotspot) {
      const prevBtnOfCurrentAnnUpdate = {
        config: oldPrevAnnOfAnnToBeDeletedConfig,
        btnId: nextBtnOfOldPrevAnn.id,
        screenId: +prevScreenId,
        actionValue: nextBtnOfCurrentAnn.hotspot!.actionValue,
      };

      updates.push(prevBtnOfCurrentAnnUpdate);
    } else {
      const prevBtnOfCurrentAnnUpdate = {
        config: oldPrevAnnOfAnnToBeDeletedConfig,
        btnId: nextBtnOfOldPrevAnn.id,
        screenId: +prevScreenId,
        actionValue: null,
      };

      updates.push(prevBtnOfCurrentAnnUpdate);
    }
  }

  if (nextBtnOfCurrentAnn.hotspot && nextBtnOfCurrentAnn.hotspot.actionType === 'navigate') {
    const [nextScreenId, nextAnnRefId] = nextBtnOfCurrentAnn.hotspot.actionValue.split('/');
    const oldNextAnnOfAnnToBeDeletedConfig = getAnnotationByRefId(nextAnnRefId, allAnnotationsForTour)!;
    const prevBtnOfOldNextAnn = getAnnotationBtn(oldNextAnnOfAnnToBeDeletedConfig, 'prev');

    if (main && annToBeDeletedConfig.refId === main.split('/')[1]) {
      newMain = nextBtnOfCurrentAnn.hotspot.actionValue;
    }

    if (prevBtnOfCurrentAnn.hotspot) {
      const nextBtnOfCurrentAnnUpdate = {
        config: oldNextAnnOfAnnToBeDeletedConfig,
        btnId: prevBtnOfOldNextAnn.id,
        screenId: +nextScreenId,
        actionValue: prevBtnOfCurrentAnn.hotspot!.actionValue,
      };

      updates.push(nextBtnOfCurrentAnnUpdate);
    } else {
      const nextBtnOfCurrentAnnUpdate = {
        config: oldNextAnnOfAnnToBeDeletedConfig,
        btnId: prevBtnOfOldNextAnn.id,
        screenId: +nextScreenId,
        actionValue: null,
      };

      updates.push(nextBtnOfCurrentAnnUpdate);
    }
  }

  if (hardDelete) {
    deletionUpdate = {
      config: annToBeDeletedConfig,
      btnId: '',
      screenId: annToBeDeletedConfig.screenId,
      actionValue: null,
    };
  }

  const groupedUpdates = groupUpdatesByAnnotation(updates);
  return { groupedUpdates, updates, main: newMain, deletionUpdate };
};

export const deleteConnection = (
  fromAnnId: string,
  toId: string,
  allAnnotationsForTour: AnnotationPerScreen[],
): AnnUpdateType => {
  const updates: AnnUpdate[] = [];
  const fromAnnConfig = getAnnotationByRefId(fromAnnId, allAnnotationsForTour)!;
  const toAnnConfig = getAnnotationByRefId(toId, allAnnotationsForTour)!;

  const nextBtnOfFromAnn = getAnnotationBtn(fromAnnConfig, 'next');
  const prevBtnOfToAnn = getAnnotationBtn(toAnnConfig, 'prev');

  const nextBtnOfFromAnnUpdate = {
    config: fromAnnConfig,
    btnId: nextBtnOfFromAnn.id,
    screenId: fromAnnConfig.screenId,
    actionValue: null,
  };
  updates.push(nextBtnOfFromAnnUpdate);

  const prevBtnOfToAnnUpdate = {
    config: toAnnConfig,
    btnId: prevBtnOfToAnn.id,
    screenId: toAnnConfig.screenId,
    actionValue: null,
  };
  updates.push(prevBtnOfToAnnUpdate);
  const newGrpId = nanoid();
  updateLocalTimelineGroupProp(newGrpId, fromAnnConfig.grpId);
  const grpIdUpdates = updateGrpIdForTimelineTillEnd(toAnnConfig, allAnnotationsForTour, newGrpId);

  const groupedUpdates = groupUpdatesByAnnotation([...updates, ...grpIdUpdates]);
  return { groupedUpdates, updates, main: null, deletionUpdate: null };
};

export const updateGrpIdForTimelineTillEnd = (
  annConfig: IAnnotationConfigWithScreenId,
  allAnnotationsForTour: AnnotationPerScreen[],
  grpId: string
): AnnUpdate[] => {
  const updates: AnnUpdate[] = [];
  let toScreenId = annConfig.screenId.toString();
  let annId = annConfig.refId;
  let updatedAnn = updateAnnotationGrpId(annConfig, grpId);
  let nextAnnBtn = updatedAnn.buttons.find(btn => btn.type === 'next');
  let nextAnnBtnHotspot = nextAnnBtn!.hotspot;
  updates.push({
    config: annConfig,
    btnId: nextAnnBtn!.id,
    screenId: +toScreenId,
    actionValue: nextAnnBtnHotspot?.actionValue || null,
    grpId
  });
  while (isNavigateHotspot(nextAnnBtnHotspot)) {
    [toScreenId, annId] = nextAnnBtnHotspot!.actionValue.split('/');
    annConfig = getAnnotationByRefId(annId, allAnnotationsForTour)!;
    updatedAnn = updateAnnotationGrpId(annConfig, grpId);
    nextAnnBtn = updatedAnn.buttons.find(btn => btn.type === 'next');
    nextAnnBtnHotspot = nextAnnBtn!.hotspot;
    updates.push({
      config: annConfig,
      btnId: nextAnnBtn!.id,
      screenId: +toScreenId,
      actionValue: nextAnnBtnHotspot?.actionValue || null,
      grpId
    });
  }
  return updates;
};

export const reorderAnnotation = (
  currentAnnConfig: IAnnotationConfigWithScreenId,
  destinationAnnId: string,
  allAnnotationsForTour: AnnotationPerScreen[],
  main: string | null,
  position: DestinationAnnotationPosition
): AnnUpdateType => {
  const destinationAnnotation = getAnnotationByRefId(destinationAnnId, allAnnotationsForTour)!;
  currentAnnConfig = updateAnnotationGrpId(currentAnnConfig, destinationAnnotation.grpId);

  let updates: AnnUpdate[] = [];
  let result;
  if (position === DestinationAnnotationPosition.next) {
    result = addNextAnnotation(
      currentAnnConfig,
      destinationAnnId,
      allAnnotationsForTour,
      main
    );

    updates = [...result.updates];
  } else {
    result = addPrevAnnotation(
      currentAnnConfig,
      destinationAnnId,
      allAnnotationsForTour,
      main
    );

    updates = [...result.updates];
  }

  const {
    updates: deleteUpdates,
    main: afterDeleteMain
  } = deleteAnnotation(currentAnnConfig, allAnnotationsForTour, main, false);

  const groupUpdates = groupUpdatesByAnnotation([...updates, ...deleteUpdates]);

  return {
    main: result.main || afterDeleteMain,
    groupedUpdates: groupUpdates,
    updates,
    deletionUpdate: null
  };
};

export const groupUpdatesByAnnotation = (updates: AnnUpdate[]): GroupUpdatesByAnnotationType => {
  const result: GroupUpdatesByAnnotationType = {};
  for (const update of updates) {
    const key = `${update.screenId}/${update.config.id}`;
    if (key in result) result[key].push(update);
    else result[key] = [update];
  }

  return result;
};

export const addNextAnnotation = (
  newAnnConfig: IAnnotationConfigWithScreenId,
  selectedAnnId: string,
  allAnnotationsForTour: AnnotationPerScreen[],
  main: string | null,
): AnnUpdateType => {
  const newMain = null;
  const updates: AnnUpdate[] = [];

  const selectedAnnConfig = getAnnotationByRefId(selectedAnnId, allAnnotationsForTour)!;

  const prevBtnOfNewAnn = getAnnotationBtn(newAnnConfig, 'prev');

  const nextBtnOfSelectedAnn = getAnnotationBtn(selectedAnnConfig, 'next');

  const prevBtnOfNewAnnUpdate = {
    config: newAnnConfig,
    btnId: prevBtnOfNewAnn.id,
    screenId: newAnnConfig.screenId,
    actionValue: `${selectedAnnConfig.screenId}/${selectedAnnConfig.refId}`,
  };
  updates.push(prevBtnOfNewAnnUpdate);

  const nextBtnOfSelectedAnnUpdate = {
    config: selectedAnnConfig,
    btnId: nextBtnOfSelectedAnn.id,
    screenId: selectedAnnConfig.screenId,
    actionValue: `${newAnnConfig.screenId}/${newAnnConfig.refId}`,
  };
  updates.push(nextBtnOfSelectedAnnUpdate);

  if (nextBtnOfSelectedAnn.hotspot && nextBtnOfSelectedAnn.hotspot.actionType === 'navigate') {
    const [nextScreenId, nextAnnRefId] = nextBtnOfSelectedAnn.hotspot.actionValue.split('/');
    const oldNextAnnOfSelectedAnnConfig = getAnnotationByRefId(nextAnnRefId, allAnnotationsForTour)!;
    const prevBtnOfOldNextAnn = getAnnotationBtn(oldNextAnnOfSelectedAnnConfig, 'prev');

    const nextBtnOfNewAnn = getAnnotationBtn(newAnnConfig, 'next');

    const prevBtnOfNextAnnUpdate = {
      config: oldNextAnnOfSelectedAnnConfig,
      btnId: prevBtnOfOldNextAnn.id,
      screenId: +nextScreenId,
      actionValue: `${newAnnConfig.screenId}/${newAnnConfig.refId}`,
    };
    updates.push(prevBtnOfNextAnnUpdate);

    const nextBtnOfNewAnnUpdate = {
      config: newAnnConfig,
      btnId: nextBtnOfNewAnn.id,
      screenId: newAnnConfig.screenId,
      actionValue: nextBtnOfSelectedAnn.hotspot.actionValue,
    };

    updates.push(nextBtnOfNewAnnUpdate);
  } else {
    const nextBtnOfNewAnn = getAnnotationBtn(newAnnConfig, 'next');

    const nextBtnOfNewAnnUpdate = {
      config: newAnnConfig,
      btnId: nextBtnOfNewAnn.id,
      screenId: newAnnConfig.screenId,
      actionValue: null,
    };

    updates.push(nextBtnOfNewAnnUpdate);
  }

  const groupedUpdates = groupUpdatesByAnnotation(updates);
  return { groupedUpdates, updates, main: newMain, deletionUpdate: null };
};

export const getAnnotationByRefId = (
  refId: string,
  allAnnotationsForTour: AnnotationPerScreen[]
): IAnnotationConfigWithScreenId | null => {
  for (const screenGroup of allAnnotationsForTour) {
    const screenId = screenGroup.screen.id;
    for (const annotation of screenGroup.annotations) {
      if (annotation.refId === refId) {
        return { ...annotation, screenId };
      }
    }
  }
  return null;
};

export const getAnnotationBtn = (
  config: IAnnotationConfig,
  type: 'prev' | 'next'
):IAnnotationButton => config.buttons.find(btn => btn.type === type)!;

export type AnnotationSerialIdMap = Record<string, number>
export const getAnnotationSerialIdMap = (
  tourOpts: ITourDataOpts,
  allAnnotationsForTour: AnnotationPerScreen[]
): AnnotationSerialIdMap => {
  const annotationSerialIdMap: Record<string, number> = {};

  if (tourOpts.main) {
    let refId = tourOpts.main.split('/')[1];
    let annotation = getAnnotationByRefId(refId, allAnnotationsForTour);
    let nextBtn = getAnnotationBtn(annotation!, 'next');
    let idx = 0;
    while (nextBtn) {
      annotationSerialIdMap[refId] = idx;
      if (!(nextBtn.hotspot && nextBtn.hotspot.actionType === 'navigate')) break;
      idx += 1;
      refId = nextBtn.hotspot.actionValue.split('/')[1];
      annotation = getAnnotationByRefId(refId, allAnnotationsForTour);
      nextBtn = getAnnotationBtn(annotation!, 'next');
    }
  }

  return annotationSerialIdMap;
};
