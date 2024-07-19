import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Input as AntInput, Spin, notification } from 'antd';
import {
  AnnotationButtonSize,
  AnnotationButtonStyle,
  AnnotationSelectionEffect,
  AnnotationSelectionEffectType,
  AnnotationSelectionShape,
  AnnotationSelectionShapeType,
  IAnnotationConfig,
  IGlobalConfig,
  ITourDataOpts,
  LoadingStatus
} from '@fable/common/dist/types';
import { getSampleConfig } from '@fable/common/dist/utils';
import { LoadingOutlined } from '@ant-design/icons';
import FileInput from '../file-input';
import Input from '../input';
import * as GTags from '../../common-styled';
import Button from '../button';
import { InputNumberBorderRadius, InputText, StyledSwitch } from '../screen-editor/styled';
import CaretOutlined from '../icons/caret-outlined';
import * as Tags from './styled';
import { updateAnnConfigForPreview, updateGlobalConfig, updateTourOptsForPreview } from './utils';
import { getWebFonts } from '../screen-editor/utils/get-web-fonts';
import CloseOutlined from '../icons/close-outlines';
import { ABtn } from '../annotation/styled';
import { generateCSSSelectorFromText } from '../screen-editor/utils/css-styles';
import { AnnotationContent } from '../annotation';
import { getThemeAnnotationOpts } from '../../container/create-tour/utils';
import { debounce, getColorContrast, isFeatureAvailable } from '../../utils';
import FocusBubble from '../annotation/focus-bubble';
import useUploadFileToAws from '../../hooks/useUploadFileToAws';
import { FeatureForPlan } from '../../plans';
import UpgradeIcon from '../upgrade/icon';
import UpgradeModal from '../upgrade/upgrade-modal';
import { P_RespSubscription } from '../../entity-processor';
import { FeatureAvailability } from '../../types';

interface Props {
  globalConfig: IGlobalConfig;
  updateGlobalConfig: (updatedGlobalConfig: IGlobalConfig) => void;
  republishAllPublishedDemos: () => Promise<void>;
  totalPublishedDemos: number | null;
  totalRepublishedDemos: number;
  republishingStatus: LoadingStatus;
  featurePlan: FeatureForPlan | null;
  subs: P_RespSubscription | null;
}

