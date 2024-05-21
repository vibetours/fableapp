import React, { ReactElement, useEffect, useRef, useState } from 'react';
import {
  AnnotationButtonLayoutType,
  AnnotationButtonSize,
  AnnotationButtonStyle,
  AnnotationSelectionEffect,
  AnnotationSelectionEffectType,
  AnnotationPositions,
  AnnotationSelectionShape,
  AnnotationSelectionShapeType,
  CmnEvtProp,
  CustomAnnotationPosition,
  EAnnotationBoxSize,
  IAnnotationButton,
  IAnnotationButtonType,
  IAnnotationConfig,
  ITourDataOpts,
  ITourEntityHotspot,
  VideoAnnotationPositions,
  ScrollAdjustment,
  ScrollAdjustmentType
} from '@fable/common/dist/types';
import { Input, Popover, Tabs, Modal, Button as AntButton, Tooltip, Collapse, Radio } from 'antd';
import {
  DeleteOutlined,
  ExclamationCircleOutlined,
  VideoCameraAddOutlined,
  VideoCameraOutlined,
  ColumnWidthOutlined,
  ColumnHeightOutlined,
  LoadingOutlined,
  ThunderboltOutlined,
  FireOutlined,
  LinkOutlined,
  DisconnectOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  EditOutlined,
  PlusCircleFilled,
  DeleteFilled,
  QuestionCircleOutlined,
  ArrowLeftOutlined,
  FormatPainterOutlined,
  RiseOutlined,
  StarFilled,
} from '@ant-design/icons';
import { Plan, Responsiveness, ScreenType, Status } from '@fable/common/dist/api-contract';
import { traceEvent } from '@fable/common/dist/amplitude';
import Button from '../button';
import * as Tags from './styled';
import * as GTags from '../../common-styled';
import * as ATags from '../annotation/styled';
import CssEditor from '../css-editor';
import {
  addCustomBtn,
  removeButtonWithId,
  toggleBooleanButtonProp,
  updateAnnotationText,
  updateTargetElCssStyle,
  updateButtonProp,
  updateTourDataOpts,
  updateAnnotationBoxSize,
  updateAnnotationHideAnnotation,
  updateAnnotationHotspotElPath,
  updateAnnotationPositioning,
  updateOverlay,
  clearAnnotationAllVideoURL,
  updateAnnotationTypeToDefault,
  updateAnnotationTypeToCover,
  updateAnnotationButtonLayout,
  updateAnnCssStyle,
  updateAnnotationCustomDims,
  isAnnCustomPosition,
  getAnnPositioningOptions,
  updateAnnotationSelectionShape,
  updateSelectionColor,
  updateAnnotationSelectionEffect,
  newConfigFrom,
  updateAnnotationScrollAdjustment,
} from '../annotation/annotation-config-utils';
import { P_RespScreen, P_RespSubscription, P_RespTour } from '../../entity-processor';
import {
  AnnotationPerScreen,
  ElPathKey,
  IAnnotationConfigWithScreen,
  Timeline,
  TourDataChangeFn,
  onAnnCreateOrChangeFn,
} from '../../types';
import DomElPicker, { HighlightMode } from './dom-element-picker';
import AEP from './advanced-element-picker';
import VideoRecorder from './video-recorder';
import ActionPanel from './action-panel';
import { effectsHelpText, hotspotHelpText, globalPropertyHelpText } from './helptexts';
import { getWebFonts } from './utils/get-web-fonts';
import { isVideoAnnotation, usePrevious, getValidUrl, isStrBlank, debounce, isTourResponsive, isFeatureAvailable } from '../../utils';
import { deleteAnnotation } from '../annotation/ops';
import { AnnUpdateType } from '../annotation/types';
import AnnotationRichTextEditor from '../annotation-rich-text-editor';
import ALCM from '../annotation/lifecycle-manager';
import FableInput from '../input';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';
import { amplitudeAnnotationApplyAll, amplitudeAnnotationEdited, amplitudeRemoveWatermark, amplitudeScrollAdjustmentChanged } from '../../amplitude';
import CaretOutlined from '../icons/caret-outlined';
import CloseOutlined from '../icons/close-outlines';
import ButtonIcon from '../../assets/icons/buttons.svg';
import SizingIcon from '../../assets/icons/sizing-positioning.svg';
import ThemeIcon from '../../assets/icons/theme.svg';
import DeleteIcon from '../../assets/icons/delete.svg';
import ResetIcon from '../../assets/icons/reset.svg';
import SettingsIcon from '../../assets/icons/settings.svg';
import AnnPositioningInput from './ann-positioning-input';
import EffectSelector, { EffectFor } from './effect-selection-and-builder';
import { Tx } from '../../container/tour-editor/chunk-sync-manager';
import { calculatePopoverPlacement, isLinkButtonInViewport } from './scroll-util';
import { FeatureForPlan } from '../../plans';
import Upgrade from '../upgrade';
import UpgradeModal from '../upgrade/upgrade-modal';
import UpgradeIcon from '../upgrade/icon';

const { confirm } = Modal;

interface IProps {
  screen: P_RespScreen,
  config: IAnnotationConfig,
  opts: ITourDataOpts,
  tour: P_RespTour,
  allAnnotationsForTour: AnnotationPerScreen[],
  busy: boolean,
  subs: P_RespSubscription | null;
  onConfigChange: (
    config: IAnnotationConfig,
    actionType: 'upsert' | 'delete',
    opts: ITourDataOpts,
  ) => void;
  selectedHotspotEl: HTMLElement | null;
  selectedAnnReplaceEl: HTMLElement | null;
  selectedEl: HTMLElement | null;
  setSelectionMode: (mode: 'annotation' | 'hotspot' | 'replace') => void;
  domElPicker: DomElPicker | null;
  applyAnnButtonLinkMutations: (mutations: AnnUpdateType) => void,
  onAnnotationCreateOrChange: onAnnCreateOrChangeFn;
  resetSelectedAnnotationElements: () => void;
  onDeleteAnnotation: (deletedAnnRid: string) => void;
  selectedAnnotationCoords: string | null;
  setAlertMsg: (alertMsg: string) => void;
  timeline: Timeline;
  onTourDataChange: TourDataChangeFn;
  commitTx: (tx: Tx) => void;
  getConnectableAnnotations: (annRefId: string, btnType: IAnnotationButtonType) => IAnnotationConfigWithScreen[];
  updateConnection: (fromMain: string, toMain: string) => void;
  elpathKey: ElPathKey;
  featurePlan: FeatureForPlan | null;
  currScreenId: number;
}

const commonInputStyles: React.CSSProperties = {
  background: '#fbf6ff',
  border: '1px dashed #d0d0ff',
  padding: '0.4rem 0.6rem'
};

const commonActionPanelItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  height: '44px',
  margin: '4px 0',
  color: '#212121',
};

const buttonSecStyle: React.CSSProperties = {
  padding: '1rem',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  background: 'white',
  border: '1px dashed #bdbdbd',
  borderRadius: '8px',
  height: '44px',
  width: '44px',
};

interface ApplyAll {
  key: 'annotationSelectionColor' | 'size' | 'selectionShape' | 'showOverlay' | 'selectionEffect',
  value: string | boolean
}

