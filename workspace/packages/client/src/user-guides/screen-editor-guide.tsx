import React, { useState } from 'react';
import Tour from '../component/user-guide-tour';
import { closeUserGuide, completeUserGuide, skipUserGuide, updateStepsTaken, UserGuideHotspotManager } from './utils';
import { Guide, GuideInfo, GuideProps } from './types';
import IntroCard from '../component/user-guide-tour/intro-card';
import ReordingGif from '../assets/user-guide/reordering.gif';
import PanningGif from '../assets/user-guide/panning.gif';

export const guide: Guide = {
  id: 'screen-editor-guide',
  name: 'Get started with editing a tour',
  desc: {
    toursCreated: 'Open a tour & click on an annotation in canvas to get started',
    toursNotCreated: 'Create a tour to see this guide'
  },
  serialId: 3,
  steps: [
    {
      title: 'Edit content of your annotation',
      description: 'You can edit and style your annotation from this section. All your edits are autosaved.',
      target: () => document.getElementsByClassName('editor-container').item(0)! as HTMLElement,
      nextButtonProps: {
        onClick() {
          updateStepsTaken(guide.id, 1);
          document.getElementById('ann-creator-panel')!.scroll({ top: 300, behavior: 'smooth' });
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
      placement: 'left'
    },
    {
      title: 'Adjust selected element on which annotation is applied',
      description: 'Sometimes you need to have more control on which element to select in the screen while annotation is displayed. Fable\'s Advanced Element Picker helps you to preview and fintune selection of element.',
      target: () => document.getElementById('AEP-wrapper')!,
      nextButtonProps: {
        onClick() {
          updateStepsTaken(guide.id, 2);
          (document.getElementById('buttons-panel')! as HTMLElement).click();
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
    },
    {
      title: 'Add custom CTA',
      description: 'Add your custom CTA on annotation and define what should happen when user clicks on the CTA.',
      target: () => document.getElementsByClassName('buttons-panel').item(0)! as HTMLElement,
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
      width: '20rem',
    },
    {
      title: 'Navigate tour by dragging',
      description: (
        <>
          <p>
            Drag (or pan) horizontally on the canvas area to see the whole tour
          </p>

          <img src={PanningGif} alt="" width={420} />
        </>
      ),
      target: null,
      nextButtonProps: {
        onClick() {
          (document.getElementById('advanced-creator-panel')! as HTMLElement).click();
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
      width: '480px'
    },
    {
      title: 'Click on an annotation to edit it',
      target: () => document.getElementsByClassName('node').item(1)! as HTMLElement,
      nextButtonProps: {
        onClick() {
          updateStepsTaken(guide.id, 5);
          document.getElementById('ann-creator-panel')!.scroll({ top: 600, behavior: 'smooth' });
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
      title: 'Drag annotation to reorder',
      description: (
        <img src={ReordingGif} alt="" width={420} />
      ),
      target: null,
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
      width: '480px'
    },
    {
      title: 'Change starting point of your tour',
      description: 'You can decide the starting point of your tour by clicking on the checkbox. Starting point is auto assigned by Fable, but you can change it anytime.',
      target: () => document.getElementById('entry-point-checkbox')! as HTMLElement,
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
    },
  ]
};

function ScreenEditorGuide(props: GuideProps): JSX.Element {
  const [startTour, setStartTour] = useState<boolean>(false);

  const hotspotManager = new UserGuideHotspotManager(guide.steps);

  return (
    <>
      <IntroCard
        title={
          <>
            👋🏻 <br />
            Hey, let's get you started with how to edit existing annotation or create new one
          </>
        }
        description="You can customize your tour by adding new annotations or editing existing ones with your branding, CTAs, custom styles etc. Our no code editor helps you get this done in minutes."
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

export default { guideInfo, component: ScreenEditorGuide };
