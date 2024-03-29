import React, { RefObject, useEffect, useRef, useState } from 'react';
import { DeleteOutlined, LinkOutlined, ReloadOutlined, SaveOutlined, UploadOutlined } from '@ant-design/icons';
import { Tabs, Tooltip } from 'antd';
import { ITourLoaderData } from '@fable/common/dist/types';
import * as Tags from './styled';
import Loader from './loader';
import FileInput from '../file-input';
import Input from '../input';
import { uploadFileToAws } from '../screen-editor/utils/upload-img-to-aws';
import { P_RespTour } from '../../entity-processor';
import FableLogo from '../../assets/fable_logo_light_bg.png';
import CloseIcon from '../../assets/tour/close.svg';

interface Props {
  data: ITourLoaderData,
  tour: P_RespTour,
  closeEditor: () => void,
  recordLoaderData: (tour: P_RespTour, loader: ITourLoaderData) => void,
  isAutoSaving: boolean;
  startAutosavingLoader: () => void;
}

const DEFAULT_LOGO_URL = 'https://s3.amazonaws.com/app.sharefable.com/favicon.png';
function LoaderEditor(props: Props): JSX.Element {
  const [loaderData, setLoaderData] = useState<ITourLoaderData>(props.data);
  const [isLogoUrlEmpty, setIsLogoUrlEmpty] = useState(false);
  const [isLogoUrlChanged, setIsLogoUrlChanged] = useState(false);
  const logoLinkIpRef = useRef<HTMLInputElement>();
  const initialLogoLink = useRef('');

  useEffect(() => {
    initialLogoLink.current = props.data.logo.url;
  }, []);

  useEffect(() => {
    if (JSON.stringify(props.data) !== JSON.stringify(loaderData)) {
      props.startAutosavingLoader();
      props.recordLoaderData(props.tour, loaderData);
    }
    if ((loaderData.logo.url !== initialLogoLink.current) && (loaderData.logo.url !== DEFAULT_LOGO_URL)) {
      setIsLogoUrlChanged(true);
    }
  }, [loaderData]);

  const setGifOrLottieFile = async (e: React.ChangeEvent<HTMLInputElement>, type: 'gif' | 'lottie'): Promise<void> => {
    if (e.target.files) {
      const file = e.target.files[0];
      if (file) {
        props.startAutosavingLoader();
        const fileUrl = await uploadFileToAws(e.target.files[0]);
        setLoaderData(prev => ({ ...prev, loader: { url: fileUrl, type } }));
      }
    }
  };

  return (
    <Tags.FullScreenCon>
      <Tags.EditorWrapper>
        <Tags.Header>
          <Tags.FableLogo alt="" src={FableLogo} />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'end',
              padding: '0 0.5rem 0.25rem 0',
              animation: props.isAutoSaving ? 'blink 2s linear infinite' : 'none',
              visibility: props.isAutoSaving ? 'visible' : 'hidden'
            }}
            >
              <SaveOutlined style={{ color: '#8A8A8A', fontSize: '1.45rem' }} />
            </div>
            <Tags.CloseIcon alt="" src={CloseIcon} onClick={props.closeEditor} />
          </div>
        </Tags.Header>
        <Tags.HeaderTitle>Design your loader </Tags.HeaderTitle>
        <Tags.EditorCon>
          <Tags.PreviewPanel>
            <Tags.PreviewCon>
              <Loader data={loaderData} />
            </Tags.PreviewCon>
          </Tags.PreviewPanel>
          <Tags.EditPanel>
            <Tags.FieldCon>
              <Tags.FieldName>
                <p>Logo</p>
              </Tags.FieldName>
              <Tabs items={[
                {
                  key: '1',
                  label: <><UploadOutlined />Upload</>,
                  children: (
                    <Tags.FileInputCon>
                      <FileInput
                        accept="image/png, image/jpeg, image/webp, image/svg+xml, image/gif"
                        onChange={async (e) => {
                          if (e.target.files) {
                            const file = e.target.files[0];
                            if (file) {
                              props.startAutosavingLoader();
                              const fileUrl = await uploadFileToAws(e.target.files[0]);
                              setLoaderData(prev => ({ ...prev, logo: { url: fileUrl } }));
                              if (logoLinkIpRef.current) logoLinkIpRef.current.value = fileUrl;
                              setIsLogoUrlEmpty(false);
                            }
                          }
                        }}
                      />
                      {isLogoUrlChanged && (
                      <div>
                        <Tooltip title="Revert logo" placement="left">
                          <ReloadOutlined
                            style={{ fontSize: '1.2rem' }}
                            onClick={() => {
                              setIsLogoUrlChanged(false);
                              setLoaderData(prev => ({ ...prev, logo: { url: DEFAULT_LOGO_URL } }));
                            }}
                          />
                        </Tooltip>
                      </div>
                      )}
                    </Tags.FileInputCon>
                  ),
                },
                {
                  key: '2',
                  label: <><LinkOutlined />Link</>,
                  children: (
                    <div style={{ marginTop: '0.45rem' }}>
                      <Input
                        label="Logo link"
                        defaultValue={loaderData.logo.url}
                        innerRef={logoLinkIpRef as unknown as RefObject<HTMLInputElement>}
                        onChange={async (e) => {
                          setIsLogoUrlEmpty(false);
                          if (!e.target.value || !e.target.value.trim()) {
                            setIsLogoUrlEmpty(true);
                            return;
                          }
                          setLoaderData(prev => ({ ...prev, logo: { url: e.target.value } }));
                        }}
                      />
                    </div>
                  ),
                },
              ]}
              />
              {isLogoUrlEmpty && <Tags.Error>Logo is required</Tags.Error>}
            </Tags.FieldCon>
            <Tags.FieldCon>
              <Tags.FieldName>
                <p>Upload Gif or Lottie</p>
              </Tags.FieldName>
              <Tabs items={[
                {
                  key: '1',
                  label: <>Gif</>,
                  children: (
                    <Tags.FileInputCon>
                      <FileInput
                        accept="image/gif"
                        label="Upload Gif:"
                        onChange={(e) => setGifOrLottieFile(e, 'gif')}
                      />
                      {loaderData.loader.url && (
                      <div>
                        <Tooltip title={`Delete ${loaderData.loader.type} loader`} placement="left">
                          <DeleteOutlined
                            style={{ fontSize: '1.2rem' }}
                            onClick={() => setLoaderData(prev => ({ ...prev, loader: { url: '', type: '' } }))}
                          />
                        </Tooltip>
                      </div>
                      )}
                    </Tags.FileInputCon>
                  ),
                },
                {
                  key: '2',
                  label: <>Lottie file</>,
                  children: (
                    <Tags.FileInputCon>
                      <FileInput
                        accept="application/json"
                        label="Upload Lottie:"
                        onChange={(e) => setGifOrLottieFile(e, 'lottie')}
                      />
                      {loaderData.loader.url && (
                      <div>
                        <Tooltip title={`Delete ${loaderData.loader.type} loader`} placement="left">
                          <DeleteOutlined
                            style={{ fontSize: '1.2rem' }}
                            onClick={() => setLoaderData(prev => ({ ...prev, loader: { url: '', type: '' } }))}
                          />
                        </Tooltip>
                      </div>
                      )}
                    </Tags.FileInputCon>
                  ),
                },
              ]}
              />
            </Tags.FieldCon>
          </Tags.EditPanel>
        </Tags.EditorCon>

      </Tags.EditorWrapper>
    </Tags.FullScreenCon>
  );
}

export default LoaderEditor;