const applyAllMapping:
{[key: string]: 'branding-selection_color' | 'branding-selection_shape' |
'cta-button_size' | 'overlay' | 'branding-selection_effect'} = {
  annotationSelectionColor: 'branding-selection_color',
  selectionShape: 'branding-selection_shape',
  size: 'cta-button_size',
  showOverlay: 'overlay',
  selectionEffect: 'branding-selection_effect'
};

function canAddExternalLinkToBtn(btnConf: IAnnotationButton): boolean {
  return !(btnConf.type === 'prev' || (!!btnConf.hotspot && btnConf.hotspot.actionType === 'navigate'));
}

function getEffectPanelExtraIcons(props: {
  hasEffectApplied: boolean,
  effectType: 'screen' | 'annotation'
  onDelete: () => void,
}): JSX.Element {
  if (!props.hasEffectApplied) return <span />;
  return (
    <Tooltip
      placement="topRight"
      overlayStyle={{ fontSize: '0.75rem' }}
      title="Effects are applied. Click here to delete any active effects."
    >
      <DeleteOutlined
        onClick={() => {
          confirm({
            title: `Are you sure you want to delete the effects applied on the ${props.effectType}?`,
            icon: <ExclamationCircleOutlined />,
            okText: 'Delete',
            okType: 'danger',
            onOk: () => {
              props.onDelete();
            },
            content: `The effects applied on the ${props.effectType} will be deleted.`,
          });
        }}
      />
    </Tooltip>
  );
}

function GlobalTitle({ title }: {title: string}) : JSX.Element {
  return (
    <Tags.TitleCon className="typ-reg">
      {title}
      <Tooltip
        placement="bottomRight"
        overlayStyle={{ fontSize: '0.75rem' }}
        title={globalPropertyHelpText}
      >
        <QuestionCircleOutlined className="ht-icn" />
      </Tooltip>
    </Tags.TitleCon>
  );
}

