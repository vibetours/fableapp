/* eslint-disable class-methods-use-this */
import { Guide, TourStepPropsWithElHotspotConfig, USER_GUIDE_LOCAL_STORE_KEY } from './types';

export interface LocalStoreUserGuideProps {
  groupId: string;
  totalSteps: number;
  stepsTaken: number;
  isCompleted: boolean;
  isSkipped: boolean;
  name: string;
  id: string;
  partId: number;
}

type LocalStoreUserGuide = Record<string, LocalStoreUserGuideProps>;

const getFableUserGuide = (): LocalStoreUserGuide => {
  const FABLE_USER_GUIDE = localStorage.getItem(USER_GUIDE_LOCAL_STORE_KEY);
  return FABLE_USER_GUIDE ? JSON.parse(FABLE_USER_GUIDE) as LocalStoreUserGuide : {};
};

const saveFableUserGuide = (userGuide: LocalStoreUserGuide): void => {
  localStorage.setItem(USER_GUIDE_LOCAL_STORE_KEY, JSON.stringify(userGuide));
};

export const upsertFableUserGuide = (
  guide: LocalStoreUserGuideProps
): void => {
  const FABLE_USER_GUIDE = getFableUserGuide();

  if (!FABLE_USER_GUIDE[guide.id]) {
    FABLE_USER_GUIDE[guide.id] = guide;
    saveFableUserGuide(FABLE_USER_GUIDE);
  }
};

export const shouldShowGuide = (guideId: string): boolean => {
  const FABLE_USER_GUIDE = getFableUserGuide();

  const guide = FABLE_USER_GUIDE[guideId];

  const isCurrGuideDone = !FABLE_USER_GUIDE[guideId].isSkipped && !FABLE_USER_GUIDE[guideId].isCompleted;

  if (guide.partId === 0) {
    return isCurrGuideDone;
  }

  const prevGuide = Object.values(FABLE_USER_GUIDE).find(g => (
    g.groupId === guide.groupId && g.partId === guide.partId - 1
  ));

  if (prevGuide) {
    return prevGuide.isCompleted && isCurrGuideDone;
  }

  return false;
};

export const updateStepsTaken = (guideId: string, stepsTaken: number): void => {
  const FABLE_USER_GUIDE = getFableUserGuide();

  if (FABLE_USER_GUIDE[guideId].stepsTaken < stepsTaken) {
    FABLE_USER_GUIDE[guideId].stepsTaken = stepsTaken;
    saveFableUserGuide(FABLE_USER_GUIDE);
  }
};

export const closeUserGuide = (): void => {
  const closeBtn = document.getElementsByClassName('ant-tour-close').item(0) as HTMLSpanElement;
  if (closeBtn) closeBtn.click();
};

export const skipUserGuide = (guide: Guide): void => {
  const FABLE_USER_GUIDE = getFableUserGuide();

  for (const g of Object.values(FABLE_USER_GUIDE)) {
    if (g.groupId === guide.name) {
      g.isSkipped = true;
    }
  }

  saveFableUserGuide(FABLE_USER_GUIDE);
};

export const resetSkippedOrCompletedStatus = (groupId: string): void => {
  const FABLE_USER_GUIDE = getFableUserGuide();

  for (const guide of Object.values(FABLE_USER_GUIDE)) {
    if (guide.groupId === groupId) {
      guide.isCompleted = false;
      guide.isSkipped = false;
      guide.stepsTaken = 0;
    }
  }

  saveFableUserGuide(FABLE_USER_GUIDE);
};

export const completeUserGuide = (guideId: string): void => {
  const FABLE_USER_GUIDE = getFableUserGuide();

  FABLE_USER_GUIDE[guideId].isCompleted = true;

  saveFableUserGuide(FABLE_USER_GUIDE);
};

export const getUserGuideCompletionProgress = (): {
  stepsTaken: number;
  totalSteps: number;
} => {
  const FABLE_USER_GUIDE = getFableUserGuide();

  return Object.values(FABLE_USER_GUIDE).reduce((acc, curr) => {
    acc.stepsTaken += curr.stepsTaken;
    acc.totalSteps += curr.totalSteps;
    return acc;
  }, { stepsTaken: 0, totalSteps: 0 });
};

export const getUserGuideCompletionProgressInModules = (): {
  completedModules: number;
  totalmodules: number;
} => {
  const FABLE_USER_GUIDE = groupUserGuidesByGroupId(getFableUserGuide());

  return Object.values(FABLE_USER_GUIDE).reduce((acc, curr) => {
    if (curr.isCompleted && !curr.isSkipped) {
      acc.completedModules += 1;
    }
    acc.totalmodules += 1;
    return acc;
  }, { completedModules: 0, totalmodules: 0 });
};

