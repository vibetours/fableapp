import React, { useEffect, useState } from 'react';
import { traceEvent } from '@fable/common/dist/amplitude';
import { CmnEvtProp, ITourDataOpts } from '@fable/common/dist/types';
import { LoadingOutlined, QuestionCircleFilled } from '@ant-design/icons';
import { Collapse, Drawer, Spin, Tooltip } from 'antd';
import { Plan, Status } from '@fable/common/dist/api-contract';
import { timeFormat } from 'd3-time-format';
import * as GTags from '../../common-styled';
import * as Tags from './styled';
import IframeCodeSnippet from '../header/iframe-code-snippet';
import { createIframeSrc, debounce, getValidUrl } from '../../utils';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';
import { P_RespSubscription, P_RespTour } from '../../entity-processor';
import PublishButton from './publish-button';
import { ParamType } from './utm-params-helper';
import UrlCodeShare from './url-code-share';
import FileInput from '../file-input';
import { uploadFileToAws } from '../screen-editor/utils/upload-img-to-aws';
import { IFRAME_BASE_URL, LIVE_BASE_URL } from '../../constants';
import { updateTourDataOpts } from '../annotation/annotation-config-utils';
import { JourneyOrOptsDataChange, SiteData, SiteThemePresets } from '../../types';
import { amplitudeCtaConfigChanged, amplitudeRemoveWatermark } from '../../amplitude';

const dateTimeFormat = timeFormat('%e-%b-%Y %I:%M %p');

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

const collapseTabStyle = {
  marginBottom: 18,
  background: '#f5f5f5',
  borderRadius: '4px',
  border: 'none',
};

interface Props {
  publishTour: (tour: P_RespTour) => Promise<boolean>;
  relativeUrl: string;
  isModalVisible: boolean;
  closeModal: () => void;
  copyUrl: string;
  height: string;
  width: string;
  tour: P_RespTour;
  openShareModal: () => void;
  tourOpts: ITourDataOpts | null;
  onSiteDataChange?: (site: SiteData) => void;
  onOptsDataChange?: JourneyOrOptsDataChange;
  setShowPaymentModal?: (show: boolean) => void;
  subs?: P_RespSubscription | null;
  isPublishing: boolean;
  setIsPublishing: React.Dispatch<React.SetStateAction<boolean>>;
}

const enum SearchParamBy {
  UtmParam,
  UserParam
}

interface CTAInfoProps {
  iframeUrl: string,
  showHelpDrawer: (show: boolean) => void;
  defValue: string,
  handleParamsAdd: (params: ParamType, v: string | undefined)=>void,
  showInlinkLinkExplore: boolean,
  site: SiteData | null,
  updateBrandData: (changeData: Array<[key: keyof SiteData, value: string]>) => void,
  disableEdit:boolean,
  tourOpts: ITourDataOpts | null,
  updateWatermark: (checked: boolean)=> void
  calledFrom: 'cta_share' | 'internal_share'
}

