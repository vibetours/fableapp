import React, { useState } from 'react';
import Tour from '../component/user-guide-tour';
import { closeUserGuide, completeUserGuide, skipUserGuide, updateStepsTaken, UserGuideHotspotManager } from './utils';
import { Guide, GuideInfo, GuideProps } from './types';
import IntroCard from '../component/user-guide-tour/intro-card';

export const guide: Guide = {
  id: 'preview-and-embed-guide',
  name: 'Share/embed a tour on your web',
  serialId: 2,
  desc: {
    toursCreated: 'Open any tour to see how this works',
    toursNotCreated: 'Create a tour to see this guide'
  },
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
      prevButtonProps: {
        children: 'Skip guide',
        onClick() {
          closeUserGuide();
          skipUserGuide(guide);
        }
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
      prevButtonProps: {
        children: 'Skip guide',
        onClick() {
          closeUserGuide();
          skipUserGuide(guide);
        }
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
      prevButtonProps: {
        children: 'Skip guide',
        onClick() {
          closeUserGuide();
          skipUserGuide(guide);
        }
      },
      hotspot: true,
    },
    {
      title: 'Add a new screen',
      description: 'Add existing recorded screens or upload a brand new image to add it in this tour.',
      target: () => document.getElementById('new-screen-btn')!,
      nextButtonProps: {
        onClick() {
          updateStepsTaken(guide.id, 4);
        },
      },
      prevButtonProps: {
        children: 'Skip guide',
        onClick() {
          closeUserGuide();
          skipUserGuide(guide);
        }
      },
      placement: 'rightTop',
    },
    {
      title: 'Design your loader',
      description: (
        <>
          <p>
            By default Fable uses a standard loader. However you can upload your brand assets to design a loader that suits your brand. Loader is shown when your interactive tours are getting ready. Click <em>preview</em> to see how the loader looks on your tour.
          </p>
        </>
      ),
      target: () => document.getElementById('loader-btn')!,
      nextButtonProps: {
        onClick() {
          updateStepsTaken(guide.id, 5);
        },
      },
      prevButtonProps: {
        children: 'Skip guide',
        onClick() {
          closeUserGuide();
          skipUserGuide(guide);
        }
      },
      placement: 'rightTop',
      width: '30rem'
    },
    {
      title: 'Create a journey',
      description: 'Use journey to show multiple module of your product. Your user can choose which part of your product they are interested in and you get detailed analytics out of it.',
      target: () => document.getElementById('journey-btn')!,
      nextButtonProps: {
        onClick() {
          updateStepsTaken(guide.id, 6);
        },
      },
      prevButtonProps: {
        children: 'Skip guide',
        onClick() {
          closeUserGuide();
          skipUserGuide(guide);
        }
      },
      placement: 'rightTop',
    },
  ]
};

function PreviewAndEmbedGuide(props: GuideProps): JSX.Element {
  const [startTour, setStartTour] = useState<boolean>(false);

  const hotspotManager = new UserGuideHotspotManager(guide.steps);

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

export default { guideInfo, component: PreviewAndEmbedGuide };
