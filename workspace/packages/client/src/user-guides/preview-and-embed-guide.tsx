import React, { useState } from 'react';
import Tour from '../component/user-guide-tour';
import { completeUserGuide, skipUserGuide, updateStepsTaken, UserGuideHotspotManager } from './utils';
import { Guide, GuideProps } from './types';
import IntroCard from '../component/user-guide-tour/intro-card';

export const guide: Guide = {
  id: 'preview-and-embed-guide',
  name: 'Share / embed a frame on your web',
  steps: [
    {
      title: 'We have inferred a tour based on how you have recorded your product',
      description: 'We have auto-stitched a tour for you based on your clicks while you recorded your product via our extension. Don’t worry you can change any and all aspect of your tour.',
      // target: () => document.getElementsByClassName('node').item(0)! as HTMLElement,
      target: () => document.getElementById('fab-tour-canvas-main')! as HTMLElement,
      nextButtonProps: {
        onClick() {
          updateStepsTaken(guide.id, 1);
        },
      },
      width: '20rem',
      placement: 'bottom'
    },
    {
      title: 'Preview',
      description: 'Once a tour is created you can see how your users would see it by clicking this button. We call it Preview button.',
      target: () => document.getElementById('step-1')!,
      nextButtonProps: {
        onClick() {
          updateStepsTaken(guide.id, 2);
        },
      },
    },
    {
      title: 'Embed',
      description: 'Once you are satisfied with your tour design, you can embed the it in your web or share it with others to have a look.',
      target: () => document.getElementById('step-2')!,
      nextButtonProps: {
        onClick() {
          updateStepsTaken(guide.id, 3);
        },
      },
      hotspot: true,
    },
  ]
};

const hotspotManager = new UserGuideHotspotManager(guide.steps);

function PreviewAndEmbedGuide(props: GuideProps): JSX.Element {
  const [startTour, setStartTour] = useState<boolean>(false);

  return (
    <>
      <IntroCard
        title={
          <>
            👋🏻 <br />
            Hey, Let’s get you started with how to embed / share the tour that you’ve created
          </>
          }
        description="The very next step after creating a Fable’s tour is to share it with internal people to review or embed it on your web, once you are satisfied with the tour."
        acceptButtonProps={{
          children: 'Show me',
          onClick() {
            setStartTour(true);
            hotspotManager.updateHotspot(0);
          },
        }}
        rejectButtonProps={{
          children: 'Nah! I\'m too smart',
          onClick() {
            skipUserGuide(guide);
            props.goToNextUserGuide();
          },
        }}
        show={props.isVisible && !startTour}
        width="20rem"
      />

      <Tour
        open={startTour}
        steps={guide.steps}
        onClose={() => {
          completeUserGuide(guide.id);
          setStartTour(false);
          props.goToNextUserGuide();
        }}
        onFinish={props.goToNextUserGuide}
        indicatorsRender={(current, total) => `${current + 1}/${total}`}
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
  partId: 0,
};

export default { guideInfo, component: PreviewAndEmbedGuide };
