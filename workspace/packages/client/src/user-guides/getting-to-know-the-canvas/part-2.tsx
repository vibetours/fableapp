import React, { useState } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import Tour from '../../component/user-guide-tour';
import {
  completeUserGuide,
  updateStepsTaken,
  UserGuideHotspotManager,
  emulateHotspotClick,
  closeUserGuide,
  skipUserGuide,
} from '../utils';
import { Guide, GuideProps } from '../types';

export const guide: Guide = {
  id: 'canvas-guide-part-2',
  name: 'Getting to know the canvas',
  steps: [
    {
      title: 'Now we will add a cover annotation / guide',
      description: 'Cover annotations are centrally positioned vertically and horizontally. Click this button to add one',
      target: () => document.getElementById('cover-annotation-btn')!,
      nextButtonProps: {
        onClick() {
          updateStepsTaken(guide.id, 1);
          emulateHotspotClick(document.getElementById('cover-annotation-btn')!);
        },
      },
      prevButtonProps: {
        children: (<><CloseOutlined /> Skip guide</>),
        onClick() {
          closeUserGuide();
          skipUserGuide(guide);
        }
      },
      hotspot: true,
      width: '24rem'
    },
    {
      title: 'There you go! A cover annotation with placeholder text',
      description: 'We have created a cover annotation with a placeholder text. Let’s edit the text. Your changes will be autosaved. An autosave icon would appear for fraction of seconds while the autosaving  is in progress, don’t close the tab while autosaving is in progress - just like video games.',
      target: () => document.getElementsByClassName('editor-container').item(0)! as HTMLElement,
      nextButtonProps: {
        onClick() {
          updateStepsTaken(guide.id, 2);
          (document.getElementById('advanced-creator-panel')! as HTMLElement).click();
        },
      },
      prevButtonProps: {
        children: (<><CloseOutlined /> Skip guide</>),
        onClick() {
          closeUserGuide();
          skipUserGuide(guide);
        }
      },
      width: '24rem',
      placement: 'left'
    },
    {
      title: 'Starting point of tour',
      description: 'Every tour has a starting point that you can configure anytime you want. Since we’ve added an intro annotation, let’s mark it as Entry Point by checking the box.',
      target: () => document.getElementById('entry-point-checkbox')! as HTMLElement,
      nextButtonProps: {
        onClick() {
          updateStepsTaken(guide.id, 3);
        },
      },
      prevButtonProps: {
        children: (<><CloseOutlined /> Skip guide</>),
        onClick() {
          closeUserGuide();
          skipUserGuide(guide);
        }
      },
      width: '24rem',
      placement: 'left'
    },
    {
      title: 'Let’s complete the tour',
      description: 'Let’s go back to canvas to see how our tour’s narrative look like',
      target: () => document.getElementById('go-to-canvas-btn')!,
      nextButtonProps: {
        onClick() {
          updateStepsTaken(guide.id, 4);
          emulateHotspotClick(document.getElementById('go-to-canvas-btn')!);
        },
        children: 'Next'
      },
      prevButtonProps: {
        children: (<><CloseOutlined /> Skip guide</>),
        onClick() {
          closeUserGuide();
          skipUserGuide(guide);
        }
      },
      hotspot: true,
    },
  ]
};

const hotspotManager = new UserGuideHotspotManager(guide.steps);

function CanvasGuidePart2(props: GuideProps): JSX.Element {
  const [startTour, setStartTour] = useState<boolean>(props.isVisible);

  return (
    <>
      <Tour
        open={startTour}
        steps={guide.steps}
        onClose={() => {
          hotspotManager.cleanupHotspot();
          completeUserGuide(guide.id);
          setStartTour(false);
        }}
        onFinish={() => {
          hotspotManager.cleanupHotspot();
          completeUserGuide(guide.id);
        }}
        indicatorsRender={(current, total) => `${current + 1 + 4}/10`}
        arrow={false}
        onChange={(current) => hotspotManager.updateHotspot(current)}
      />
    </>
  );
}

const guideInfo = {
  stepsTaken: 0,
  totalSteps: guide.steps.length,
  isCompleted: false,
  isSkipped: false,
  name: guide.name,
  id: guide.id,
  groupId: guide.name,
  partId: 1,
};

export default { guideInfo, component: CanvasGuidePart2 };
