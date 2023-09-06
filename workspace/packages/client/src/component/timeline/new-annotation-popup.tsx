import React, { ReactElement, useEffect, useState } from 'react';
import {
  FullscreenOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { ITourDataOpts } from '@fable/common/dist/types';
import * as GTags from '../../common-styled';
import { AnnUpdateType } from './types';
import { AnnotationPerScreen, DestinationAnnotationPosition, IAnnotationConfigWithScreen, ScreenPickerData } from '../../types';
import { addNewAnn } from '../annotation/ops';
import { amplitudeNewAnnotationCreated, propertyCreatedFromWithType } from '../../amplitude';

type Props = {
  position: DestinationAnnotationPosition,
  allAnnotationsForTour: AnnotationPerScreen[],
  annotation: IAnnotationConfigWithScreen
  tourDataOpts: ITourDataOpts,
  hidePopup: () => void;
  raiseAlertIfOpsDenied: (msg?: string) => void;
  applyAnnButtonLinkMutations: (mutations: AnnUpdateType) => void,
  shouldShowScreenPicker: (screenPickerData: ScreenPickerData)=> void;
  calledFrom: 'canvas' | 'timeline';
}

export default function NewAnnotationPopup(props: Props): ReactElement {
  return (
    <>
      <div>
        <div>
          <GTags.Txt className="title2">
            Create a new annotation&nbsp;
          </GTags.Txt>
          <div style={{
            borderTop: '1px solid #ddd',
            padding: '0.5rem 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem'
          }}
          >
            <GTags.PopoverMenuItem onClick={() => {
              amplitudeNewAnnotationCreated(
                props.calledFrom === 'canvas' ? propertyCreatedFromWithType.CANVAS_PLUS_ICON_COVER_SAME_SCREEN
                  : propertyCreatedFromWithType.TIMELINE_PLUS_ICON_COVER_SAME_SCREEN
              );
              addNewAnn(
                props.allAnnotationsForTour,
                {
                  position: props.position,
                  grpId: props.annotation.grpId,
                  screenId: props.annotation.screen.id,
                  refId: props.annotation.refId
                },
                props.tourDataOpts,
                props.raiseAlertIfOpsDenied,
                props.applyAnnButtonLinkMutations
              );
              props.hidePopup();
            }}

            >
              <FullscreenOutlined />&nbsp;&nbsp;&nbsp;Of type cover
            </GTags.PopoverMenuItem>
            <GTags.PopoverMenuItem onClick={() => {
              props.shouldShowScreenPicker({
                position: props.position,
                annotation: props.annotation,
                screenPickerMode: 'create',
                showCloseButton: true
              });
              props.hidePopup();
            }}
            >
              <FileTextOutlined />&nbsp;&nbsp;&nbsp;By adding a new screen
            </GTags.PopoverMenuItem>
          </div>
        </div>
      </div>
    </>
  );
}