export default function AnnotationCreatorPanel(props: IProps): ReactElement {
  const [config, setConfig] = useState<IAnnotationConfig>(props.config);
  const [opts, setTourDataOpts] = useState<ITourDataOpts>(props.opts);
  const [btnEditing, setBtnEditing] = useState<string>('');
  const [openConnectionPopover, setOpenConnectionPopover] = useState<string>('');
  const [newHotspotSelected, setNewHotspotSelected] = useState<boolean>(false);
  const [selectedHotspotEl, setSelectedHotspotEl] = useState<HTMLElement>();
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [hotspotElText, setHotspotElText] = useState<string>('');
  const [showSelectElement, setShowSelectElement] = useState<boolean>(false);
  const [webFonts, setWebFonts] = useState<string[]>([]);
  const [showBrandingOptionsPopup, setShowBrandingOptionsPopup] = useState(false);
  const [showCustomPositioningOption, setShowCustomPositioningOption] = useState(false);
  const [isUrlValid, setIsUrlValid] = useState<boolean>(true);
  const [applyAllProperty, setApplyAllProperty] = useState<ApplyAll | null>(null);
  const [applyToModule, setApplyToModule] = useState<'all' | 'module'>('all');

  const [linkButtonVisible, setLinkButtonVisible] = useState(true);
  const [popoverPlacement, setPopoverPlacement] = useState<'leftBottom' | 'left' | 'leftTop'>('leftBottom');
  const [connectableAnns, setConnectableAnns] = useState<IAnnotationConfigWithScreen[]>([]);
  const [activePopover, setActivePopover] = useState<'open'|'navigate'>('open');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const unsubFn = useRef(() => { });

  const prevConfig = usePrevious(config);
  const prevOpts = usePrevious(opts);

  const domElPicker = props.domElPicker!;

  const loadWebFonts = async (): Promise<void> => {
    const data = await getWebFonts();
    setWebFonts(data.items);
  };

  useEffect(() => {
    setConfig(props.config);
  }, [props.config]);

  useEffect(() => {
    if (
      prevConfig
      && prevOpts
      && (config.monoIncKey > prevConfig.monoIncKey
        || opts.monoIncKey > prevOpts.monoIncKey)) {
      if (prevConfig.size !== config.size) {
        amplitudeAnnotationEdited('box_sizing', config.size);
      }
      if (prevOpts.primaryColor !== opts.primaryColor) {
        amplitudeAnnotationEdited('branding-primary_color', opts.primaryColor);
      }
      if (prevOpts.annotationBodyBackgroundColor !== opts.annotationBodyBackgroundColor) {
        amplitudeAnnotationEdited('branding-background_color', opts.annotationBodyBackgroundColor);
      }
      if (prevOpts.annotationBodyBorderColor !== opts.annotationBodyBorderColor) {
        amplitudeAnnotationEdited('branding-border_color', opts.annotationBodyBorderColor);
      }
      if (prevOpts.annotationFontColor !== opts.annotationFontColor) {
        amplitudeAnnotationEdited('branding-font_color', opts.annotationFontColor);
      }
      if (prevConfig.annotationSelectionColor !== config.annotationSelectionColor) {
        amplitudeAnnotationEdited('branding-selection_color', config.annotationSelectionColor);
      }
      if (prevConfig.buttonLayout !== config.buttonLayout) {
        amplitudeAnnotationEdited('branding-button_layout', config.buttonLayout);
      }
      if (prevOpts.annotationPadding !== opts.annotationPadding) {
        amplitudeAnnotationEdited('branding-padding', opts.annotationPadding);
      }
      if (prevOpts.borderRadius !== opts.borderRadius) {
        amplitudeAnnotationEdited('branding-border_radius', opts.borderRadius);
      }
      if (prevConfig.hideAnnotation !== config.hideAnnotation) {
        amplitudeAnnotationEdited('hotspot-hide_annotation', config.hideAnnotation);
      }
      if (prevConfig.isHotspot !== config.isHotspot) {
        amplitudeAnnotationEdited('hotspot-interactive_element', config.isHotspot);
      }
      if (prevConfig.showOverlay !== config.showOverlay) {
        amplitudeAnnotationEdited('overlay', config.showOverlay);
      }
      if (prevConfig.selectionShape !== config.selectionShape) {
        amplitudeAnnotationEdited('branding-selection_shape', config.selectionShape);
      }
      if (prevConfig.scrollAdjustment !== config.scrollAdjustment) {
        amplitudeScrollAdjustmentChanged(
          config.scrollAdjustment,
          `${process.env.REACT_APP_CLIENT_ENDPOINT}/demo/${props.tour.rid}/${props.screen.rid}/${config.refId}`
        );
      }
      props.onConfigChange(config, 'upsert', opts);
    }
  }, [config, opts]);

  useEffect(() => {
    // In the parent component:
    // The prop 'domElPicker' is initially null and then a value gets assigned.
    // Changes in the 'domElPicker' value won't trigger a re-render of the child component directly,
    // but due to some other factor, the child component is being re-rendered,
    // and coincidentally, the changes in the 'domElPicker' value are also getting captured.

    // In the child component:
    // The 'domElPicker' prop is being received, and it's important to note that changes in the 'domElPicker' prop
    // alone won't trigger a re-render of this component. The re-render is caused by some other factor.
    // However, since the child component is being re-rendered, any changes in the 'domElPicker' prop will
    // be reflected inside this component as well.

    if (config.hotspotElPath && domElPicker) {
      const hotspotEl = domElPicker.elFromPath(config.hotspotElPath)!;
      if (hotspotEl) {
        setSelectedHotspotEl(hotspotEl);
        setHotspotElText(hotspotEl.textContent || 'Hotspot element');
      }
    }
  }, [config, props.domElPicker]);

  useEffect(() => {
    if (props.selectedHotspotEl && domElPicker && newHotspotSelected) {
      setConfig(c => updateAnnotationHotspotElPath(c, domElPicker.elPath(props.selectedHotspotEl!)));
      domElPicker.setSelectedBoundedEl(null);
    }
  }, [props.selectedHotspotEl, newHotspotSelected]);

  useEffect(() => {
    if (props.selectedAnnReplaceEl && domElPicker && showSelectElement) {
      props.onAnnotationCreateOrChange(props.currScreenId, config, 'delete', null);

      const newConfig = updateAnnotationTypeToDefault(config, domElPicker.elPath(props.selectedAnnReplaceEl!));
      props.onAnnotationCreateOrChange(props.currScreenId, newConfig, 'upsert', null);
      setShowSelectElement(false);
      props.resetSelectedAnnotationElements();
    }

    if (props.selectedAnnotationCoords && showSelectElement) {
      props.onAnnotationCreateOrChange(props.currScreenId, config, 'delete', null);

      const newConfig = updateAnnotationTypeToDefault(config, props.selectedAnnotationCoords);
      props.onAnnotationCreateOrChange(props.currScreenId, newConfig, 'upsert', null);
      setShowSelectElement(false);
      props.resetSelectedAnnotationElements();
    }
  }, [props.selectedAnnReplaceEl, showSelectElement, props.selectedAnnotationCoords]);

  function checkInView(): void {
    if (openConnectionPopover.length !== 0) {
      const isLinkButtonVisible = isLinkButtonInViewport(openConnectionPopover);
      setLinkButtonVisible(isLinkButtonVisible);
      const popPlacement = calculatePopoverPlacement(openConnectionPopover);
      setPopoverPlacement(popPlacement);
    }
  }

  useEffect(() => {
    const creatorPanel = document.getElementById('ann-creator-panel');
    if (!creatorPanel) {
      return () => { };
    }
    creatorPanel.addEventListener('scroll', checkInView);
    return () => {
      creatorPanel.removeEventListener('scroll', checkInView);
    };
  }, [openConnectionPopover]);

  const showDeleteConfirm = (): void => {
    confirm({
      title: 'Are you sure you want to delete this annotation?',
      icon: <ExclamationCircleOutlined />,
      okText: 'Delete',
      okType: 'danger',
      onOk: () => {
        traceEvent(AMPLITUDE_EVENTS.ANNOTATION_DELETED, {
          annotation_op_location: 'timeline'
        }, [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]);
        props.onDeleteAnnotation(config.refId);
        const result = deleteAnnotation(
          { ...config, screenId: props.currScreenId },
          props.allAnnotationsForTour,
          opts.main,
          true
        );
        props.applyAnnButtonLinkMutations(result);
      },
      content: (
        <div className="typ-reg">
          This annotation will get deleted and previous annotation will be connected to next annotation.
        </div>
      ),
    });
  };

  const showVideoDeleteConfirm = (): void => {
    confirm({
      title: 'Are you sure you want to delete this video?',
      icon: <ExclamationCircleOutlined />,
      okText: 'Delete',
      okType: 'danger',
      onOk: () => {
        setConfig(c => clearAnnotationAllVideoURL(c));
      },
    });
  };

  const getConvertAnnotationType = (): string => (config.type === 'cover' ? 'default' : 'cover');

  const convertAnnotation = (newType: string): void => {
    /**
     * If new annotation type is cover, we are replacing the default ann with cover
     * by deleting the current annotation and adding new annotation of type cover
     *
     * If new annotation type is default, we are hiding the current annotation and allowing
     * user to select new annotation by setting selection mode to replace.
     * Then in useEffect, we are replacing the cover ann with default
     * by deleting the current annotation and adding new annotation of type default
     */
    if (newType === 'cover') {
      props.onAnnotationCreateOrChange(props.currScreenId, config, 'delete', null);
      const newConfig = updateAnnotationTypeToCover(config);
      props.onAnnotationCreateOrChange(props.currScreenId, newConfig, 'upsert', null);
    } else {
      setShowSelectElement(true);
      setConfig(c => updateAnnotationHideAnnotation(c, true));
      props.setSelectionMode('replace');
      domElPicker.setSelectionMode();
    }
  };

  const startSelectingHotspotEl = (): void => {
    props.setSelectionMode('hotspot');
    const boundedEl = domElPicker.elFromPath(config[props.elpathKey]);
    domElPicker.setSelectedBoundedEl(boundedEl!);
    domElPicker.setSelectionMode();
    setNewHotspotSelected(true);
    amplitudeAnnotationEdited('hotspot-nested_element', '');
  };

  const applyPropertyToAnn = (
    ann: IAnnotationConfigWithScreen,
    propertyKey: ApplyAll['key'],
    propertValue: string | boolean,
    tx: Tx
  ): void => {
    const newAnn = newConfigFrom(ann);
    if (propertyKey === 'size') {
      const buttons = newAnn.buttons.slice(0);
      buttons.forEach(button => {
        button.size = propertValue as AnnotationButtonSize;
      });
    } else {
      (newAnn as any)[propertyKey] = propertValue;
    }
    props.onTourDataChange('annotation-and-theme', newAnn.screen.id, {
      config: newAnn,
      actionType: 'upsert',
    }, tx);
  };

  const videoAnn = isVideoAnnotation(config);

  const qualifiedAnnotationId = `${props.currScreenId}/${props.config.refId}`;

  const hideConnectionPopover = (): void => {
    setOpenConnectionPopover('');
    setLinkButtonVisible(true);
    setPopoverPlacement('leftBottom');
    setActivePopover('open');
  };

  if (props.busy) {
    return (
      <div style={{
        padding: '0.5rem 1rem 0.5rem',
        fontSize: '0.75rem'
      }}
      > <LoadingOutlined />&nbsp;&nbsp; Loading...
      </div>
    );
  }

  const debouncedPaddingOnChangeHandler = debounce((e) => {
    setTourDataOpts(t => updateTourDataOpts(t, 'annotationPadding', e.target.value));
  }, 2000);

  const debouncedBorderRadiusOnChangeHandler = debounce((e) => {
    setTourDataOpts(t => updateTourDataOpts(t, 'borderRadius', e));
  }, 2000);

  // TODO: We can add one more variable in featureForPlan wich
  // will store isFeatureAvailable so its calculated one time only.
  // const ctaFeatureAvailable = isFeatureAvailable(props.featurePlan, 'cta_buttons');
  const leadFormFeatureAvailable = isFeatureAvailable(props.featurePlan, 'custom_lead_form');
  const isVideoFeatureAvailable = isFeatureAvailable(props.featurePlan, 'annotation');
  const watermarkFeatureAvailable = isFeatureAvailable(props.featurePlan, 'no_watermark');

  return (
    <Tags.AnotCrtPanelCon
      className="e-ignr"
      onClick={() => {
        setShowBrandingOptionsPopup(false);
      }}
    >
      <ActionPanel id="annotation-rte" alwaysOpen>
        <div style={{
          background: 'white', borderRadius: '1rem', border: '1px solid #DDD', padding: '1rem'
        }}
        >
          <AnnotationRichTextEditor
            subs={props.subs}
            throttledChangeHandler={(htmlString, displayText) => {
              setConfig(c => {
                if (c.bodyContent === htmlString) {
                  // This gets fired on focus or if the user makes some change and then deletes the change.
                  // In all those case we don't do quitely skip the update.
                  return c;
                }
                return updateAnnotationText(c, htmlString, displayText);
              });
            }}
            defaultValue={config.bodyContent}
            leadFormFeatureAvailable={leadFormFeatureAvailable}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <div style={{ opacity: 0.5, fontStyle: 'italic' }}>or</div>
            <GTags.DashedBtn
              type="text"
              className="typ-reg"
              style={{
                ...commonInputStyles,
                border: 'none',
                padding: 'none',
                flexGrow: 1,
                background: 'white',
                borderRadius: '8px',
                color: '#666'
              }}
              onClick={() => {
                if (isVideoFeatureAvailable) {
                  setShowVideoRecorder(true);
                } else {
                  setShowUpgradeModal(true);
                }
              }}
              icon={videoAnn ? (<VideoCameraOutlined />) : (<VideoCameraAddOutlined />)}
            >
              {videoAnn ? 'Change Video' : 'Record/Upload Video'}
              &nbsp;
              {!isVideoFeatureAvailable && <UpgradeIcon />}
            </GTags.DashedBtn>
            {isVideoAnnotation(config) && (
              <Tooltip title="Delete recorded video">
                <DeleteOutlined style={{ cursor: 'pointer' }} onClick={showVideoDeleteConfirm} />
              </Tooltip>
            )}
          </div>
        </div>
        {showVideoRecorder && (
          <VideoRecorder
            tour={props.tour}
            closeRecorder={() => setShowVideoRecorder(false)}
            setConfig={setConfig}
          />
        )}
      </ActionPanel>
      <ActionPanel
        id="branding-tab"
        title="Branding"
        icon={<img src={ThemeIcon} alt="" />}
      >
        <div style={commonActionPanelItemStyle}>
          <GlobalTitle title="Primary color" />
          <GTags.ColorPicker
            className="typ-ip"
            showText={(color) => color.toHexString()}
            onChangeComplete={e => {
              setTourDataOpts(t => updateTourDataOpts(t, 'primaryColor', e.toHexString()));
            }}
            defaultValue={opts.primaryColor}
          />
        </div>
        <div style={commonActionPanelItemStyle}>
          <GlobalTitle title="Background color" />
          <GTags.ColorPicker
            className="typ-ip"
            showText={(color) => color.toHexString()}
            onChangeComplete={e => {
              setTourDataOpts(t => updateTourDataOpts(t, 'annotationBodyBackgroundColor', e.toHexString()));
            }}
            disabled={isVideoAnnotation(config)}
            defaultValue={opts.annotationBodyBackgroundColor}
          />
        </div>
        <div style={commonActionPanelItemStyle}>
          <GlobalTitle title="Font color" />
          <GTags.ColorPicker
            className="typ-ip"
            showText={(color) => color.toHexString()}
            onChangeComplete={e => {
              setTourDataOpts(t => updateTourDataOpts(t, 'annotationFontColor', e.toHexString()));
            }}
            disabled={isVideoAnnotation(config)}
            defaultValue={opts.annotationFontColor}
          />
        </div>
        <div style={commonActionPanelItemStyle}>
          <GlobalTitle title="Border Radius" />
          <Tags.InputNumberBorderRadius
            className="typ-ip"
            min={0}
            // bordered={false} // looks ugly
            defaultValue={opts.borderRadius}
            addonAfter="px"
            onChange={debouncedBorderRadiusOnChangeHandler}
          />
        </div>
        <div style={commonActionPanelItemStyle}>
          <div
            style={{ display: 'flex', gap: '10px' }}
            onClick={() => {
              if (!watermarkFeatureAvailable) {
                setShowUpgradeModal(true);
              }
            }}
          >
            <GlobalTitle title="Show Fable Watermark" />
            {!watermarkFeatureAvailable && <UpgradeIcon />}
          </div>
          <Tags.StyledSwitch
            size="small"
            style={{ backgroundColor: opts.showFableWatermark ? '#7567FF' : '#BDBDBD' }}
            defaultChecked={opts.showFableWatermark}
            checked={opts.showFableWatermark}
            onChange={(e) => {
              amplitudeRemoveWatermark('acp');
              if (!watermarkFeatureAvailable) {
                setShowUpgradeModal(true);
                return;
              }
              setTourDataOpts(t => updateTourDataOpts(t, 'showFableWatermark', e));
            }}
          />
        </div>
        <Collapse
          expandIconPosition="end"
          size="small"
          bordered={false}
          style={{
            borderRadius: '4px',
            marginTop: '10px'
          }}
          items={[
            {
              key: '1',
              label: <span className="typ-reg">Advanced</span>,
              children: (
                <div>
                  <div style={commonActionPanelItemStyle}>
                    <GlobalTitle title="Border color" />
                    <GTags.ColorPicker
                      className="typ-ip"
                      showText={(color) => color.toHexString()}
                      onChangeComplete={e => {
                        setTourDataOpts(t => updateTourDataOpts(t, 'annotationBodyBorderColor', e.toHexString()));
                      }}
                      defaultValue={opts.annotationBodyBorderColor}
                    />
                  </div>
                  <div style={commonActionPanelItemStyle}>
                    <div>
                      <div className="typ-reg">Selection color</div>
                      <Tags.ApplyAllTxt
                        onClick={() => {
                          setApplyAllProperty({
                            key: 'annotationSelectionColor',
                            value: config.annotationSelectionColor
                          });
                        }}
                        className="typ-sm"
                      >Apply to all
                      </Tags.ApplyAllTxt>
                    </div>
                    <GTags.ColorPicker
                      className="typ-ip"
                      showText={(color) => color.toHexString()}
                      onChangeComplete={e => {
                        setConfig(c => updateSelectionColor(c, e.toHexString()));
                      }}
                      defaultValue={config.annotationSelectionColor}
                    />
                  </div>
                  <div style={commonActionPanelItemStyle}>
                    <GlobalTitle title="Font family" />
                    <GTags.FableSelect
                      className="typ-ip"
                      defaultValue={opts.annotationFontFamily}
                      placeholder="select font"
                      bordered={false}
                      options={webFonts.map(v => ({
                        value: v,
                        label: v,
                      }))}
                      onChange={(e) => {
                        if (e) {
                          setTourDataOpts(t => updateTourDataOpts(t, 'annotationFontFamily', e as string));
                          amplitudeAnnotationEdited('branding-font_family', e as string);
                        } else {
                          setTourDataOpts(t => updateTourDataOpts(t, 'annotationFontFamily', null));
                          amplitudeAnnotationEdited('branding-font_family', 'IBM Plex Sans');
                        }
                      }}
                      onClick={loadWebFonts}
                      notFoundContent="No font found"
                      showSearch
                      allowClear={{ clearIcon: <CloseOutlined bgColor="white" /> }}
                      suffixIcon={<CaretOutlined dir="down" />}
                    />
                  </div>
                  <div style={commonActionPanelItemStyle}>
                    <div>
                      <div className="typ-reg">Selection Effect</div>
                      <Tags.ApplyAllTxt
                        onClick={() => {
                          setApplyAllProperty({
                            key: 'selectionEffect',
                            value: config.selectionEffect
                          });
                        }}
                        className="typ-sm"
                      >Apply to all
                      </Tags.ApplyAllTxt>
                    </div>
                    <GTags.FableSelect
                      className="typ-ip"
                      title={config.selectionShape === 'pulse' ? 'Mask type is set to `regular` for Pulse shaped box' : ''}
                      disabled={config.selectionShape === 'pulse'}
                      defaultValue={config.selectionEffect}
                      size="small"
                      bordered={false}
                      options={AnnotationSelectionEffect.map(v => ({
                        value: v,
                        label: v.charAt(0).toUpperCase() + v.slice(1),
                      }))}
                      onChange={(value) => {
                        setConfig(c => updateAnnotationSelectionEffect(c, value as AnnotationSelectionEffectType));
                      }}
                      suffixIcon={<CaretOutlined dir="down" />}
                    />
                  </div>
                  <div style={commonActionPanelItemStyle}>
                    <div>
                      <div className="typ-reg">Selection Shape</div>
                      <Tags.ApplyAllTxt
                        onClick={() => {
                          setApplyAllProperty({
                            key: 'selectionShape',
                            value: config.selectionShape
                          });
                        }}
                        className="typ-sm"
                      >Apply to all
                      </Tags.ApplyAllTxt>
                    </div>
                    <GTags.FableSelect
                      className="typ-ip"
                      defaultValue={config.selectionShape}
                      size="small"
                      bordered={false}
                      options={AnnotationSelectionShape.map(v => ({
                        value: v,
                        label: v.charAt(0).toUpperCase() + v.slice(1),
                      }))}
                      onChange={(value) => {
                        setConfig(c => updateAnnotationSelectionShape(c, value as AnnotationSelectionShapeType));
                      }}
                      suffixIcon={<CaretOutlined dir="down" />}
                    />
                  </div>
                  <div style={commonActionPanelItemStyle}>
                    <GlobalTitle title="Padding" />
                    <Tags.InputText
                      className="typ-ip"
                      placeholder="Enter padding"
                      defaultValue={opts.annotationPadding}
                      bordered={false}
                      disabled={isVideoAnnotation(config)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.keyCode === 13) {
                          setTourDataOpts(t => updateTourDataOpts(
                            t,
                            'annotationPadding',
                            (e.target as HTMLInputElement).value
                          ));
                        }
                      }}
                      onChange={debouncedPaddingOnChangeHandler}
                    />
                  </div>
                </div>
              )
            }
          ]}
        />
      </ActionPanel>
      <ActionPanel
        id="buttons-panel"
        title="CTAs"
        icon={<img src={ButtonIcon} alt="" />}
        // isFeatureRestricted={!ctaFeatureAvailable}
        setShowUpgradeModal={setShowUpgradeModal}
      >
        <div>
          {/* <div className={ctaFeatureAvailable ? '' : 'upgrade-plan'}> */}
          <div style={commonActionPanelItemStyle}>
            <div>Button Layout</div>
            <div style={{ padding: '0.3rem 0' }}>
              <label htmlFor="default">
                <ColumnWidthOutlined />
                <input
                  id="default"
                  type="radio"
                  value="default"
                  checked={config.buttonLayout === 'default'}
                  onChange={(e) => {
                    setConfig(c => updateAnnotationButtonLayout(c, e.target.value as AnnotationButtonLayoutType));
                  }}
                />
              </label>
              <label htmlFor="full-width">
                <ColumnHeightOutlined />
                <input
                  id="full-width"
                  type="radio"
                  value="full-width"
                  checked={config.buttonLayout === 'full-width'}
                  onChange={(e) => {
                    setConfig(c => updateAnnotationButtonLayout(c, e.target.value as AnnotationButtonLayoutType));
                  }}
                />
              </label>
            </div>
          </div>
          <Tags.BtnCtrlCon annBgColor={props.opts.annotationBodyBackgroundColor}>
            {config.buttons.map(btnConf => {
              const showHelpText = btnConf.type === 'prev' && config.buttonLayout === 'default';
              const primaryColor = opts.primaryColor;
              return (
                <Tags.AABtnCtrlLine key={btnConf.id} className={btnEditing === btnConf.id ? 'sel' : ''} annBgColor={props.opts.annotationBodyBackgroundColor}>
                  <div className="a-head">
                    <Tags.ABtnConf>
                      <ATags.ABtn
                        bg={opts.annotationBodyBackgroundColor}
                        type="button"
                        btnStyle={btnConf.style}
                        color={primaryColor}
                        size={btnConf.size}
                        fontFamily={opts.annotationFontFamily}
                        btnLayout={config.buttonLayout}
                        borderRadius={opts.borderRadius}
                      >
                        {btnConf.text}
                      </ATags.ABtn>
                      { showHelpText && (
                      <Tags.BackBtnHelpText>Back button is displayed as <ArrowLeftOutlined /> </Tags.BackBtnHelpText>
                      )}
                    </Tags.ABtnConf>
                    <Tags.ButtonSecCon>
                      <Popover
                        open={openConnectionPopover === btnConf.id && linkButtonVisible}
                        onOpenChange={(newOpen: boolean) => {
                          setIsUrlValid(true);
                          if (newOpen) {
                            const connectableAnnotations = props.getConnectableAnnotations(config.refId, btnConf.type);
                            setConnectableAnns(connectableAnnotations);
                            setOpenConnectionPopover(btnConf.id);
                          } else {
                            hideConnectionPopover();
                          }
                        }}
                        trigger="click"
                        placement={popoverPlacement}
                        content={
                          <div style={{
                            fontSize: '1rem',
                            width: '500px',
                            height: activePopover === 'open' ? '20vh' : '55vh',
                            transition: 'height 0.3s ease-in-out'
                          }}
                          >
                            <div>
                              Describe what will happen when the button is clicked
                            </div>
                            <Tabs
                              defaultActiveKey="open"
                              activeKey={activePopover}
                              onTabClick={(e) => {
                                setActivePopover(e as 'open' | 'navigate');
                              }}
                              className="typ-sm"
                              size="small"
                              items={[{
                                key: 'open',
                                label: 'Open a link',
                                children: (
                                  <div>
                                    <Tags.CTALinkInputCont>
                                      <div
                                        style={{ width: '100%' }}
                                      >
                                        <FableInput
                                          label="Enter a link that would open in new tab"
                                          defaultValue={
                                              btnConf.hotspot && btnConf.hotspot.actionType === 'open'
                                                ? btnConf.hotspot.actionValue
                                                : ''
                                            }
                                          onBlur={(e) => {
                                            setIsUrlValid(true);
                                            if (!canAddExternalLinkToBtn(btnConf)) {
                                              props.setAlertMsg(
                                                'Cannot add link as this button is already connected to an annotation'
                                              );
                                              return;
                                            }
                                            const trimmedValue = (e.target.value || '').trim();
                                            let hostspotConfig: ITourEntityHotspot | null = null;
                                            // If user has entered an empty string then we delete the hotspot
                                            if (trimmedValue) {
                                              const validUrl = getValidUrl(trimmedValue);
                                              setIsUrlValid(Boolean(validUrl));
                                              if (validUrl) {
                                                hostspotConfig = {
                                                  type: 'an-btn',
                                                  on: 'click',
                                                  target: '$this',
                                                  actionType: 'open',
                                                  actionValue: validUrl,
                                                };
                                              }
                                            }
                                            const thisAntn = updateButtonProp(
                                              config,
                                              btnConf.id,
                                              'hotspot',
                                              hostspotConfig
                                            );
                                            setConfig(thisAntn);
                                            amplitudeAnnotationEdited('add_link_to_cta', trimmedValue);
                                          }}
                                          style={{ marginRight: '1rem' }}
                                        />
                                      </div>
                                      <Button
                                        type="button"
                                        intent="primary"
                                        onClick={() => {
                                          if (!isUrlValid) return;
                                          hideConnectionPopover();
                                        }}
                                        style={{ borderRadius: '8px' }}
                                      >Submit
                                      </Button>
                                    </Tags.CTALinkInputCont>
                                    {!isUrlValid && (
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'red' }}>
                                      The url you have entered appears to be malformed. A correctly formed url would look like
                                      &nbsp; <em>https://acme.com</em>
                                    </p>
                                    )}
                                  </div>
                                )
                              },
                              ...(btnConf.type !== 'custom' ? [{
                                key: 'navigate',
                                label: 'Navigate to',
                                children: (
                                  <Tags.NavigateToCon className={activePopover}>
                                    {btnConf.hotspot === null
                                      ? (
                                        <div>
                                          <GTags.Txt className="title">
                                            {connectableAnns.length === 0
                                              ? 'No annotations avialable to which we can connect'
                                              : 'Select annotation to make a connection'}
                                          </GTags.Txt>
                                          <Tags.ConnectableAnnsCon>{connectableAnns.map(ann => (
                                            <Tags.ConnectableAnnCon
                                              key={ann.refId}
                                              onClick={() => {
                                                const fromMain = `${props.currScreenId}/${config.refId}`;
                                                const toMain = `${ann.screen.id}/${ann.refId}`;
                                                if (btnConf.type === 'next') {
                                                  props.updateConnection(fromMain, toMain);
                                                } else {
                                                  props.updateConnection(toMain, fromMain);
                                                }
                                                hideConnectionPopover();
                                              }}
                                            >
                                              <div style={{ float: 'left', width: '140px', margin: '0 10px 5px 0' }}>
                                                <img
                                                  src={ann.screen.thumbnailUri.href}
                                                  alt={ann.displayText}
                                                  style={{ width: '140px', height: '100px' }}
                                                />
                                              </div>
                                              <Tags.ConnectableAnnText>{ann.displayText}</Tags.ConnectableAnnText>
                                            </Tags.ConnectableAnnCon>
                                          ))}
                                          </Tags.ConnectableAnnsCon>
                                        </div>
                                      )
                                      : (
                                        <div>
                                          <iframe
                                            src="https://help.sharefable.com/Editing-Demos/Reordering-the-Demo"
                                            width="480"
                                            height="500"
                                            title="recording demo"
                                            style={{
                                              border: 'none',
                                              margin: 'auto',
                                              display: 'block'
                                            }}
                                          />
                                        </div>
                                      )}
                                  </Tags.NavigateToCon>
                                )
                              }] : [])
                              ]}
                            />
                          </div>

                      }
                      >
                        <div>
                          <Tooltip
                            overlayStyle={{ fontSize: '0.75rem' }}
                            placement="topRight"
                            title={
                            btnConf.hotspot
                              ? btnConf.hotspot.actionType === 'open'
                                ? 'Already connected to external link'
                                : 'Already connected to an annotation'
                              : 'No action defined for what would happen if user clicks this button'
                          }
                          >
                            <AntButton
                              id={`${btnConf.id}`}
                              style={{
                                opacity: btnConf.hotspot === null ? '1' : '0.55',
                                ...buttonSecStyle
                              }}
                              icon={
                              btnConf.hotspot
                                ? <LinkOutlined />
                                : <DisconnectOutlined />
                            }
                              type="text"
                              size="small"
                            />
                          </Tooltip>
                        </div>
                      </Popover>
                      {
                      btnConf.type === 'custom' ? (
                        <Tooltip title="Remove button" overlayStyle={{ fontSize: '0.75rem' }}>
                          <AntButton
                            icon={<DeleteOutlined />}
                            type="text"
                            size="small"
                            style={{ color: '#bdbdbd', ...buttonSecStyle }}
                            onClick={() => {
                              setConfig(c => removeButtonWithId(c, btnConf.id));
                            }}
                          />
                        </Tooltip>
                      ) : (
                        <Tooltip
                          title={btnConf.exclude ? 'Show button' : 'Hide button'}
                          overlayStyle={{ fontSize: '0.75rem' }}
                        >
                          <AntButton
                            icon={
                              btnConf.exclude
                                ? <EyeInvisibleOutlined />
                                : <EyeOutlined />
                            }
                            type="text"
                            size="small"
                            style={{ color: '#bdbdbd', ...buttonSecStyle }}
                            onClick={() => {
                              amplitudeAnnotationEdited('hide_cta', btnConf.exclude!);
                              setConfig(c => toggleBooleanButtonProp(c, btnConf.id, 'exclude'));
                            }}
                          />
                        </Tooltip>
                      )
                    }
                      <Tooltip title="Edit button properties" overlayStyle={{ fontSize: '0.75rem' }}>
                        <AntButton
                          icon={<EditOutlined />}
                          type="text"
                          size="small"
                          style={{
                            color: '#bdbdbd',
                            ...buttonSecStyle
                          }}
                          onClick={() => {
                            if (btnEditing === btnConf.id) setBtnEditing('');
                            else setBtnEditing(btnConf.id);
                          }}
                        />
                      </Tooltip>
                    </Tags.ButtonSecCon>
                  </div>
                  {btnConf.id === btnEditing && (
                  <div className="n-details">
                    <div style={commonActionPanelItemStyle}>
                      <div style={{ marginRight: '0.5rem' }}>Button style</div>
                      <GTags.FableSelect
                        defaultValue={btnConf.style}
                        size="small"
                        bordered={false}
                        options={Object.values(AnnotationButtonStyle).map(v => ({
                          value: v,
                          label: v,
                        }))}
                        onSelect={(val) => {
                          if (val !== btnConf.style) { amplitudeAnnotationEdited('cta-button_style', val as string); }
                          setConfig(c => updateButtonProp(c, btnConf.id, 'style', val as AnnotationButtonStyle));
                        }}
                        suffixIcon={<CaretOutlined dir="down" />}
                      />
                    </div>
                    <div style={commonActionPanelItemStyle}>
                      <div>
                        <div style={{ marginRight: '0.5rem' }}>Button size</div>
                        <Tags.ApplyAllTxt
                          onClick={() => {
                            setApplyAllProperty({
                              key: 'size',
                              value: btnConf.size
                            });
                          }}
                          className="typ-sm"
                        >Apply to all
                        </Tags.ApplyAllTxt>
                      </div>
                      <GTags.FableSelect
                        defaultValue={btnConf.size}
                        size="small"
                        bordered={false}
                        options={Object.values(AnnotationButtonSize).map(v => ({
                          value: v,
                          label: v,
                        }))}
                        onSelect={(val) => {
                          if (val !== btnConf.size) { amplitudeAnnotationEdited('cta-button_size', val as string); }
                          setConfig(c => updateButtonProp(c, btnConf.id, 'size', val as AnnotationButtonSize));
                        }}
                        suffixIcon={<CaretOutlined dir="down" />}
                      />
                    </div>
                    <div style={{ ...commonActionPanelItemStyle, marginTop: '4px' }}>
                      <div>Button text</div>
                      <Input
                        className="typ-ip"
                        defaultValue={btnConf.text}
                        size="small"
                        bordered={false}
                        style={{
                          flexGrow: 1,
                          maxWidth: '140px',
                          background: '#fff',
                          borderRadius: '8px',
                          height: '100%',
                          border: '1px solid #E8E8E8',
                        }}
                        placeholder="Button text"
                        onBlur={e => {
                          if (e.target.value !== btnConf.text) {
                            amplitudeAnnotationEdited('cta-button_text', e.target.value);
                          }
                          setConfig(c => updateButtonProp(c, btnConf.id, 'text', e.target.value));
                        }}
                      />
                    </div>
                  </div>
                  )}
                </Tags.AABtnCtrlLine>
              );
            })}
          </Tags.BtnCtrlCon>
          <div style={{ ...commonActionPanelItemStyle, justifyContent: 'center', marginTop: '0.5rem' }}>
            <GTags.DashedBtn
              type="text"
              className="fullWidth typ-reg"
              icon={<PlusCircleFilled />}
              onClick={() => {
                amplitudeAnnotationEdited('add_new_cta', '');
                setConfig(c => addCustomBtn(c));
              }}
              style={{ color: '#7567FF' }}
            >
              Add another CTA
            </GTags.DashedBtn>
          </div>
          {/* {!ctaFeatureAvailable && <Upgrade subs={props.subs} />} */}
        </div>
      </ActionPanel>
      <ActionPanel
        title="Effects"
        icon={<FireOutlined style={{ fontSize: '1.25rem' }} />}
        helpText={effectsHelpText}
      >
        <Collapse
          defaultActiveKey={['1']}
          expandIconPosition="end"
          size="small"
          bordered={false}
          style={{
            borderRadius: '4px',
          }}
          items={[
            {
              key: '1',
              label: <span className="typ-reg">On screen</span>,
              children: <EffectSelector
                key={props.config.refId}
                config={props.config}
                cssStr={props.config.targetElCssStyle}
                onSubmit={cssStr => {
                  unsubFn.current();
                  unsubFn.current = () => { };
                  const newConfig = updateTargetElCssStyle(config, cssStr);
                  setConfig(newConfig);
                }}
                onPreview={cssStr => {
                  const lcm = (window as any).__f_alcm__;
                  if (!lcm || !props.selectedEl) return;
                  unsubFn.current = lcm.previewCustomStyle(cssStr, props.selectedEl, props.config);
                }}
                effectFor={EffectFor.tel}
              />,
              style: {
                border: 'none',
              },
              extra: getEffectPanelExtraIcons({
                hasEffectApplied: !isStrBlank(config.targetElCssStyle),
                effectType: 'screen',
                onDelete: () => {
                  const newConfig = updateTargetElCssStyle(config, '');
                  setConfig(newConfig);
                }
              })
            },
            {
              key: '2',
              label: <span className="typ-reg">On annotation</span>,
              children: <EffectSelector
                key={props.config.refId}
                config={props.config}
                cssStr={props.config.annCSSStyle}
                onSubmit={cssStr => {
                  const newConfig = updateAnnCssStyle(config, cssStr);
                  setConfig(newConfig);
                }}
                onPreview={cssStr => {
                  const lcm = (window as any).__f_alcm__ as ALCM;
                  if (!lcm) return;
                  lcm.addAnnStyleTag(cssStr, config);
                }}
                effectFor={EffectFor.ann}
              />,
              style: {
                borderTop: '1px solid lightgray',
              },
              extra: getEffectPanelExtraIcons({
                hasEffectApplied: !isStrBlank(config.annCSSStyle),
                effectType: 'annotation',
                onDelete: () => {
                  const newConfig = updateAnnCssStyle(config, '');
                  setConfig(newConfig);
                }
              })
            },
          ]}
        />
      </ActionPanel>
      <ActionPanel title="Sizing & Positioning" icon={<img src={SizingIcon} alt="" />}>
        <div style={commonActionPanelItemStyle}>
          <div style={commonActionPanelItemStyle}>Positioning</div>
          <GTags.FableSelect
            defaultValue={isAnnCustomPosition(config.positioning) ? 'custom' : config.positioning}
            className="typ-ip"
            value={config.positioning}
            size="small"
            bordered={false}
            options={getAnnPositioningOptions(config).map(v => ({
              value: v,
              label: v,
            }))}
            onChange={(e) => {
              if (e === 'custom') {
                setShowCustomPositioningOption(true);
                return;
              }
              setShowCustomPositioningOption(false);
              setConfig(c => updateAnnotationPositioning(c, (e as AnnotationPositions | VideoAnnotationPositions)));
            }}
            suffixIcon={<CaretOutlined dir="down" />}
          />
        </div>
        {
          (isAnnCustomPosition(config.positioning) || showCustomPositioningOption) && (
            <div style={{ ...commonActionPanelItemStyle, minHeight: '64px', height: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', width: '70%' }}>
                <div>
                  Custom Positioning
                </div>
                <div className="typ-sm" style={{ opacity: '0.75' }}>
                  This choice won't be regarded if there is no space for the annotation to be rendered.
                  We would fallback to auto positioning in that case.
                </div>
              </div>
              <AnnPositioningInput
                fullWidth={64}
                panelWidth={18}
                onChange={(e) => {
                  setConfig(c => updateAnnotationPositioning(c, e));
                }}
                selectedPos={config.positioning as CustomAnnotationPosition}
              />
            </div>
          )
        }
        <div style={commonActionPanelItemStyle}>
          <div>Box sizing</div>
          <GTags.FableSelect
            defaultValue={config.size ?? 'small'}
            size="small"
            className="typ-ip"
            bordered={false}
            options={Object.values(isVideoAnnotation(config)
              ? ['medium', 'large', 'custom']
              : ['small', 'medium', 'large', 'custom'])
              .map(v => ({
                value: v,
                label: `${v}`
              }))}
            onChange={(e) => setConfig(c => updateAnnotationBoxSize(c, e as EAnnotationBoxSize))}
            suffixIcon={<CaretOutlined dir="down" />}
          />
        </div>
        {
          config.size === 'custom' && (
            <div style={commonActionPanelItemStyle}>
              <div>Custom width</div>
              <Tags.InputNumberBorderRadius
                min={0}
                defaultValue={config.customDims.width}
                addonAfter="px"
                onChange={(e) => {
                  const width = e ? +e : 0;
                  setConfig(c => updateAnnotationCustomDims(c, { ...c.customDims, width }));
                }}
              />
            </div>
          )
        }
      </ActionPanel>
      {
        props.screen.type === ScreenType.SerDom && config.type === 'default' && (
          <ActionPanel
            id="hotspot-panel"
            title="Hotspot"
            helpText={hotspotHelpText}
            icon={<ThunderboltOutlined style={{ fontSize: '1.25rem' }} />}
          >
            {config.isHotspot && (
              <>
                <div style={{ ...commonActionPanelItemStyle, height: 'auto', marginTop: '0.5rem' }}>
                  <Tags.AnotCrtPanelSec row style={{ justifyContent: 'space-between' }}>
                    <div>Hide annotation</div>
                    <Tags.StyledSwitch
                      size="small"
                      style={{ backgroundColor: config.hideAnnotation ? '#7567FF' : '#BDBDBD' }}
                      defaultChecked={config.hideAnnotation}
                      onChange={(e) => setConfig(c => updateAnnotationHideAnnotation(c, e))}
                    />
                  </Tags.AnotCrtPanelSec>
                </div>
                <div style={{ ...commonActionPanelItemStyle, height: 'auto' }}>
                  <div>{!config.hotspotElPath ? 'Nested element' : 'Selected'}</div>
                  {
                    !config.hotspotElPath && (
                      <GTags.DashedBtn
                        type="text"
                        size="small"
                        onClick={startSelectingHotspotEl}
                        className="typ-ip"
                      >
                        Select
                      </GTags.DashedBtn>
                    )
                  }
                </div>
                {
                  config.hotspotElPath && (
                    <div style={{ ...commonActionPanelItemStyle, height: 'auto' }}>
                      <Tags.AnotCrtPanelSec row style={{ justifyContent: 'space-between' }}>
                        <div style={{ opacity: '0.65', margin: '0' }}>{hotspotElText.substring(0, 15)}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Tooltip
                            title="Select other element"
                          >
                            <AntButton
                              icon={<img src={ResetIcon} alt="" />}
                              type="text"
                              size="small"
                              onClick={startSelectingHotspotEl}
                              style={buttonSecStyle}
                            />
                          </Tooltip>
                          <AntButton
                            icon={<img src={DeleteIcon} alt="" />}
                            type="text"
                            size="small"
                            onClick={() => {
                              setConfig(c => updateAnnotationHotspotElPath(c, null));
                            }}
                            style={buttonSecStyle}
                          />
                        </div>
                      </Tags.AnotCrtPanelSec>
                    </div>
                  )
                }
                {selectedHotspotEl && config.hotspotElPath && (
                  <div style={{ ...commonActionPanelItemStyle, width: '100%', height: '22px' }}>
                    <AEP
                      selectedEl={selectedHotspotEl}
                      disabled={false}
                      boundEl={domElPicker.elFromPath(config[props.elpathKey])!}
                      domElPicker={domElPicker}
                      onElSelect={(newSelEl: HTMLElement, prevSelEl: HTMLElement) => {
                        props.selectedEl && domElPicker.clearMask(HighlightMode.Pinned);
                        if (newSelEl !== prevSelEl) {
                          const newElPath = domElPicker.elPath(newSelEl)!;
                          setConfig(c => updateAnnotationHotspotElPath(c, newElPath));
                        }
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </ActionPanel>
        )
      }
      <ActionPanel
        id="advanced-creator-panel"
        title="Advanced"
        icon={<img src={SettingsIcon} alt="" />}
      >
        <div
          id="entry-point-checkbox"
          style={{
            ...commonActionPanelItemStyle,
            height: 'auto',
            marginTop: '0.5rem'
          }}
        >
          <div>Entry point</div>
          <GTags.OurCheckbox
            style={{ marginLeft: '0.75rem' }}
            checked={opts.main === qualifiedAnnotationId}
            onChange={e => {
              let newOpts;
              if (e.target.checked) {
                newOpts = updateTourDataOpts(opts, 'main', qualifiedAnnotationId);
              } else {
                newOpts = updateTourDataOpts(opts, 'main', '');
              }
              amplitudeAnnotationEdited('entry_point', e.target.checked);
              setTourDataOpts(newOpts);
            }}
          />
        </div>
        <div style={{ ...commonActionPanelItemStyle, marginTop: '0.5rem', height: 'auto' }}>
          <div>
            <div>Overlay</div>
            <Tags.ApplyAllTxt
              onClick={() => {
                setApplyAllProperty({
                  key: 'showOverlay',
                  value: config.showOverlay
                });
              }}
              className="typ-sm"
            >Apply to all
            </Tags.ApplyAllTxt>
          </div>
          <Tags.StyledSwitch
            size="small"
            style={{ backgroundColor: config.showOverlay ? '#7567FF' : '#BDBDBD' }}
            defaultChecked={config.showOverlay}
            onChange={(e) => setConfig(c => updateOverlay(c, e))}
          />
        </div>
        <div style={commonActionPanelItemStyle}>
          <div style={commonActionPanelItemStyle}>Scroll Adjustment</div>
          <GTags.FableSelect
            className="typ-ip"
            defaultValue={config.scrollAdjustment}
            size="small"
            bordered={false}
            options={ScrollAdjustment.map(v => ({
              value: v,
              label: v.charAt(0).toUpperCase() + v.slice(1),
            }))}
            onChange={(value) => {
              setConfig(c => updateAnnotationScrollAdjustment(c, value as ScrollAdjustmentType));
            }}
            suffixIcon={<CaretOutlined dir="down" />}
          />
        </div>
      </ActionPanel>
      <div style={{ ...commonActionPanelItemStyle, justifyContent: 'center', margin: '0.5rem 1rem' }}>
        <GTags.DashedBtn
          type="text"
          icon={<DeleteFilled style={{ color: '#d64e4d' }} />}
          onClick={showDeleteConfirm}
          style={{ color: '#AB2424' }}
          className="fullWidth typ-reg"
        >
          Delete this annotation
        </GTags.DashedBtn>
      </div>
      <GTags.BorderedModal
        title=""
        open={applyAllProperty !== null}
        onCancel={() => {
          setApplyAllProperty(null);
        }}
        className="apply-all"
        footer={(
          <div className="button-two-col-cont">
            <Button
              type="button"
              intent="secondary"
              onClick={() => {
                setApplyAllProperty(null);
              }}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button
              style={{ flex: 1 }}
              onClick={() => {
                if (!applyAllProperty) return;
                const tx = new Tx();
                tx.start();

                // if apply to all modify all annotations in timeline
                if (applyToModule === 'all') {
                  const timeline: Timeline = props.timeline;
                  timeline.forEach((flow) => {
                    flow.forEach((ann) => {
                      applyPropertyToAnn(ann, applyAllProperty.key, applyAllProperty.value, tx);
                    });
                  });
                } else {
                  const currentFlow = props.timeline.filter((timeline) => timeline[0].grpId === config.grpId)[0];
                  currentFlow.forEach(ann => {
                    applyPropertyToAnn(ann, applyAllProperty.key, applyAllProperty.value, tx);
                  });
                }

                amplitudeAnnotationApplyAll(
                  applyToModule,
                  applyAllMapping[applyAllProperty!.key],
                  applyAllProperty!.value
                );

                props.commitTx(tx);
                setApplyAllProperty(null);
              }}
            >
              Save
            </Button>
          </div>
        )}
      >
        <p>This style is already applied to the current annotation.</p>
        {props.timeline.length > 1
          ? (
            <div>
              Confirm if you want to
              <Radio.Group
                onChange={(e) => {
                  setApplyToModule(e.target.value);
                }}
                value={applyToModule}
                style={{ marginTop: '7px' }}
              >
                <Radio value="module">apply this style to all the annotations of this module</Radio>
                <Radio value="all">apply this style to all the annotations of this demo (across all modules)</Radio>
              </Radio.Group>
            </div>
          ) : (
            <div>
              <p>Confirm if you want to apply this style on all the annotations.</p>
            </div>
          )}
      </GTags.BorderedModal>
      <UpgradeModal
        showUpgradePlanModal={showUpgradeModal}
        setShowUpgradePlanModal={setShowUpgradeModal}
        subs={props.subs}
      />
    </Tags.AnotCrtPanelCon>
  );
}
