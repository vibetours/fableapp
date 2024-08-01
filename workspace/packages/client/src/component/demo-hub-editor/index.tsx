import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Tabs, Button as AntButton } from 'antd';
import { ReqDemoHubPropUpdate, RespOrg, RespUser } from '@fable/common/dist/api-contract';
import { CaretRightOutlined } from '@ant-design/icons';
import { IGlobalConfig } from '@fable/common/dist/types';
import * as Tags from './styled';
import EditorTab from './editor-tab';
import {
  DemoHubPreviewEnumMsgType,
  DemoHubPreviewMsgData,
  IDemoHubConfig, OnDemoHubConfigChangeFn,
  P_RespDemoHub
} from '../../types';
import { EditorCtx } from './ctx';
import { P_RespTour } from '../../entity-processor';
import Header from '../header';
import PreviewHeaderOptions from '../preview-demo-hub/preview-header-options';
import * as GTags from '../../common-styled';
import LeadformTab from './lead-form-tab';
import DeveloperTab from './developer-tab';
import DemoHubShareModal from '../demo-hubs-list/share-modal';

interface Props {
  onConfigChange: OnDemoHubConfigChangeFn;
  data: P_RespDemoHub;
  config: IDemoHubConfig;
  tours: P_RespTour[];
  org: RespOrg | null;
  principal: RespUser | null;
  publishDemoHub: (demoHub: P_RespDemoHub) => Promise<boolean>,
  loadDemoHubConfig: (demoHub: P_RespDemoHub) => Promise<IDemoHubConfig>;
  updateDemoHubProp: <T extends keyof ReqDemoHubPropUpdate>(rid: string, demoHubProp: T, value: ReqDemoHubPropUpdate[T]) => void;
  getTourData : (tourRid : string) => Promise<P_RespTour>,
  getUpdatedAllTours : () => void;
  globalConfig : IGlobalConfig
}

function DemoHubEditor(props: Props): JSX.Element {
  const [config, setConfig] = useState(props.config);
  const [previewUrl, setPreviewUrl] = useState(`seeall/${props.data.rid}?lp=true`);
  const [showShareModal, setShareModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const isInited = useRef<boolean>(false);

  const ctxValue = useMemo(
    () => ({
      config,
      onConfigChange: setConfig,
      tours: props.tours.filter(tour => tour.lastPublishedDate),
      data: props.data,
      setPreviewUrl,
      updateDemoHubProp: props.updateDemoHubProp,
      getTourData: props.getTourData,
      getUpdatedAllTours: props.getUpdatedAllTours,
      globalConfig: props.globalConfig
    }),
    [config, props.tours, props.globalConfig]
  );

  useEffect(() => {
    setPreviewUrl(`seeall/${props.data.rid}?lp=true`);
  }, [props.data.rid]);

  useEffect(() => {
    setConfig(props.config);
  }, [props.config]);

  useEffect(() => {
    if (isInited.current) {
      props.onConfigChange(config);
    } else {
      isInited.current = true;
    }
    sendConfigToPreview();
  }, [config]);

  useEffect(() => {
    window.addEventListener('message', messageEventListener);
    return () => window.removeEventListener('message', messageEventListener);
  }, [config]);

  const messageEventListener = (e: MessageEvent): void => {
    const msgData: DemoHubPreviewMsgData = e.data;
    switch (msgData.type) {
      case DemoHubPreviewEnumMsgType.PREVIEW_INIT: {
        sendConfigToPreview();
        break;
      }
      default: {
        break;
      }
    }
  };

  const sendConfigToPreview = (): void => {
    iframeRef.current?.contentWindow?.postMessage({
      type: DemoHubPreviewEnumMsgType.UPDATE_CONFIG,
      config,
    }, '*');
  };

  return (
    <EditorCtx.Provider value={ctxValue}>
      <GTags.DemoHeaderCon>
        <Header
          tour={null}
          org={props.org}
          showCalendar
          showOnboardingGuides
          navigateToWhenLogoIsClicked="/demo-hubs"
          demoHub={props.data}
          titleElOnLeft={(
            <div
              style={{ display: 'flex', alignItems: 'center' }}
            >
              <span className="overflow-ellipsis">
                {props.data.displayName}
              </span>
            </div>
          )}
          rightElGroups={[(
            <AntButton
              id="step-1"
              size="small"
              className="sec-btn typ-btn"
              type="default"
              icon={<CaretRightOutlined
                style={{ color: 'white' }}
              />}
              style={{
                padding: '0 0.8rem',
                height: '30px',
                borderRadius: '16px',
                backgroundColor: '#160245',
                color: 'white',
                fontSize: '1rem',
                fontWeight: 500
              }}
              onClick={(e) => {
                window.open(`/preview/hub/${props.data.rid}`)?.focus();
              }}
            >
              Preview
            </AntButton>
          )]}
          principal={props.principal}
          publishOptions={<PreviewHeaderOptions
            showShareModal={showShareModal}
            setShowShareModal={(shareModal: boolean) => setShareModal(shareModal)}
            publishDemoHub={props.publishDemoHub}
            demoHub={props.data}
            setSelectedDisplaySize={(selectedDisplaySize) => {}}
            isPublishing={isPublishing}
            setIsPublishing={setIsPublishing}
          />}
        />
      </GTags.DemoHeaderCon>
      <Tags.Con>
        <Tags.Sidepanel>
          <Tabs
            centered
            defaultActiveKey="editor"
            items={[
              {
                label: <div className="typ-reg">Editor</div>,
                children: <EditorTab />,
                key: 'editor',
              },
              {
                label: <div className="typ-reg">Lead form</div>,
                children: <LeadformTab />,
                key: 'lead-form',
              },
              {
                label: <div className="typ-reg">Developer</div>,
                children: <DeveloperTab />,
                key: 'develop',
              },
            ]}
          />
        </Tags.Sidepanel>
        <Tags.Main>
          <Tags.PreviewCon>
            <Tags.PreviewIFrame
              src={`${window.location.origin}/hub/${previewUrl}`}
              title="Preview"
              ref={iframeRef}
            />
          </Tags.PreviewCon>
        </Tags.Main>
        <DemoHubShareModal
          demoHub={props.data}
          isModalOpen={showShareModal}
          closeModal={() => setShareModal(false)}
          openModal={() => setShareModal(true)}
          isPublishing={isPublishing}
          setIsPublishing={(val) => setIsPublishing(val)}
          publishDemoHub={props.publishDemoHub}
          loadDemoHubConfig={props.loadDemoHubConfig}
        />
      </Tags.Con>
    </EditorCtx.Provider>
  );
}

export default DemoHubEditor;
