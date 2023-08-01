import React, { ReactElement, useState } from 'react';
import {
  FullscreenOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { ITourDataOpts } from '@fable/common/dist/types';
import { getSampleConfig } from '@fable/common/dist/utils';
import * as GTags from '../../common-styled';
import { AnnUpdateType } from './types';
import { AnnotationPerScreen, IAnnotationConfigWithScreen } from '../../types';
import { addNextAnnotation, addPrevAnnotation } from '../annotation/ops';
import ScreenSlider from '../../container/screen-slider';

type Props = {
    position: 'prev' | 'next',
    allAnnotationsForTour: AnnotationPerScreen[],
    annotation: IAnnotationConfigWithScreen
    tourDataOpts: ITourDataOpts,
    hidePopup: () => void;
    applyAnnButtonLinkMutations: (mutations: AnnUpdateType) => void,
}

export default function NewAnnotationPopup(props: Props) : ReactElement {
  const [showScreenSlider, setShowScreenSlider] = useState(false);

  const addCoverAnn = (screenId: number) : void => {
    const newAnnConfig = getSampleConfig('$', props.annotation.grpId);

    let result;
    if (props.position === 'prev') {
      result = addPrevAnnotation(
        { ...newAnnConfig, screenId },
        props.annotation.refId,
        props.allAnnotationsForTour,
        props.tourDataOpts.main,
      );
    } else {
      result = addNextAnnotation(
        { ...newAnnConfig, screenId },
        props.annotation.refId,
        props.allAnnotationsForTour,
        null,
      );
    }

    props.applyAnnButtonLinkMutations(result);

    props.hidePopup();
  };

  return (
    <>
      <div>
        <div>
          <GTags.Txt className="title2">
            Create a new annotation&nbsp;{props.position}
          </GTags.Txt>
          <div style={{
            borderTop: '1px solid #ddd',
            padding: '0.5rem 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem'
          }}
          >
            <GTags.PopoverMenuItem onClick={() => addCoverAnn(props.annotation.screen.id)}>
              <FullscreenOutlined />&nbsp;&nbsp;&nbsp;Of type cover
            </GTags.PopoverMenuItem>
            <GTags.PopoverMenuItem onClick={() => setShowScreenSlider(true)}>
              <FileTextOutlined />&nbsp;&nbsp;&nbsp;By adding a new screen
            </GTags.PopoverMenuItem>
          </div>
        </div>
      </div>
      <ScreenSlider
        isOpenScreenSlider={showScreenSlider}
        hideScreenSlider={() => setShowScreenSlider(false)}
        screenSliderMode="create"
        hidePopup={props.hidePopup}
        addCoverAnnToScreen={addCoverAnn}
        addAnnotationData={{
          pos: props.position,
          refId: props.annotation.refId,
          screenId: props.annotation.screen.id,
          grpId: props.annotation.grpId
        }}
      />

    </>
  );
}
