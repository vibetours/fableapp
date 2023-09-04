import React, { useState } from 'react';
import Tour from '../../component/user-guide-tour';
import {
  completeUserGuide,
  skipUserGuide,
  updateStepsTaken,
  UserGuideHotspotManager,
  emulateHotspotClick,
} from '../utils';
import { Guide, GuideProps } from '../types';
import IntroCard from '../../component/user-guide-tour/intro-card';

let uploadedScreenName: string;

export const guide: Guide = {
  id: 'canvas-guide-part-1',
  name: 'Getting to know the canvas',
  steps: [
    {
      title: 'Decide how your user would experience the tour',
      description: 'The cards on the canvas are the  annotations / guides that you create on top of your product. Your tour follows the order of  the annotations that appear here.\n You can add / remove / reorder annotations from here',
      target: () => document.getElementById('fab-tour-canvas-main')! as HTMLElement,
      nextButtonProps: {
        onClick() {
          updateStepsTaken(guide.id, 1);
        },
      },
      width: '20rem',
      placement: 'bottomLeft'
    },
    {
      title: 'Add a Intro Screen in your tour',
      description: (
        <>
          <p>Although we have auto stitched a tour for you, you can edit / add / delete any part of the suggested tour. Let’s get started by adding a intro screen.</p>
          <p>During recording every time you perform an action (say click), we capture an interactive version of your web. We call it screen. You can think of it is a live snapshot of your webpage.</p>
        </>
      ),
      target: () => document.getElementById('IUG-1')!,
      nextButtonProps: {
        onClick() {
          updateStepsTaken(guide.id, 2);
          emulateHotspotClick(document.getElementById('IUG-1')!);
        },
      },
      hotspot: true,
      width: '20rem',
    },
    {
      title: 'Let’s upload an intro screen here',
      description: 'Anything that you record in future would appear here. You can also upload an image / Figma export here. Let’s upload an image from your local system for the timebeing.',
      target: () => document.getElementById('IUG-2')!,
      nextButtonProps: {
        onClick() {
          updateStepsTaken(guide.id, 3);
          emulateHotspotClick(document.getElementById('IUG-2')!);
        },
      },
      hotspot: true,
      width: '20rem',
      placement: 'right'
    },
    {
      title: 'Let’s give your screen a name',
      description: 'Once you upload a screen you can use it in multiple tours. Let’s give it a name so that we identify this screen in future. Once done click submit.',
      target: () => document.getElementById('screen-picker-form')!,
      nextButtonProps: {
        onClick() {
          uploadedScreenName = (document.getElementById('screen-name') as HTMLInputElement).value;
          updateStepsTaken(guide.id, 4);
          emulateHotspotClick(document.getElementById('IUG-5')!);
        },
      },
      hotspot: true,
      hotspotTarget: () => document.getElementById('IUG-5')!,
      width: '25rem'
    },
    {
      title: 'Let’s add the newly uploaded screen to your tour',
      description: 'You’ve uploaded the image in Fable. You can use this image in any tour. For now let’s add the newly uploaded image to the current tour, so that you can add intro information for your user to see.',
      target: () => document.getElementById('screen-picker-grid')!,
      nextButtonProps: {
        onClick() {
          updateStepsTaken(guide.id, 5);
          const intervalId = setInterval(() => {
            const uploadedScreen = document.getElementsByClassName('card-title').item(0) as HTMLElement;
            if (uploadedScreen.innerText === uploadedScreenName) {
              clearInterval(intervalId);
              document.getElementById('screen-card')!.click();
            }
          }, 400);
        },
        children: 'Next'
      },
      width: '30rem',
      placement: 'center'
    },
  ]
};

const hotspotManager = new UserGuideHotspotManager(guide.steps);

function CanvasGuidePart1(props: GuideProps): JSX.Element {
  const [startTour, setStartTour] = useState<boolean>(false);

  return (
    <>
      <IntroCard
        title={
          <>
            👋🏻 <br />
            Hey, Let’s get you stated with Fable’s canvas
          </>
        }
        description="Every tour that you create is a narrative of your product presented to your customer. Narrative creation is no easy job, although sounds like one. Fable gives you a canvas that you can use to build, experiment and publish your narrative."
        acceptButtonProps={{
          children: 'Show me now!!!',
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
        }}
        onFinish={() => {
          completeUserGuide(guide.id);
        }}
        indicatorsRender={(current, total) => `${current + 1}/10`}
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

export default { guideInfo, component: CanvasGuidePart1 };