export interface CategorizedUserGuides {
  completed: LocalStoreUserGuideProps[];
  remaining: LocalStoreUserGuideProps[];
  skipped: LocalStoreUserGuideProps[];
}

const groupUserGuidesByGroupId = (guides: LocalStoreUserGuide): LocalStoreUserGuide => {
  const groupedGuides: Record<string, LocalStoreUserGuideProps[]> = {};

  for (const guide of Object.values(guides)) {
    const groupId = guide.groupId;

    if (groupedGuides[groupId]) {
      groupedGuides[groupId].push(guide);
    } else {
      groupedGuides[groupId] = [guide];
    }
  }

  const compositeGuide: Record<string, LocalStoreUserGuideProps> = {};

  for (const [groupId, groupedGuide] of Object.entries(groupedGuides)) {
    let isCompleted = true;
    let isSkipped = false;
    let stepsTaken = 0;
    let totalSteps = 0;
    const id = groupId;

    for (const guide of groupedGuide) {
      stepsTaken += guide.stepsTaken;
      totalSteps += guide.totalSteps;
      if (!guide.isCompleted) isCompleted = false;
      if (guide.isSkipped) isSkipped = true;
    }

    compositeGuide[id] = {
      id,
      groupId,
      stepsTaken,
      totalSteps,
      isCompleted,
      isSkipped,
      name: groupId,
      partId: 0
    };
  }

  return compositeGuide;
};

export const getCategorizedUserGuides = (): CategorizedUserGuides => {
  const FABLE_USER_GUIDE = getFableUserGuide();

  const groupedUserGuies = groupUserGuidesByGroupId(FABLE_USER_GUIDE);

  return Object.values(groupedUserGuies).reduce((acc, curr) => {
    if (curr.isCompleted) {
      acc.completed.push(curr);
    } else if (curr.isSkipped) {
      acc.skipped.push(curr);
    } else {
      acc.remaining.push(curr);
    }
    return acc;
  }, { completed: [], remaining: [], skipped: [] } as CategorizedUserGuides);
};

export const emulateHotspotClick = (target: HTMLElement): void => {
  if (!target.getAttribute('clicked')) {
    target.click();
  } else {
    target.removeAttribute('clicked');
  }
};

export class UserGuideHotspotManager {
  public hotspotEl: HTMLElement | null = null;

  public dontPropagate: boolean = false;

  private steps: TourStepPropsWithElHotspotConfig[];

  private POLL_INTERVAL = 300;

  private DEFAULT_WIDTH = '20rem';

  private POLL_DURATION = 2500;

  constructor(steps: TourStepPropsWithElHotspotConfig[]) {
    this.steps = steps;
  }

  private emulateNextClick(e: MouseEvent): void {
    const el = e.currentTarget as HTMLElement;
    el.setAttribute('clicked', 'true');

    const nextBtn = document.getElementsByClassName('ant-tour-next-btn')[0] as HTMLElement;
    nextBtn.click();
  }

  private addHotspot = (target: HTMLElement): void => {
    target.addEventListener('click', this.emulateNextClick);
  };

  private removeHotspot = (target: HTMLElement): void => {
    target.removeEventListener('click', this.emulateNextClick);
  };

  private getHotspotEl = (currentStep: TourStepPropsWithElHotspotConfig): HTMLElement | null => {
    const result = currentStep.hotspot
      ? ((currentStep.hotspotTarget || currentStep.target) as () => HTMLElement | null).call(this) || null
      : null;

    return result;
  };

  applyWidth = (width: string): void => {
    let timeElapsed = 0;
    const intervalId = setInterval(() => {
      const guideCard = document.getElementsByClassName('ant-tour').item(0) as HTMLElement;

      timeElapsed += this.POLL_INTERVAL;

      if (guideCard) guideCard.style.setProperty('width', width, 'important');

      if (timeElapsed > this.POLL_DURATION || guideCard) clearInterval(intervalId);
    }, this.POLL_INTERVAL);
  };

  cleanupHotspot = (): void => {
    if (this.hotspotEl) this.removeHotspot(this.hotspotEl!);
  };

  updateHotspot(index: number): void {
    if (this.hotspotEl) this.removeHotspot(this.hotspotEl!);

    const currentStep = this.steps[index];

    let timeElapsed = 0;
    const intervalId = setInterval(() => {
      this.hotspotEl = this.getHotspotEl(currentStep);

      timeElapsed += this.POLL_INTERVAL;

      if (this.hotspotEl) this.addHotspot(this.hotspotEl);

      if (timeElapsed > this.POLL_DURATION || this.hotspotEl) clearInterval(intervalId);
    }, this.POLL_INTERVAL);

    if (currentStep.hideNavButtons) {
      document.getElementsByClassName('ant-tour-buttons').item(0)?.setAttribute('style', 'display: none !important');
    }

    this.applyWidth(currentStep.width || this.DEFAULT_WIDTH);
  }
}
