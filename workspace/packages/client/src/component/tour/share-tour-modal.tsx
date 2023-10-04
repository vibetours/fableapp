import React from 'react';
import { traceEvent } from '@fable/common/dist/amplitude';
import { CmnEvtProp } from '@fable/common/dist/types';
import { CopyOutlined } from '@ant-design/icons';
import { Tooltip, message } from 'antd';
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

export default function ShareTourModal(props: Props): JSX.Element {
  const [messageApi, contextHolder] = message.useMessage();

  const success = (): void => {
    messageApi.open({
      type: 'success',
      content: 'Copied to clipboard',
    });
  };

  const iframeEmbedCopyHandler = (): void => {
    traceEvent(AMPLITUDE_EVENTS.EMBED_TOUR, {
      embed_type: 'ifame_html',
      embed_clicked_from: props.embedClickedFrom,
      tour_url: createIframeSrc(props.relativeUrl.slice(2))
    }, [CmnEvtProp.EMAIL]);
    props.copyHandler();
  };

  return (
    <>
      {contextHolder}
      <GTags.BorderedModal
        className="share-modal"
        open={props.isModalVisible}
        onCancel={props.closeModal}
        centered
        width={486}
        footer={null}
      >
        <Tags.ModalBodyCon>
          <div className="section-con">
            <div>
              <p className="section-heading">
                Iframe Embed
              </p>
              <p className="section-subheading">
                Copy and paste the following code in your frontend application to embed Fable
              </p>
            </div>

            <IframeCodeSnippet copyHandler={iframeEmbedCopyHandler} src={createIframeSrc(props.relativeUrl)} />
          </div>

          <div className="section-con">
            <div>
              <p className="section-heading">
                Copy Tour URL
              </p>
              <p className="section-subheading">
                Copy this Tour URL and share with your prospects over any communication channel
              </p>
            </div>

            <div className="url-con">
              <div className="ellipsis">
                <code>
                  {createIframeSrc(props.relativeUrl)}
                </code>
              </div>

              <Tooltip title="Copy to clipboard">
                <CopyOutlined
                  className="copy-outline"
                  onClick={() => {
                    success();
                    navigator.clipboard.writeText(createIframeSrc(props.relativeUrl));
                  }}
                />
              </Tooltip>
            </div>
          </div>
        </Tags.ModalBodyCon>
      </GTags.BorderedModal>
    </>
  );
}