export default function Editor(props: Props): JSX.Element {
  const [api, contextHolder] = notification.useNotification();
  const [gConfig, setGConfig] = useState(props.globalConfig);
  const [webFonts, setWebFonts] = useState<string[]>([]);
  const [sampleAnnConfig, setSampleAnnConfig] = useState<IAnnotationConfig>(() => getSampleConfig('$', '', gConfig));
  const [sampleTourOpts, setSampleTourOpts] = useState<ITourDataOpts>(() => getThemeAnnotationOpts(
    gConfig.annBodyBgColor,
    gConfig,
    gConfig.annBorderRadius,
  ));
  const [upgradeModalDetail, setUpgradeModalDetail] = useState({
    open: false,
    isInBeta: false
  });
  const isFirstRenderRef = useRef(true);
  const { uploadFile, loading: isCompanyLogoUploading } = useUploadFileToAws();

  const debouncedUpdateGlobalConfig = useCallback(
    debounce((gc) => props.updateGlobalConfig(gc), 2000),
    [props.updateGlobalConfig]
  );

  useEffect(() => {
    setSampleAnnConfig(updateAnnConfigForPreview(sampleAnnConfig, gConfig));
    setSampleTourOpts(updateTourOptsForPreview(sampleTourOpts, gConfig));

    if (!isFirstRenderRef.current) {
      debouncedUpdateGlobalConfig(gConfig);
    }

    isFirstRenderRef.current = false;
  }, [gConfig.monoIncKey]);

  useEffect(() => {
    const linkHref = `https://fonts.googleapis.com/css?family=${gConfig.fontFamily.replace(/\s+/g, '+')}`;

    const existingLinks = Array.from(document.head.querySelectorAll('link[gFont]')) as HTMLLinkElement[];
    const hasExistingLink = existingLinks.some((link) => link.href === linkHref);
    if (hasExistingLink) return;

    existingLinks.forEach((link) => {
      link.remove();
    });

    const link = document.createElement('link');
    link.href = linkHref;
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.setAttribute('gFont', '');

    document.head.prepend(link);
  }, [gConfig.fontFamily]);

  const loadWebFonts = async (): Promise<void> => {
    const data = await getWebFonts();
    setWebFonts(data.items);
  };

  const handleCompanyLogoImgChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    if (!e.target.files || e.target.files.length < 1) return;
    const selectedImage = e.target.files[0];
    const newImageUrl = await uploadFile(selectedImage);
    setGConfig(gc => updateGlobalConfig(gc, 'logo', newImageUrl));
  };

  const handleRepublishAllDemosClick = async (): Promise<void> => {
    api.info({
      message: 'Republishing demos...',
      description:
        'All the published demos are being republished with updated Global Styles. Do not close this page.',
      duration: 10
    });

    await props.republishAllPublishedDemos();

    api.success({
      message: 'Demos republished!',
      description:
        'All your published demos have been republished successfully with the updated Global Styles',
      duration: 10
    });
  };
  const watermarkFeatureAvailable = isFeatureAvailable(props.featurePlan, 'no_watermark');

  return (
    <div>
      {contextHolder}
      {/* Info bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}
      >
        <div
          className="typ-sm"
        >
          If you make any changes to global styles, the changes will not be reflected to
          already published demo unless you republish the demos again.
        </div>
        <Button
          style={{
            minWidth: '250px',
            padding: '0.75rem 0.25rem'
          }}
          onClick={handleRepublishAllDemosClick}
          disabled={props.republishingStatus === LoadingStatus.InProgress}
        >
          {props.republishingStatus === LoadingStatus.InProgress
            ? (
              <>
                Republishing {props.totalRepublishedDemos} of {props.totalPublishedDemos} demos
                <Spin style={{ color: '#fff' }} indicator={<LoadingOutlined spin color="#fff" />} size="small" />
              </>
            ) : (
              'Republish all published demos'
            )}
        </Button>
      </div>

      {/* Common section */}
      <Tags.SecCon
        style={{
          marginTop: '1rem',
          borderTopLeftRadius: '8px',
          borderTopRightRadius: '8px',
        }}
      >

        {/* Common section header */}
        <Tags.CommonSecActionCon>
          <div
            className="typ-h2"
          >
            Common
          </div>
          <div
            className="typ-sm"
          >
            Common global styles that are used across demo components
          </div>
        </Tags.CommonSecActionCon>

        {/* Common section options */}
        <Tags.SectionOptionsCon
          style={{
            flexDirection: 'column',
          }}
        >
          <Tags.CommonSecOptionCon>
            <Tags.OptionTitle className="typ-reg">
              Company Logo
            </Tags.OptionTitle>

            <div
              style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'center',
              }}
            >
              <Tags.CommonSecActionCon
                style={{ minWidth: '500px' }}
              >
                <FileInput
                  accept="image/png, image/jpeg, image/webp, image/svg+xml"
                  onChange={handleCompanyLogoImgChange}
                />
                <div
                  className="typ-sm"
                >
                  Your logo will be used in pages where the demo is hosted
                </div>
              </Tags.CommonSecActionCon>
              {isCompanyLogoUploading ? (
                <div
                  style={{
                    height: '50px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Spin />
                </div>) : <img
                  height={36}
                  alt=""
                  src={gConfig.logo}
                />}
            </div>
          </Tags.CommonSecOptionCon>

          <Tags.CommonSecOptionCon>
            <Tags.OptionTitle className="typ-reg">
              Company URL
            </Tags.OptionTitle>

            <Tags.CommonSecActionCon>
              <Input
                type="url"
                label=""
                value={gConfig.companyUrl}
                onChange={e => setGConfig(gc => updateGlobalConfig(gc, 'companyUrl', e.target.value))}
              />
              <div
                className="typ-sm"
              >
                Company URL will be used to add a hreflink to the logo where the demo is hosted
              </div>
            </Tags.CommonSecActionCon>
          </Tags.CommonSecOptionCon>

          <Tags.CommonSecOptionCon>
            <Tags.OptionTitle className="typ-reg">
              Demo loading text
            </Tags.OptionTitle>

            <Tags.CommonSecActionCon>
              <Input
                value={gConfig.demoLoadingText}
                label=""
                onChange={e => setGConfig(gc => updateGlobalConfig(gc, 'demoLoadingText', e.target.value))}
              />
              <div
                className="typ-sm"
              >
                This is demo loading text
              </div>
            </Tags.CommonSecActionCon>
          </Tags.CommonSecOptionCon>

          <Tags.CommonSecOptionCon>
            <Tags.OptionTitle className="typ-reg">
              Font Family
            </Tags.OptionTitle>

            <Tags.CommonSecActionCon>
              <GTags.FableSelect
                className="typ-ip"
                bordered={false}
                suffixIcon={<CaretOutlined dir="down" />}
                defaultValue={gConfig.fontFamily}
                placeholder="Select font"
                onClick={loadWebFonts}
                notFoundContent="No font found"
                showSearch
                allowClear={{ clearIcon: <CloseOutlined bgColor="white" /> }}
                options={webFonts.map(v => ({
                  value: v,
                  label: v,
                }))}
                onChange={(e) => {
                  if (e) {
                    setGConfig(gc => updateGlobalConfig(gc, 'fontFamily', e as string));
                  } else {
                    setGConfig(gc => updateGlobalConfig(gc, 'fontFamily', ''));
                  }
                }}
              />
              <div
                className="typ-sm"
              >
                If the font is unset, font will be inherited from your recorded page
              </div>
            </Tags.CommonSecActionCon>
          </Tags.CommonSecOptionCon>

          <div>
            <Tags.OptionTitle className="typ-reg">
              CTA Style
            </Tags.OptionTitle>
            <div
              className="typ-sm"
            >
              Configure styles for CTAs in annotation, modules, live page
            </div>

            <div
              style={{
                display: 'flex',
                marginTop: '1rem'
              }}
            >
              <div
                style={{
                  flex: '1',
                  borderRight: '1px solid lightgray',
                  padding: '0 1rem'
                }}
              >
                <div>
                  <div>Button size</div>
                  <GTags.FableSelect
                    className="typ-ip"
                    size="small"
                    bordered={false}
                    suffixIcon={<CaretOutlined dir="down" />}
                    defaultValue={gConfig.ctaSize}
                    options={Object.values(AnnotationButtonSize).map(v => ({
                      value: v,
                      label: v,
                    }))}
                    onSelect={(val) => {
                      setGConfig(gc => updateGlobalConfig(gc, 'ctaSize', val as AnnotationButtonSize));
                    }}
                  />
                </div>

                <div>
                  <div>Primary color</div>
                  <GTags.ColorPicker
                    className="typ-ip"
                    showText={(color) => color.toHexString()}
                    onChangeComplete={e => {
                      setGConfig(gc => updateGlobalConfig(gc, 'primaryColor', e.toHexString()));
                    }}
                    defaultValue={gConfig.primaryColor}
                  />
                </div>
              </div>

              <div
                style={{
                  flex: '1',
                  padding: '0rem 1rem',
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'center',
                  marginTop: '1rem',
                }}
              >
                <ABtn
                  bg={gConfig.annBodyBgColor}
                  className={`f-${generateCSSSelectorFromText('Next')}-btn f-ann-btn`}
                  noPad={false}
                  btnStyle={AnnotationButtonStyle.Primary}
                  color={gConfig.primaryColor}
                  size={gConfig.ctaSize}
                  fontFamily={gConfig.fontFamily}
                  btnLayout="default"
                  borderRadius={gConfig.annBorderRadius}
                >
                  Primary
                </ABtn>

                <div style={{
                  backgroundColor: `${getColorContrast(gConfig.annBodyBgColor) === 'light' ? '#fff' : '#424242'}`,
                  padding: '1rem',
                  borderRadius: '8px',
                }}
                >
                  <ABtn
                    bg={gConfig.annBodyBgColor}
                    className={`f-${generateCSSSelectorFromText('Next')}-btn f-ann-btn`}
                    noPad={false}
                    btnStyle={AnnotationButtonStyle.Outline}
                    color={gConfig.primaryColor}
                    size={gConfig.ctaSize}
                    fontFamily={gConfig.fontFamily}
                    btnLayout="default"
                    borderRadius={gConfig.annBorderRadius}
                  >
                    Outline
                  </ABtn>

                  <ABtn
                    bg={gConfig.annBodyBgColor}
                    className={`f-${generateCSSSelectorFromText('Next')}-btn f-ann-btn`}
                    noPad={false}
                    btnStyle={AnnotationButtonStyle.Link}
                    color={gConfig.primaryColor}
                    size={gConfig.ctaSize}
                    fontFamily={gConfig.fontFamily}
                    btnLayout="default"
                    borderRadius={gConfig.annBorderRadius}
                  >
                    Link
                  </ABtn>
                </div>
              </div>
            </div>
          </div>
        </Tags.SectionOptionsCon>
      </Tags.SecCon>

      {/* Common section */}
      <Tags.SecCon
        style={{
          borderBottomLeftRadius: '8px',
          borderBottomRightRadius: '8px',
        }}
      >

        {/* Annotation style section header */}
        <Tags.CommonSecActionCon>
          <div
            className="typ-h2"
          >
            Annotation Style
          </div>
          <div
            className="typ-sm"
          >
            Style of annotation on the demo. You can override these styles from inside the demos.
          </div>
        </Tags.CommonSecActionCon>

        {/* Common section options */}
        <Tags.SectionOptionsCon>
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            <Tags.CommonSecActionCon>
              <Tags.OptionTitle className="typ-reg">
                Body Background Color
              </Tags.OptionTitle>

              <GTags.ColorPicker
                className="typ-ip"
                showText={(color) => color.toHexString()}
                onChangeComplete={e => {
                  setGConfig(gc => updateGlobalConfig(gc, 'annBodyBgColor', e.toHexString()));
                }}
                defaultValue={gConfig.annBodyBgColor}
              />
            </Tags.CommonSecActionCon>

            <Tags.CommonSecActionCon>
              <Tags.OptionTitle className="typ-reg">
                Body Border Color
              </Tags.OptionTitle>

              <GTags.ColorPicker
                className="typ-ip"
                showText={(color) => color.toHexString()}
                onChangeComplete={e => {
                  setGConfig(gc => updateGlobalConfig(gc, 'annBorderColor', e.toHexString()));
                }}
                defaultValue={gConfig.annBorderColor}
              />
            </Tags.CommonSecActionCon>

            <Tags.CommonSecActionCon>
              <Tags.OptionTitle className="typ-reg">
                Font color
              </Tags.OptionTitle>

              <GTags.ColorPicker
                className="typ-ip"
                showText={(color) => color.toHexString()}
                onChangeComplete={e => {
                  setGConfig(gc => updateGlobalConfig(gc, 'fontColor', e.toHexString()));
                }}
                defaultValue={gConfig.fontColor}
              />
            </Tags.CommonSecActionCon>

            <Tags.CommonSecActionCon>
              <Tags.OptionTitle className="typ-reg">
                Container Border Radius
              </Tags.OptionTitle>

              <InputNumberBorderRadius
                className="typ-ip"
                min={0}
                addonAfter="px"
                style={{
                  height: '40px',
                  width: '100%'
                }}
                defaultValue={gConfig.annBorderRadius}
                onChange={(e) => {
                  setGConfig(gc => updateGlobalConfig(gc, 'annBorderRadius', e as number));
                }}
              />
            </Tags.CommonSecActionCon>

            <Tags.CommonSecActionCon>
              <Tags.OptionTitle className="typ-reg">
                Container Padding
              </Tags.OptionTitle>

              <InputText
                style={{
                  height: '40px',
                  width: '100%'
                }}
                className="typ-ip"
                bordered={false}
                placeholder="Enter padding"
                defaultValue={gConfig.annConPad}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.keyCode === 13) {
                    setGConfig(gc => updateGlobalConfig(gc, 'annConPad', (e.target as HTMLInputElement).value));
                  }
                }}
                onChange={(e) => {
                  setGConfig(gc => updateGlobalConfig(gc, 'annConPad', e.target.value));
                }}
              />
            </Tags.CommonSecActionCon>

            <Tags.CommonSecActionCon>
              {/* TODO show dummy selection to show sel col and sel eff */}
              <Tags.OptionTitle className="typ-reg">
                Selection Color
              </Tags.OptionTitle>

              <GTags.ColorPicker
                className="typ-ip"
                showText={(color) => color.toHexString()}
                defaultValue={gConfig.selColor}
                onChangeComplete={e => {
                  setGConfig(gc => updateGlobalConfig(gc, 'selColor', e.toHexString()));
                }}
              />
            </Tags.CommonSecActionCon>

            <Tags.CommonSecActionCon>
              <Tags.OptionTitle className="typ-reg">
                Selection Shape
              </Tags.OptionTitle>

              <GTags.FableSelect
                className="typ-ip"
                size="small"
                bordered={false}
                suffixIcon={<CaretOutlined dir="down" />}
                defaultValue={gConfig.selShape}
                options={AnnotationSelectionShape.map(v => ({
                  value: v,
                  label: v.charAt(0).toUpperCase() + v.slice(1),
                }))}
                onChange={(value) => {
                  setGConfig(gc => updateGlobalConfig(gc, 'selShape', value as AnnotationSelectionShapeType));
                }}

              />
            </Tags.CommonSecActionCon>

            <Tags.CommonSecActionCon>
              <Tags.OptionTitle className="typ-reg">
                Selection Effect
              </Tags.OptionTitle>

              <GTags.FableSelect
                className="typ-ip"
                size="small"
                bordered={false}
                suffixIcon={<CaretOutlined dir="down" />}
                title={gConfig.selShape === 'pulse' ? 'Mask type is set to `regular` for Pulse shaped box' : ''}
                defaultValue={gConfig.selEffect}
                options={AnnotationSelectionEffect.map(v => ({
                  value: v,
                  label: v.charAt(0).toUpperCase() + v.slice(1),
                }))}
                onChange={(value) => {
                  setGConfig(gc => updateGlobalConfig(gc, 'selEffect', value as AnnotationSelectionEffectType));
                }}
              />
            </Tags.CommonSecActionCon>

            <div
              style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'center'
              }}
            >
              <Tags.OptionTitle className="typ-reg">
                Show step number
              </Tags.OptionTitle>

              <StyledSwitch
                size="small"
                defaultChecked={gConfig.showStepNo}
                onChange={(e) => {
                  setGConfig(gc => updateGlobalConfig(gc, 'showStepNo', e));
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'center'
              }}

            >
              <Tags.OptionTitle
                className="typ-reg"
                onClick={() => {
                  if (!watermarkFeatureAvailable.isAvailable) {
                    setUpgradeModalDetail({ isInBeta: watermarkFeatureAvailable.isInBeta, open: true });
                  }
                }}
                style={{ display: 'flex', gap: '0.25rem' }}
              >
                <div>Show watermark</div>
                {!watermarkFeatureAvailable.isAvailable && (
                  <UpgradeIcon
                    isInBeta={watermarkFeatureAvailable.isInBeta}
                  />
                )}
              </Tags.OptionTitle>

              <StyledSwitch
                size="small"
                style={{ backgroundColor: gConfig.showWatermark ? '#7567FF' : '#BDBDBD' }}
                defaultChecked={gConfig.showWatermark}
                checked={gConfig.showWatermark}
                onChange={(e) => {
                  if (!watermarkFeatureAvailable.isAvailable) {
                    setUpgradeModalDetail({ isInBeta: watermarkFeatureAvailable.isInBeta, open: true });
                    return;
                  }
                  setGConfig(gc => updateGlobalConfig(gc, 'showWatermark', e));
                }}
              />
            </div>
          </div>

          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            <div
              style={{
                minHeight: '210px'
              }}
            >
              <Tags.AnnotationPreviewCon
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginTop: '1.5rem',
                  transform: 'scale(0.75)',
                  transformOrigin: 'top center',
                }}
                fontFamily={gConfig.fontFamily}
              >
                <AnnotationContent
                  config={sampleAnnConfig}
                  opts={sampleTourOpts}
                  isInDisplay
                  width={350}
                  dir="l"
                  tourId={0}
                  top={0}
                  left={0}
                  navigateToAdjacentAnn={() => {}}
                  isThemeAnnotation
                />

                {gConfig.selShape === 'pulse' && <FocusBubble
                  diameter={18}
                  style={{
                    position: 'absolute',
                    bottom: -30,
                    left: '47%',
                  }}
                  selColor={gConfig.selColor}
                />}

                <svg
                  width="30px"
                  height="15px"
                  viewBox="-100 0 200 100"
                  style={{
                    transform: 'rotate(180deg) translateY(-100%)',
                    verticalAlign: 'top',
                    filter: 'none',
                    position: 'absolute',
                    bottom: 0,
                  }}
                >
                  <path
                    className="fab-arr-path"
                    fill={gConfig.annBorderColor}
                    d="M-100 100 L-14 14 C-14 14, 0 1, 14 14 L14 14 L100 100 Z"
                  />
                </svg>

                {gConfig.selShape === 'box' && <Tags.DummyElMask
                  shouldAnimate={gConfig.selEffect === 'blinking'}
                  selColor={gConfig.selColor}
                />}
              </Tags.AnnotationPreviewCon>
            </div>

            {/* Bottom Sec */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem'
              }}
            >

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
              >
                <div>
                  <Tags.OptionTitle className="typ-reg">
                    Next button
                  </Tags.OptionTitle>
                  <div
                    className="typ-sm"
                  >
                    This button is provided by Fable to navigate to next step
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  <div
                    style={{
                      width: '100%'
                    }}
                  >
                    <Tags.OptionTitle className="typ-reg">
                      Button Text
                    </Tags.OptionTitle>

                    <AntInput
                      className="typ-ip"
                      size="small"
                      bordered={false}
                      style={{
                        background: '#fff',
                        borderRadius: '8px',
                        height: '40px',
                        border: '1px solid #E8E8E8',
                      }}
                      placeholder="Button text"
                      defaultValue={gConfig.nextBtnText}
                      onChange={e => {
                        setGConfig(gc => updateGlobalConfig(gc, 'nextBtnText', e.target.value));
                      }}
                    />
                  </div>

                  <div
                    style={{
                      width: '100%'
                    }}
                  >
                    <Tags.OptionTitle className="typ-reg">
                      Button Type
                    </Tags.OptionTitle>

                    <GTags.FableSelect
                      size="small"
                      bordered={false}
                      suffixIcon={<CaretOutlined dir="down" />}
                      defaultValue={gConfig.nextBtnStyle}
                      options={Object.values(AnnotationButtonStyle).map(v => ({
                        value: v,
                        label: v,
                      }))}
                      onSelect={(val) => {
                        setGConfig(gc => updateGlobalConfig(gc, 'nextBtnStyle', val as AnnotationButtonStyle));
                      }}
                    />
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
              >
                <div>
                  <Tags.OptionTitle className="typ-reg">
                    Prev button
                  </Tags.OptionTitle>
                  <div
                    className="typ-sm"
                  >
                    This button is provided by Fable to navigate to prev step
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  <div
                    style={{
                      width: '100%'
                    }}
                  >
                    <Tags.OptionTitle className="typ-reg">
                      Button Text
                    </Tags.OptionTitle>

                    <AntInput
                      className="typ-ip"
                      size="small"
                      bordered={false}
                      style={{
                        background: '#fff',
                        borderRadius: '8px',
                        height: '40px',
                        border: '1px solid #E8E8E8',
                      }}
                      placeholder="Button text"
                      defaultValue={gConfig.prevBtnText}
                      onBlur={e => {
                        setGConfig(gc => updateGlobalConfig(gc, 'prevBtnText', e.target.value));
                      }}
                    />
                  </div>

                  <div
                    style={{
                      width: '100%'
                    }}
                  >
                    <Tags.OptionTitle className="typ-reg">
                      Button Type
                    </Tags.OptionTitle>

                    <GTags.FableSelect
                      size="small"
                      bordered={false}
                      suffixIcon={<CaretOutlined dir="down" />}
                      defaultValue={gConfig.prevBtnStyle}
                      options={Object.values(AnnotationButtonStyle).map(v => ({
                        value: v,
                        label: v,
                      }))}
                      onSelect={(val) => {
                        setGConfig(gc => updateGlobalConfig(gc, 'prevBtnStyle', val as AnnotationButtonStyle));
                      }}
                    />
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
              >
                <div>
                  <Tags.OptionTitle className="typ-reg">
                    Default Custom CTA
                  </Tags.OptionTitle>
                  <div
                    className="typ-sm"
                  >
                    CTA at the end of the demo
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                    }}
                  >
                    <div
                      style={{
                        width: '100%'
                      }}
                    >
                      <Tags.OptionTitle className="typ-reg">
                        Button Text
                      </Tags.OptionTitle>

                      <AntInput
                        className="typ-ip"
                        size="small"
                        bordered={false}
                        style={{
                          background: '#fff',
                          borderRadius: '8px',
                          height: '40px',
                          border: '1px solid #E8E8E8',
                        }}
                        placeholder="Button text"
                        defaultValue={gConfig.customBtn1Text}
                        onBlur={e => {
                          setGConfig(gc => updateGlobalConfig(gc, 'customBtn1Text', e.target.value));
                        }}
                      />
                    </div>

                    <div
                      style={{
                        width: '100%'
                      }}
                    >
                      <Tags.OptionTitle className="typ-reg">
                        Button Type
                      </Tags.OptionTitle>

                      <GTags.FableSelect
                        size="small"
                        bordered={false}
                        suffixIcon={<CaretOutlined dir="down" />}
                        defaultValue={gConfig.customBtn1Style}
                        options={Object.values(AnnotationButtonStyle).map(v => ({
                          value: v,
                          label: v,
                        }))}
                        onSelect={(val) => {
                          setGConfig(gc => updateGlobalConfig(gc, 'customBtn1Style', val as AnnotationButtonStyle));
                        }}
                      />
                    </div>
                  </div>

                  <Input
                    label="URL to open"
                    className="typ-ip"
                    defaultValue={gConfig.customBtn1URL}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.keyCode === 13) {
                        setGConfig(gc => updateGlobalConfig(gc, 'customBtn1URL', (e.target as HTMLInputElement).value));
                      }
                    }}
                    onChange={(e) => {
                      setGConfig(gc => updateGlobalConfig(gc, 'customBtn1URL', e.target.value));
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </Tags.SectionOptionsCon>
      </Tags.SecCon>
      <UpgradeModal
        showUpgradePlanModal={upgradeModalDetail.open}
        setShowUpgradePlanModal={(open: boolean) => {
          setUpgradeModalDetail((prevS) => ({
            isInBeta: prevS.isInBeta,
            open
          }));
        }}
        subs={props.subs}
        isInBeta={upgradeModalDetail.isInBeta}
      />
    </div>
  );
}
