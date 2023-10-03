import React, { useState } from 'react';
import Tour from '../component/user-guide-tour';
import { closeUserGuide, completeUserGuide, skipUserGuide, updateStepsTaken, UserGuideHotspotManager } from './utils';
import { Guide, GuideInfo, GuideProps } from './types';
import IntroCard from '../component/user-guide-tour/intro-card';

export const guide: Guide = {
  id: 'tour-card-guide',
  name: 'Get started with managing tours',
  desc: {
    toursCreated: 'Open /tours to see this guide',
    toursNotCreated: 'Create a tour to see this guide'
  },
  serialId: 1,
  steps: [
    {
      title: 'Preview a tour',
      description: 'Once a tour is created you can see how your users would see it by clicking this button. We call it Preview button.',
      target: () => document.getElementById('TG-1')!,
      nextButtonProps: {
        onClick() {
          updateStepsTaken(guide.id, 1);
        },
      },
      prevButtonProps: {
        children: 'Skip guide',
        onClick() {
          closeUserGuide();
          skipUserGuide(guide);
        }
      },
    },
    {
      title: 'Analytics',
      description: 'You can click the analytics button to check how your tours are performing. Analytics is refreshed every hour.',
      target: () => document.getElementById('TG-2')!,
      nextButtonProps: {
        onClick() {
          updateStepsTaken(guide.id, 2);
        },
      },
      prevButtonProps: {
        children: 'Skip guide',
        onClick() {
          closeUserGuide();
          skipUserGuide(guide);
        }
      },
    },
    {
      title: 'More actions',
      description: (
        <>
          There are plenty more things you can do to manage the tours
          <ul>
            <li>Renaming a tour - for organization purpose in case you have created many tours and having difficult time managing those</li>
            <li>Duplicating a tour - Sometimes you wanna run experiment on a tour by changing an existing tour</li>
            <li>Deleting a tour</li>
          </ul>
        </>
      ),
      target: () => document.getElementById('TG-3')!,
      nextButtonProps: {
        onClick() {
          updateStepsTaken(guide.id, 3);
        },
      },
      prevButtonProps: {
        children: 'Skip guide',
        onClick() {
          closeUserGuide();
          skipUserGuide(guide);
        }
      },
      hotspot: false,
      width: '20rem'
    },
  ]
};

const hotspotManager = new UserGuideHotspotManager(guide.steps);

function TourCardGuide(props: GuideProps): JSX.Element {
  const [startTour, setStartTour] = useState<boolean>(false);

  return (
    <>
      <IntroCard
        title={
          <>
            👋🏻 <br />
            Hey, let's get you started on tours
          </>
        }
        description="All your tours in Fable would be displayed in this page. You can create as many tours as you want. There is no limitation."
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
      />

      <Tour
        open={startTour}
        steps={guide.steps}
        onClose={() => {
          completeUserGuide(guide.id);
          setStartTour(false);
          props.goToNextUserGuide();
        }}
        onFinish={() => {
          hotspotManager.cleanupHotspot();
          props.goToNextUserGuide();
        }}
        indicatorsRender={(current, total) => `${current + 1}/${total}`}
        arrow={false}
        onChange={(current) => hotspotManager.updateHotspot(current)}
      />
    </>
  );
}

const guideInfo: GuideInfo = {
  stepsTaken: 0,
  totalSteps: guide.steps.length,
  isCompleted: false,
  isSkipped: false,
  name: guide.name,
  id: guide.id,
  groupId: guide.name,
  desc: guide.desc,
  partId: 0,
  serialId: guide.serialId
};

export default { guideInfo, component: TourCardGuide };
