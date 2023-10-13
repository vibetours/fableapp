import React, { ReactElement, useEffect, useState } from 'react';
import {
  FullscreenOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import * as GTags from '../../common-styled';
import {
  DestinationAnnotationPosition, IAnnotationConfigWithScreen, ScreenPickerData } from '../../types';
import { amplitudeNewAnnotationCreated, propertyCreatedFromWithType } from '../../amplitude';

type Props = {
  position: DestinationAnnotationPosition,
  annotation: IAnnotationConfigWithScreen
  hidePopup: () => void;
  shouldShowScreenPicker: (screenPickerData: ScreenPickerData)=> void;
  updateOriginAnnPos?: (position: DestinationAnnotationPosition)=> void;
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
                propertyCreatedFromWithType.CANVAS_PLUS_ICON_COVER_SAME_SCREEN
              );
              props.updateOriginAnnPos && props.updateOriginAnnPos(props.position);
              props.hidePopup();
            }}

            >
              <FullscreenOutlined />&nbsp;&nbsp;&nbsp;On this screen
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
