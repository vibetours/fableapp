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
import { P_RespTour } from '../../entity-processor';
import PublishButton from './publish-button';

enum PublicationState {
  UNPUBLISHED,
  PUBLISHED,
  OUTDATED
}

const getPublicationState = (tour: P_RespTour): PublicationState => {
  if (!tour.lastPublishedDate) return PublicationState.UNPUBLISHED;
  if (tour.lastPublishedDate >= tour.updatedAt) return PublicationState.PUBLISHED;
  if (tour.lastPublishedDate < tour.updatedAt) return PublicationState.OUTDATED;

  return PublicationState.OUTDATED;
};

interface Props {
  publishTour: (tour: P_RespTour) => Promise<boolean>;
  relativeUrl: string;
  isModalVisible: boolean;
  closeModal: () => void;
  copyHandler: () => Promise<void>;
  embedClickedFrom: 'tours' | 'header';
  height: string;
  width: string;
  tour: P_RespTour;
  isPublishing: boolean;
  openShareModal: () => void;
  setIsPublishing: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPublishFailed: React.Dispatch<React.SetStateAction<boolean>>;
  isPublishFailed: boolean;
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
          {props.isPublishing ? (
            <div className="section-heading">Publishing</div>
          ) : (
            <div className="section-con">
              {props.isPublishFailed && (
                <>
                  <div className="section-heading">Failed to publish the tour</div>
                </>
              )}
              {props.tour && getPublicationState(props.tour) === PublicationState.UNPUBLISHED && (
                <>
                  <div className="section-heading" style={{ marginBottom: '0.5rem' }}>
                    You haven't published this tour yet!
                  </div>
                  <div className="section-subheading" style={{ marginBottom: '0.5rem' }}>
                    Your tour is not available for public to experience until you publish this tour.
                    Click on Publish button once you are done with editing this tour.
                  </div>
                  <PublishButton
                    setIsPublishFailed={props.setIsPublishFailed}
                    tour={props.tour}
                    publishTour={props.publishTour}
                    openShareModal={props.openShareModal}
                    setIsPublishing={props.setIsPublishing}
                  />
                </>
              )}

              {!props.isPublishFailed
                && props.tour
                && getPublicationState(props.tour) === PublicationState.PUBLISHED
                && (
                  <>
                    <div className="section-heading">You're all set!</div>
                    <div>Your tour is published and ready to be shared.</div>
                  </>
                )}

              {props.tour && getPublicationState(props.tour) === PublicationState.OUTDATED && (
                <>
                  <div className="section-heading">You have unpublished changes</div>
                  <div className="section-subheading">
                    Your published demo is outdated.
                    <br />
                    <em>Last publish date: <span style={{ fontWeight: 500 }}>{props.tour.lastPublishedDate.toString()}</span></em>
                  </div>
                  <PublishButton
                    setIsPublishFailed={props.setIsPublishFailed}
                    tour={props.tour}
                    publishTour={props.publishTour}
                    openShareModal={props.openShareModal}
                    setIsPublishing={props.setIsPublishing}
                  />
                </>
              )}
            </div>
          )}

          {!props.isPublishFailed
            && props.tour
            && (getPublicationState(props.tour) !== PublicationState.UNPUBLISHED)
            && (
              <>
                <div className="section-con">
                  <div>
                    <p className="section-heading">
                      Iframe embed
                    </p>
                    <p className="section-subheading">
                      Copy & paste the following code in the webpage where you want to embed the interactive demo as an iframe
                    </p>
                  </div>

                  <IframeCodeSnippet
                    height={props.height}
                    width={props.width}
                    copyHandler={iframeEmbedCopyHandler}
                    src={createIframeSrc(props.relativeUrl)}
                  />
                </div>

                <div className="section-con">
                  <div>
                    <p className="section-heading">
                      Unique URL
                    </p>
                    <p className="section-subheading">
                      You can share the following URL with anyone and they will be able to experience the interactive demo
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
              </>
            )}
        </Tags.ModalBodyCon>
      </GTags.BorderedModal>
    </>
  );
}
