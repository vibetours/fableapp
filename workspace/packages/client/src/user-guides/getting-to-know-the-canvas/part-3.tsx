import React, { useEffect, useState } from 'react';
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
import ConnectScreenGif from '../../assets/user-guide/connect-screens.gif';

export const guide: Guide = {
  id: 'canvas-guide-part-3',
  name: 'Getting to know the canvas',
  steps: [
    {
      title: 'Finishing the narrative',
      description: (
        <>
          <img
            src={ConnectScreenGif}
            alt=""
            style={{
              width: '100%',
              border: '1px solid lightgray',
              borderRadius: '8px'
            }}
          />
          <p>Let’s connect the intro card to the rest of the tour by dragging an arrow head from the intro card to the rest of the tour.</p>
        </>
      ),
      target: () => document.getElementById('fab-tour-canvas-main')!,
      nextButtonProps: {
        onClick() {
          updateStepsTaken(guide.id, 1);
        },
      },
      prevButtonProps: {
        children: (<><CloseOutlined /> Skip guide</>),
        onClick() {
          closeUserGuide();
          skipUserGuide(guide);
        }
      },
      placement: 'left',
    },
    {
      title: 'Let’s see how our final tour looks like',
      description: '',
      target: () => document.getElementById('step-1')!,
      nextButtonProps: {
        onClick() {
          updateStepsTaken(guide.id, 2);
          emulateHotspotClick(document.getElementById('step-1')!);
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
    },
  ]
};

const hotspotManager = new UserGuideHotspotManager(guide.steps);

function CanvasGuidePart3(props: GuideProps): JSX.Element {
  const [startTour, setStartTour] = useState<boolean>(props.isVisible);
  const [show, setShow] = useState<boolean>(false);

  useEffect(() => {
    setTimeout(() => setShow(true), 500);
  });

  return (
    <>
      {show && <Tour
        open={startTour}
        steps={guide.steps}
        onClose={() => {
          hotspotManager.cleanupHotspot();
          completeUserGuide(guide.id);
          setStartTour(false);
          props.goToNextUserGuide();
        }}
        onFinish={() => {
          hotspotManager.cleanupHotspot();
          completeUserGuide(guide.id);
        }}
        indicatorsRender={(current, total) => `${current + 1 + 8}/10`}
        arrow={false}
        onChange={(current) => hotspotManager.updateHotspot(current)}
      />}
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
  partId: 2,
};

export default { guideInfo, component: CanvasGuidePart3 };
