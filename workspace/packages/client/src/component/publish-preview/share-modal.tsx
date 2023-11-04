import React, { useEffect, useState } from 'react';
import { traceEvent } from '@fable/common/dist/amplitude';
import { CmnEvtProp } from '@fable/common/dist/types';
import { CodeOutlined, CodepenOutlined, CopyOutlined, FileImageOutlined, FileMarkdownOutlined, LinkOutlined } from '@ant-design/icons';
import { Tooltip, message } from 'antd';
import * as GTags from '../../common-styled';
import * as Tags from './styled';
import IframeCodeSnippet from '../header/iframe-code-snippet';
import { createIframeSrc } from '../../utils';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';
import { P_RespTour } from '../../entity-processor';
import PublishButton from './publish-button';
import Tabs from '../tabs';
import InlineLinkExpand from '../inline-link-expand';
import UtmParamsHelper, { ParamType } from './utm-params-helper';
import BuyersEmailHelper from './buyers-email-helper';
import UrlCodeShare from './url-code-share';

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
  manifestPath: string;
  width: string;
  tour: P_RespTour;
  openShareModal: () => void;
}

const enum SearchParamBy{
  UtmParam,
  UserParam
}

export default function ShareTourModal(props: Props): JSX.Element {
  const [messageApi, contextHolder] = message.useMessage();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublishFailed, setIsPublishFailed] = useState(false);
  const [searchParams, setSearchParams] = useState<Record<SearchParamBy, ParamType>>({
    [SearchParamBy.UserParam]: [],
    [SearchParamBy.UtmParam]: []
  });
  const [searchParamsStr, setSearchParamsStr] = useState('');
  const [defValue, setDefValue] = useState('');

  useEffect(() => {
    const allParams = [...searchParams[SearchParamBy.UserParam], ...searchParams[SearchParamBy.UtmParam]];
    if (allParams.length) setSearchParamsStr(`?${allParams.map(p => `${p.mapping}=${p.value}`).join('&')}`);
    else setSearchParamsStr('');
  }, [searchParams]);

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
        focusTriggerAfterClose={false}
        className="share-modal"
        open={props.isModalVisible}
        onCancel={props.closeModal}
        centered
        width={560}
        footer={null}
      >
        <Tags.ModalBodyCon>
          {isPublishing ? (
            <div className="section-heading">Publishing</div>
          ) : (
            <div className="section-con">
              {isPublishFailed && (
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
                    For a demo to go live, you’ll need to publish it. Please click on <em>publish</em> below once you are done making all changes.
                  </div>
                  <PublishButton
                    setIsPublishFailed={setIsPublishFailed}
                    tour={props.tour}
                    publishTour={props.publishTour}
                    openShareModal={props.openShareModal}
                    setIsPublishing={setIsPublishing}
                  />
                </>
              )}

              {!isPublishFailed
                && props.tour
                && getPublicationState(props.tour) === PublicationState.PUBLISHED
                && (
                  <>
                    <div className="section-heading">Your demo is now ready to be shared!</div>
                    <div>Please choose from one of the options below.</div>
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
                    setIsPublishFailed={setIsPublishFailed}
                    tour={props.tour}
                    publishTour={props.publishTour}
                    openShareModal={props.openShareModal}
                    setIsPublishing={setIsPublishing}
                  />
                </>
              )}
            </div>
          )}

          {!isPublishFailed
            && props.tour
            && (getPublicationState(props.tour) !== PublicationState.UNPUBLISHED)
            && (
            <Tabs
              items={[{
                head: (
                  <div>
                    <CodeOutlined />
                  &nbsp;
                    <span>IFrame</span>
                  </div>
                ),
                body: (
                  <>
                    <p>
                      Copy & paste the following code in the webpage where you want to embed the interactive demo as an iframe.
                    </p>
                    <IframeCodeSnippet
                      height={props.height}
                      width={props.width}
                      copyHandler={iframeEmbedCopyHandler}
                      src={createIframeSrc(props.relativeUrl + searchParamsStr)}
                    />
                    <InlineLinkExpand
                      gap="1rem"
                      title={(
                        <>Learn how to forward UTM parameters and track conversions from this demo.</>
                      )}
                      body={(
                        <UtmParamsHelper
                          defVal={defValue}
                          onParamsAdd={(params, v) => {
                            setDefValue(v || '');
                            setSearchParams({
                              ...searchParams,
                              [SearchParamBy.UtmParam]: params
                            });
                          }}
                        />)}
                    />
                  </>
                ),
                key: 0
              }, {
                head: (
                  <div>
                    <LinkOutlined />
                  &nbsp;
                    <span>URL</span>
                  </div>
                ),
                body: (
                  <>
                    <p>
                      You can share the following URL with your buyers and they will be able to experience the interactive demo
                    </p>
                    <UrlCodeShare url={createIframeSrc(props.relativeUrl + searchParamsStr)} />
                    <InlineLinkExpand
                      gap="1rem"
                      title={(
                        <>Learn how to forward UTM parameters and track conversions from this demo.</>
                      )}
                      body={(
                        <UtmParamsHelper
                          defVal={defValue}
                          onParamsAdd={(params, v) => {
                            setDefValue(v || '');
                            setSearchParams({
                              ...searchParams,
                              [SearchParamBy.UtmParam]: params
                            });
                          }}
                        />)}
                    />

                  </>
                ),
                key: 2
              },
              {
                head: (
                  <div>
                    <FileImageOutlined />
                    &nbsp;
                    <span>Thumbnail</span>
                  </div>
                ),
                body: (
                  <>
                    <p>
                      Your frontend engineering team can use Fable's interactive demo's manifest to retrieve all the images that are used in the demo.
                      <br />
                      Copy the following code & paste it in
                      <a
                        target="_blank"
                        href="https://codepen.io/sharefable/embed/YzBGrmz?default-tab=result&theme-id=light"
                        rel="noreferrer"
                      > &nbsp;this example <CodepenOutlined /> Codepen.
                      </a>
                    </p>
                    <UrlCodeShare url={props.manifestPath} />
                  </>
                ),
                key: 1
              }]}
              defaultActiveKey={0}
            />
            )}
        </Tags.ModalBodyCon>
      </GTags.BorderedModal>
    </>
  );
}

// <InlineLinkExpand
//   gap="0.25rem"
//   title="Track demo usage by buyer's email id"
//   body={(
//     <BuyersEmailHelper
//       onParamsAdd={(params) => {
//         setSearchParams({
//           ...searchParams,
//           [SearchParamBy.UserParam]: searchParams[SearchParamBy.UserParam].length ? [] : params
//         });
//       }}
//     />
//   )}
// />
