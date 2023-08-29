import { PlusCircleOutlined } from '@ant-design/icons';
import { Button, Popover } from 'antd';
import React from 'react';
import { ITourDataOpts } from '@fable/common/dist/types';
import { AnnotationPerScreen, DestinationAnnotationPosition, IAnnotationConfigWithScreen, ScreenPickerData } from '../../types';
import { AnnUpdateType } from './types';
import NewAnnotationPopup from './new-annotation-popup';

interface Props {
  position: DestinationAnnotationPosition;
  allAnnotationsForTour: AnnotationPerScreen[];
  annotation: IAnnotationConfigWithScreen;
  tourDataOpts: ITourDataOpts;
  hidePopup: () => void;
  applyAnnButtonLinkMutations: (mutations: AnnUpdateType) => void;
  open: boolean | undefined;
  showAddAnnButtons: boolean;
  onOpenChange: (visible: boolean) => void;
  alignment: 'top' | 'bottom';
  setAlertMsg: (alertMsg?: string) => void;
  shouldShowScreenPicker: (screenPickerData: ScreenPickerData)=> void;
}

export default function AddAnnFloatingBtn({
  position,
  allAnnotationsForTour,
  annotation,
  tourDataOpts,
  hidePopup,
  applyAnnButtonLinkMutations,
  open,
  showAddAnnButtons,
  onOpenChange,
  alignment,
  setAlertMsg,
  shouldShowScreenPicker
}: Props):JSX.Element {
  return (
    <Popover
      trigger="click"
      title=""
      placement="left"
      content={
        <NewAnnotationPopup
          position={position}
          allAnnotationsForTour={allAnnotationsForTour}
          annotation={annotation}
          tourDataOpts={tourDataOpts}
          hidePopup={hidePopup}
          applyAnnButtonLinkMutations={applyAnnButtonLinkMutations}
          raiseAlertIfOpsDenied={setAlertMsg}
          shouldShowScreenPicker={shouldShowScreenPicker}
        />
    }
      open={open}
      onOpenChange={(visible: boolean) => {
        onOpenChange(visible);
      }}
    >
      <Button
        type="text"
        size="small"
        color="red"
        icon={<PlusCircleOutlined style={{ opacity: '0.65' }} />}
        style={{
          display: `${showAddAnnButtons ? 'block' : 'none'}`,
          position: 'absolute',
          [alignment]: '-24px',
          left: '50%',
          transform: 'translateX(-50%)'
        }}
      />
    </Popover>
  );
}
