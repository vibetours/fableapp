import React from 'react';
import { traceEvent } from '@fable/common/dist/amplitude';
import { CmnEvtProp } from '@fable/common/dist/types';
import Button from '../button';
import * as GTags from '../../common-styled';
import * as Tags from './styled';
import IframeCodeSnippet from '../header/iframe-code-snippet';
import { createIframeSrc } from '../../utils';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';

interface Props {
  relativeUrl: string;
  isModalVisible: boolean;
  closeModal: () => void;
  copyHandler: () => Promise<void>;
  embedClickedFrom: 'tours' | 'header';
}

export default function ShareTourModal(props: Props):JSX.Element {
  return (
    <GTags.BorderedModal
      className="share-modal"
      title={<p style={{ color: '#16023e', fontSize: '16px', fontWeight: 700 }}>Get embed code</p>}
      open={props.isModalVisible}
      onCancel={props.closeModal}
      centered
      width={486}
      footer={[
        <Tags.ModalButtonsContainer key="footer-buttons">
          <Button onClick={props.closeModal} intent="secondary" key="cancel">Cancel</Button>
          <Button
            onClick={() => {
              traceEvent(AMPLITUDE_EVENTS.EMBED_TOUR, {
                embed_type: 'ifame_html',
                embed_clicked_from: props.embedClickedFrom,
                tour_url: createIframeSrc(props.relativeUrl.slice(2))
              }, [CmnEvtProp.EMAIL]);
              props.copyHandler();
            }}
            key="copy"
          >Copy
          </Button>
        </Tags.ModalButtonsContainer>,
      ]}
      closable={false}
    >
      <IframeCodeSnippet src={createIframeSrc(props.relativeUrl)} />
    </GTags.BorderedModal>
  );
}