function CTAInfo({ iframeUrl,
  defValue,
  handleParamsAdd,
  showInlinkLinkExplore,
  site,
  showHelpDrawer,
  updateBrandData,
  disableEdit,
  tourOpts,
  updateWatermark,
  calledFrom
}: CTAInfoProps): JSX.Element {
  const [logoUploading, setLogoUploading] = useState(false);

  const debouncedChangeHandler = debounce((property: keyof SiteData, value: string) => {
    updateBrandData([[property, value]]);
    amplitudeCtaConfigChanged(property, value);
  }, 500);

  const debouncedThemeHandler = debounce((property: 'themePreset', theme: keyof typeof SiteThemePresets) => {
    updateBrandData([
      ['themePreset', theme],
      ['bg1', SiteThemePresets[theme].bg1],
      ['bg2', SiteThemePresets[theme].bg2],
      ['headerBg', 'auto'],
    ]);
    amplitudeCtaConfigChanged(property, theme);
  }, 500);

  return (
    <>
      {site && (
      <Tags.AntCollapse
        expandIconPosition="start"
        size="small"
        bordered={false}
        style={{
          borderRadius: '4px'
        }}
        items={[
          {
            key: '1',
            label: <span className="typ-reg pseudo-link">Configure site settings</span>,
            children: (
              <div style={{ marginLeft: '1.5rem' }} className="typ-reg">
                <div className="cta-info">
                  <div>
                    <span className="cta-input-label">Upload brand logo</span>
                    <span className="typ-sm" style={{ display: 'block' }} />
                    <div className="cta-input-c">
                      <div style={{ overflow: 'hidden', flex: '1 1 auto' }}>
                        <FileInput
                          disabled={disableEdit}
                          style={{
                            backgroundColor: 'white',
                          }}
                          accept="image/png, image/jpeg, image/webp, image/svg+xml"
                          label=""
                          onChange={async (e) => {
                            if (e.target.files) {
                              const file = e.target.files[0];
                              if (file) {
                                setLogoUploading(true);
                                const fileUrl = await uploadFileToAws(e.target.files[0]);
                                updateBrandData([['logo', fileUrl]]);
                                amplitudeCtaConfigChanged('logo', fileUrl);
                                setLogoUploading(false);
                              }
                            }
                          }}
                        />
                      </div>
                      {
                      logoUploading
                        ? <Spin indicator={<LoadingOutlined style={{ fontSize: 20 }} spin />} />
                        : <img alt="Site page logo" src={site.logo} height={32} />
                    }
                    </div>
                  </div>
                  <div>
                    <span className="cta-input-label">Open link when brand logo is clicked</span>
                    <div className="cta-input-c">
                      <GTags.SimpleInput
                        className="typ-ip"
                        disabled={disableEdit}
                        placeholder="Link when brand logo is clicked"
                        defaultValue={site.navLink}
                        onChange={(e) => {
                          const link = e.target.value;
                          const formattedLink = getValidUrl(link);
                          debouncedChangeHandler('navLink', formattedLink);
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <span className="cta-input-label">Demo Title</span>
                  <div className="cta-input-c">
                    <GTags.SimpleInput
                      className="typ-ip"
                      disabled={disableEdit}
                      placeholder="Short title of the demo"
                      defaultValue={site.title}
                      onChange={(e) => {
                        const title = e.target.value;
                        debouncedChangeHandler('title', title);
                      }}
                    />
                  </div>
                </div>
                <div className="cta-info">
                  <div>
                    <span className="cta-input-label">CTA text</span>
                    <GTags.SimpleInput
                      className="typ-ip cta-input-c"
                      disabled={disableEdit}
                      placeholder="CTA Text"
                      defaultValue={site.ctaText}
                      onChange={(e) => {
                        debouncedChangeHandler('ctaText', e.target.value);
                      }}
                    />
                  </div>
                  <div>
                    <span className="cta-input-label">CTA link</span>
                    <GTags.SimpleInput
                      className="typ-ip cta-input-c"
                      disabled={disableEdit}
                      placeholder="CTA link"
                      defaultValue={site.ctaLink}
                      onChange={(e) => {
                        const link = e.target.value;
                        const formattedLink = getValidUrl(link);
                        debouncedChangeHandler('ctaLink', formattedLink);
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="type-reg">Choose a background theme</div>
                  <Tags.ColorThemeCon>
                    <div className="card-con">
                      {Object.entries(SiteThemePresets).map(([presentName, preset]) => (
                        <Tags.ThemeCard
                          key={presentName}
                          style={{
                            background: `linear-gradient(33deg, ${preset.bg1}, ${preset.bg2})`
                          }}
                          className={`${presentName === site.themePreset ? 'sel' : undefined}`}
                          bg={preset.bg1}
                          onMouseUp={() => {
                            debouncedThemeHandler('themePreset', presentName as keyof typeof SiteThemePresets);
                          }}
                        />
                      ))}
                    </div>
                  </Tags.ColorThemeCon>
                </div>
                <Tags.AntCollapse
                  expandIconPosition="start"
                  size="small"
                  bordered={false}
                  style={{
                    borderRadius: '4px'
                  }}
                  items={[
                    {
                      key: '1',
                      label: <span className="typ-reg pseudo-link">Advanced</span>,
                      children: (
                        <div className="cta-info cta-color" style={{ margin: '0 0 0 1rem' }}>
                          <div>
                            <span className="cta-input-label">Header Background color</span>
                            <GTags.ColorPicker
                              disabled={disableEdit}
                              className={`typ-ip cta-input-c ${disableEdit ? 'disable' : ''}`}
                              value={site.headerBg}
                              style={{ height: '50px' }}
                              showText
                              onChangeComplete={e => {
                                debouncedChangeHandler('headerBg', e.toHexString());
                              }}
                            />
                          </div>
                          <div>
                            <span className="cta-input-label">Background color 1</span>
                            <GTags.ColorPicker
                              disabled={disableEdit}
                              value={site.bg1}
                              className={`typ-ip cta-input-c ${disableEdit ? 'disable' : ''}`}
                              style={{ height: '50px' }}
                              showText
                              onChangeComplete={e => {
                                debouncedChangeHandler('bg1', e.toHexString());
                              }}
                            />
                          </div>
                          <div>
                            <span className="cta-input-label">Background color 2</span>
                            <GTags.ColorPicker
                              disabled={disableEdit}
                              value={site.bg2}
                              className={`typ-ip cta-input-c ${disableEdit ? 'disable' : ''}`}
                              style={{ height: '50px' }}
                              showText
                              onChangeComplete={e => {
                                debouncedChangeHandler('bg2', e.toHexString());
                              }}
                            />
                          </div>
                        </div>
                      )
                    }
                  ]}
                />
              </div>
            )
          }
        ]}
      />
      )}

      <span className="typ-sm pseudo-link" style={{ marginLeft: '1.8rem', borderBottom: 'none' }} onMouseUp={() => showHelpDrawer(true)}>Learn more about site settings</span>
      <p style={{ margin: '1rem 0 0.25rem' }} className="typ-reg">
        Copy the following URL to and use it in your HTML/JavaScript to open it in a new tab
      </p>
      <UrlCodeShare url={iframeUrl} showOpenLinkButton openEventFrom={calledFrom} />
    </>
  );
}

export default function ShareTourModal(props: Props): JSX.Element {
  const [isPublishFailed, setIsPublishFailed] = useState(false);
  const [showHelpDrawer, setShowHelpDrawer] = useState(false);
  const [searchParams, setSearchParams] = useState<Record<SearchParamBy, ParamType>>({
    [SearchParamBy.UserParam]: [],
    [SearchParamBy.UtmParam]: []
  });
  const [searchParamsStr, setSearchParamsStr] = useState('');
  const [defValue, setDefValue] = useState('');
  const [localSite, setLocalSite] = useState(props.tour.site);

  useEffect(() => {
    const allParams = [...searchParams[SearchParamBy.UserParam], ...searchParams[SearchParamBy.UtmParam]];
    if (allParams.length) setSearchParamsStr(`?${allParams.map(p => `${p.mapping}=${p.value}`).join('&')}`);
    else setSearchParamsStr('');
  }, [searchParams]);

  useEffect(() => {
    setLocalSite(props.tour.site);
  }, []);

  const iframeEmbedCopyHandler = (): void => {
    traceEvent(AMPLITUDE_EVENTS.EMBED_TOUR, {
      embed_type: 'ifame_html',
      tour_url: createIframeSrc(`/${IFRAME_BASE_URL}/${props.relativeUrl}`)
    }, [CmnEvtProp.EMAIL]);
  };

  const handleParamsAdd = (params: ParamType, v: string | undefined): void => {
    setDefValue(v || '');
    setSearchParams({
      ...searchParams,
      [SearchParamBy.UtmParam]: params
    });
  };

  const updateBrandData = (changeData: Array<[key: keyof SiteData, value: string]>): void => {
    if (localSite && props.onSiteDataChange) {
      let newSiteData = { ...localSite };
      for (const changeItem of changeData) {
        newSiteData = {
          ...newSiteData,
          [changeItem[0]]: changeItem[1]
        };
      }
      props.onSiteDataChange(newSiteData);
      setLocalSite(newSiteData);
    }
  };

  const updateWatermark = (showWaterMark: boolean): void => {
    amplitudeRemoveWatermark('sharemodal');
    if (props.subs?.paymentPlan === Plan.SOLO && props.subs.status === Status.ACTIVE) {
      props.setShowPaymentModal!(true);
      return;
    }
    if (props.onOptsDataChange && props.tourOpts) {
      const newOpts = updateTourDataOpts(props.tourOpts!, 'showFableWatermark', showWaterMark);
      props.onOptsDataChange(newOpts, null);
    }
  };

  return (
    <>
      <GTags.BorderedModal
        donotShowHeaderStip
        containerBg="#f5f5f5"
        focusTriggerAfterClose={false}
        className="share-modal"
        open={props.isModalVisible}
        onCancel={props.closeModal}
        centered
        width="60vw"
        footer={null}
      >
        <Tags.ModalBodyCon>
          {props.isPublishing ? (
            <div className="typ-h1 sec-head">Publishing...</div>
          ) : (
            <div className="section-con">
              {isPublishFailed && (
                <>
                  <div
                    className="err-line typ-h2"
                    style={{
                      marginRight: '3rem'
                    }}
                  >Failed to publish the tour. Try again.
                  </div>
                </>
              )}
              {props.tour && getPublicationState(props.tour) === PublicationState.UNPUBLISHED && (
                <>
                  <div className="typ-h1 sec-head" style={{ marginBottom: '0.5rem' }}>
                    You haven't published this demo yet!
                  </div>
                  <div className="pub-btn-txt-con">
                    <div className="typ-h2" style={{ marginBottom: '0.5rem' }}>
                      <p>
                        For a demo to go live, you’ll need to publish it.
                      </p>
                      <p className="type-sm">
                        Please click on <em>publish</em> button you are done making all changes.
                      </p>
                    </div>
                    <PublishButton
                      minWidth="240px"
                      setIsPublishFailed={setIsPublishFailed}
                      tour={props.tour}
                      publishTour={props.publishTour}
                      openShareModal={props.openShareModal}
                      setIsPublishing={props.setIsPublishing}
                    />
                  </div>
                </>
              )}

              {!isPublishFailed
                && props.tour
                && getPublicationState(props.tour) === PublicationState.PUBLISHED
                && (
                  <>
                    <div className="typ-h1 sec-head"> Your demo is published</div>
                    <div className="typ-sm">Publish date:
                      <span>{dateTimeFormat(props.tour.lastPublishedDate)}</span>
                    </div>

                  </>
                )}

              {props.tour && getPublicationState(props.tour) === PublicationState.OUTDATED && (
                <>
                  <div className="typ-h1 sec-head">You have unpublished changes</div>
                  <div className="pub-btn-txt-con">
                    <div className="typ-h2">
                      <p>
                        Your published demo is outdated.
                      </p>
                      <p className="typ-sm">
                        Last publish date: <span>{dateTimeFormat(props.tour.lastPublishedDate)}</span>
                      </p>
                    </div>
                    <PublishButton
                      minWidth="240px"
                      setIsPublishFailed={setIsPublishFailed}
                      tour={props.tour}
                      publishTour={props.publishTour}
                      openShareModal={props.openShareModal}
                      setIsPublishing={props.setIsPublishing}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {!isPublishFailed
            && props.tour
            && (getPublicationState(props.tour) !== PublicationState.UNPUBLISHED)
            && (
            <Tags.EmbedCon>
              <div className="typ-h2" style={{ marginBottom: '1.5rem' }}>
                How do you want to use this demo?
              </div>
              <Collapse
                bordered={false}
                style={{ background: '#f5f5f5' }}
                defaultActiveKey="2"
                accordion
                onChange={(e) => {
                  if (e.length) {
                    if (e[0] === '1') {
                      traceEvent(
                        AMPLITUDE_EVENTS.SHARE_MODAL_SECTION_CLICKED_EMBED_DEMO,
                        {},
                        [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
                      );
                    } else if (e[0] === '2') {
                      traceEvent(
                        AMPLITUDE_EVENTS.SHARE_MODAL_SECTION_CLICKED_CTA_SHARE,
                        {},
                        [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
                      );
                    } else if (e[0] === '3') {
                      traceEvent(
                        AMPLITUDE_EVENTS.SHARE_MODAL_SECTION_CLICKED_INTERNAL_SHARE,
                        {},
                        [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
                      );
                    }
                  }
                }}
                items={[{
                  key: '1',
                  label: <span className="typ-h2">Embed in a landing page</span>,
                  children: (
                    <div className="collapse-content typ-reg">
                      <p style={{ margin: '0 0 1rem' }}>
                        Copy the following code & paste it in the webpage where
                        you want to embed the interactive demo as an iframe.
                      </p>
                      <IframeCodeSnippet
                        height={props.height}
                        width={props.width}
                        copyHandler={iframeEmbedCopyHandler}
                        src={createIframeSrc(`/${IFRAME_BASE_URL}${props.relativeUrl}${searchParamsStr}`)}
                        copyUrl={props.copyUrl}
                      />
                    </div>
                  ),
                  style: collapseTabStyle
                },
                {
                  key: '2',
                  label: <span className="typ-h2">Open this demo in a new tab (on the click of a button)</span>,
                  children: (
                    <div className="collapse-content type-reg">
                      <CTAInfo
                        iframeUrl={createIframeSrc(`/${LIVE_BASE_URL}${props.relativeUrl}${searchParamsStr}`)}
                        defValue={defValue}
                        handleParamsAdd={handleParamsAdd}
                        showInlinkLinkExplore
                        site={localSite}
                        showHelpDrawer={setShowHelpDrawer}
                        updateBrandData={updateBrandData}
                        disableEdit={props.onSiteDataChange === undefined}
                        tourOpts={props.tourOpts}
                        updateWatermark={updateWatermark}
                        calledFrom="cta_share"
                      />
                    </div>
                  ),
                  style: collapseTabStyle
                }
                ]}
              />
            </Tags.EmbedCon>
            )}
        </Tags.ModalBodyCon>
        <Drawer
          title="Site settings"
          open={showHelpDrawer}
          size="large"
          onClose={() => setShowHelpDrawer(false)}
        >
          <p className="typ-reg">
            When you open a Fable's demo in a standalone browser's tab (contrary to, embedding a demo in a landing page),
            you can configure every aspect of the page that opens in the new tab.
          </p>
          <p className="typ-reg">
            We call this configuration <em>Site settings</em>. Following is an example of all the things that you
            can configure using the <em>site settings</em> section.
          </p>
          <img src="/site.png" height={480} alt="site wireframe" />
        </Drawer>
      </GTags.BorderedModal>
    </>
  );
}
