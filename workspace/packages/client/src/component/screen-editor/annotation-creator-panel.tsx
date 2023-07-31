import React, { HTMLInputTypeAttribute, ReactElement, useEffect, useRef, useState } from 'react';
import {
  AnnotationButtonLayout,
  AnnotationButtonLayoutType,
  AnnotationButtonSize,
  AnnotationButtonStyle,
  AnnotationPositions,
  EAnnotationBoxSize,
  IAnnotationConfig,
  ITourDataOpts,
  ITourEntityHotspot,
  VideoAnnotationPositions
} from '@fable/common/dist/types';
import Button from 'antd/lib/button';
import Input from 'antd/lib/input';
import Popover from 'antd/lib/popover';
import Tabs from 'antd/lib/tabs';
import Checkbox from 'antd/lib/checkbox';
import Modal from 'antd/lib/modal';
import Switch from 'antd/lib/switch';
import {
  DeleteOutlined,
  DisconnectOutlined,
  EditOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  NodeIndexOutlined,
  SubnodeOutlined,
  ExclamationCircleOutlined,
  VideoCameraAddOutlined,
  VideoCameraOutlined,
  SelectOutlined,
  SwitcherOutlined,
  ColumnWidthOutlined,
  ColumnHeightOutlined
} from '@ant-design/icons';
import Tooltip from 'antd/lib/tooltip';
import { ScreenType } from '@fable/common/dist/api-contract';
import { InputNumber, Radio } from 'antd';
import type { RadioChangeEvent } from 'antd';
import * as Tags from './styled';
import * as GTags from '../../common-styled';
import * as ATags from '../annotation/styled';
import {
  addCustomBtn,
  removeButtonWithId,
  toggleBooleanButtonProp,
  updateAnnotationText,
  updateButtonProp,
  updateTourDataOpts,
  updateAnnotationBoxSize,
  updateAnnotationIsHotspot,
  updateAnnotationHideAnnotation,
  updateAnnotationHotspotElPath,
  updateAnnotationPositioning,
  updateOverlay,
  clearAnnotationAllVideoURL,
  updateAnnotationTypeToDefault,
  updateAnnotationTypeToCover,
  updateAnnotationButtonLayout,
} from '../annotation/annotation-config-utils';
import { P_RespScreen, P_RespTour } from '../../entity-processor';
import { AnnotationPerScreen, } from '../../types';
import DomElPicker, { HighlightMode } from './dom-element-picker';
import AdvanceElementPicker from './advance-element.picker';
import VideoRecorder from './video-recorder';
import ActionPanel from './action-panel';
import { hotspotHelpText } from './helptexts';
import { getWebFonts } from './utils/get-web-fonts';
import { isVideoAnnotation } from '../../utils';
import { deleteAnnotation } from '../annotation/ops';
import { AnnUpdateType } from '../timeline/types';
import AnnotationRichTextEditor from '../annotation-rich-text-editor';

const ButtonLayoutOptions = [
  { label: ColumnHeightOutlined, value: 'column' },
  { label: ColumnWidthOutlined, value: 'row' },
];

const { confirm } = Modal;

interface IProps {
  screen: P_RespScreen,
  // config: IAnnotationConfigWithScreen,
  config: IAnnotationConfig,
  opts: ITourDataOpts,
  tour: P_RespTour,
  allAnnotationsForTour: AnnotationPerScreen[],
  onConfigChange: (
    config: IAnnotationConfig,
    actionType: 'upsert' | 'delete',
    opts: ITourDataOpts,
  ) => void;
  selectedHotspotEl: HTMLElement | null;
  selectedAnnReplaceEl: HTMLElement | null;
  setSelectionMode: (mode: 'annotation' | 'hotspot' | 'replace') => void;
  domElPicker: DomElPicker | null;
  applyAnnButtonLinkMutations: (mutations: AnnUpdateType) => void,
  onAnnotationCreateOrChange: (
    screenId: number | null,
    config: IAnnotationConfig,
    actionType: 'upsert' | 'delete',
    opts: ITourDataOpts | null
  ) => void;
  resetSelectedAnnotationElements: () => void;
  resetSelectedAnnotationId: () => void;
  selectedAnnotationCoords: string | null;
}

interface IState {
  config?: IAnnotationConfig;
  btnEditing: string;
}

const commonInputStyles: React.CSSProperties = {
  border: '1px solid #DDDDDD',
  backgroundColor: '#f9f9f9',
  padding: '0.4rem 0.6rem'
};

const commonActionPanelItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between'
};

const commonIconStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: '#16023E',
};
const buttonSecStyle: React.CSSProperties = {
  padding: '1rem',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const usePrevious = <T extends unknown>(value: T): T | undefined => {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

export default function AnnotationCreatorPanel(props: IProps): ReactElement {
  const [config, setConfig] = useState<IAnnotationConfig>(props.config);
  const [opts, setTourDataOpts] = useState<ITourDataOpts>(props.opts);
  const [btnEditing, setBtnEditing] = useState<string>('');
  const [showHotspotAdvancedElPicker, setShowHotspotAdvancedElPicker] = useState(false);
  const [openConnectionPopover, setOpenConnectionPopover] = useState<string>('');
  const [newHotspotSelected, setNewHotspotSelected] = useState<boolean>(false);
  const [selectedHotspotEl, setSelectedHotspotEl] = useState<HTMLElement>();
  const [selectedHotspotElsParents, setSelectedHotspotElsParents] = useState<Node[]>([]);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [hotspotElText, setHotspotElText] = useState<string>('');
  const [showSelectElement, setShowSelectElement] = useState<boolean>(false);
  const [webFonts, setWebFonts] = useState<string[]>([]);

  const prevConfig = usePrevious(config);
  const prevOpts = usePrevious(opts);

  const domElPicker = props.domElPicker!;

  const loadWebFonts = async (): Promise<void> => {
    const data = await getWebFonts();
    setWebFonts(data.items);
  };

  useEffect(() => {
    if (
      prevConfig
      && prevOpts
      && (config.monoIncKey > prevConfig.monoIncKey
        || opts.monoIncKey > prevOpts.monoIncKey)) {
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
        const boundedEl = domElPicker.elFromPath(props.config.id)!;
        domElPicker.setSelectedBoundedEl(boundedEl);
        const parents = domElPicker.getParents(hotspotEl);
        setSelectedHotspotElsParents(parents!);
        domElPicker.setSelectedBoundedEl(null);
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
      props.onAnnotationCreateOrChange(props.screen.id, config, 'delete', null);

      const newConfig = updateAnnotationTypeToDefault(config, domElPicker.elPath(props.selectedAnnReplaceEl!));
      setConfig(newConfig);
      setShowSelectElement(false);
      props.resetSelectedAnnotationElements();
    }

    if (props.selectedAnnotationCoords && showSelectElement) {
      props.onAnnotationCreateOrChange(props.screen.id, config, 'delete', null);

      const newConfig = updateAnnotationTypeToDefault(config, props.selectedAnnotationCoords);
      setConfig(newConfig);
      setShowSelectElement(false);
      props.resetSelectedAnnotationElements();
    }
  }, [props.selectedAnnReplaceEl, showSelectElement, props.selectedAnnotationCoords]);

  const showDeleteConfirm = (): void => {
    confirm({
      title: 'Are you sure you want to delete this annotation?',
      icon: <ExclamationCircleOutlined />,
      okText: 'Yes',
      okType: 'danger',
      onOk: () => {
        const result = deleteAnnotation(
          { ...config, screenId: props.screen.id },
          props.allAnnotationsForTour,
          opts.main,
          true
        );
        props.applyAnnButtonLinkMutations(result);
        props.resetSelectedAnnotationId();
      },
    });
  };

  const showVideoDeleteConfirm = (): void => {
    confirm({
      title: 'Are you sure you want to delete this video?',
      icon: <ExclamationCircleOutlined />,
      okText: 'Yes',
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
      props.onAnnotationCreateOrChange(props.screen.id, config, 'delete', null);
      const newConfig = updateAnnotationTypeToCover(config);
      setConfig(newConfig);
    } else {
      setShowSelectElement(true);
      setConfig(c => updateAnnotationHideAnnotation(c, true));
      props.setSelectionMode('replace');
      domElPicker.setSelectionMode();
    }
  };

  const startSelectingHotspotEl = (): void => {
    props.setSelectionMode('hotspot');
    const boundedEl = domElPicker.elFromPath(props.config.id);
    domElPicker.setSelectedBoundedEl(boundedEl!);
    domElPicker.setSelectionMode();
    setNewHotspotSelected(true);
  };

  const videoAnn = isVideoAnnotation(config);

  const qualifiedAnnotationId = `${props.screen.id}/${props.config.refId}`;

  return (
    <Tags.AnotCrtPanelCon className="e-ignr">
      <ActionPanel alwaysOpen>
        <AnnotationRichTextEditor
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
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
          <div style={{ opacity: 0.5, fontStyle: 'italic' }}>or</div>
          <Tags.ActionPaneBtn
            type="text"
            style={{ ...commonInputStyles, border: 'none', padding: 'none', flexGrow: 1 }}
            onClick={() => setShowVideoRecorder(true)}
            icon={videoAnn ? (<VideoCameraOutlined />) : (<VideoCameraAddOutlined />)}
          >
            {videoAnn ? 'Record Again' : 'Record Video'}
          </Tags.ActionPaneBtn>
          {isVideoAnnotation(config) && (
            <Tooltip title="Delete recorded video">
              <DeleteOutlined style={{ cursor: 'pointer' }} onClick={showVideoDeleteConfirm} />
            </Tooltip>
          )}
        </div>
        {showVideoRecorder && (
          <VideoRecorder
            tour={props.tour}
            closeRecorder={() => setShowVideoRecorder(false)}
            setConfig={setConfig}
          />
        )}
      </ActionPanel>
      <ActionPanel title="Sizing & Positioning">
        <div style={commonActionPanelItemStyle}>
          <GTags.Txt style={commonActionPanelItemStyle}>Positioning</GTags.Txt>
          <Tags.ActionPaneSelect
            defaultValue={config.positioning}
            size="small"
            bordered={false}
            options={isVideoAnnotation(config) ? Object.values(VideoAnnotationPositions).map(v => ({
              value: v,
              label: v,
            })) : Object.values(AnnotationPositions).map(v => ({
              value: v,
              label: `${v} ${v === AnnotationPositions.Auto ? '' : '(not yet supported)'}`,
              disabled: v !== AnnotationPositions.Auto
            }))}
            onChange={(e) => (
              setConfig(c => updateAnnotationPositioning(c, (e as AnnotationPositions | VideoAnnotationPositions)))
            )}
          />
        </div>
        <div style={commonActionPanelItemStyle}>
          <GTags.Txt style={{}}>Box sizing</GTags.Txt>
          <Tags.ActionPaneSelect
            defaultValue={config.size ?? 'small'}
            size="small"
            bordered={false}
            options={Object.values(isVideoAnnotation(config)
              ? ['medium', 'large']
              : ['small', 'medium', 'large'])
              .map(v => ({
                value: v,
                label: `${v}`
              }))}
            onChange={(e) => setConfig(c => updateAnnotationBoxSize(c, e as EAnnotationBoxSize))}
          />
        </div>

      </ActionPanel>
      <ActionPanel title="Branding">
        <div style={commonActionPanelItemStyle}>
          <GTags.Txt>Primary color</GTags.Txt>
          <Tags.ColorInputWrapper>
            <div>
              <Tags.InputColorCircle color={opts.primaryColor} />
            </div>
            <Input
              defaultValue={opts.primaryColor}
              size="small"
              bordered={false}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.keyCode === 13) {
                  setTourDataOpts(t => updateTourDataOpts(t, 'primaryColor', (e.target as HTMLInputElement).value));
                }
              }}
              onBlur={e => {
                setTourDataOpts(t => updateTourDataOpts(t, 'primaryColor', e.target.value));
              }}
              disabled={isVideoAnnotation(config)}
            />
          </Tags.ColorInputWrapper>
        </div>
        <div style={commonActionPanelItemStyle}>
          <GTags.Txt>Background color</GTags.Txt>
          <Tags.ColorInputWrapper>
            <div>
              <Tags.InputColorCircle color={opts.annotationBodyBackgroundColor} />
            </div>
            <Input
              defaultValue={opts.annotationBodyBackgroundColor}
              size="small"
              bordered={false}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.keyCode === 13) {
                  setTourDataOpts(t => updateTourDataOpts(t, 'annotationBodyBackgroundColor', (e.target as HTMLInputElement).value));
                }
              }}
              onBlur={e => {
                setTourDataOpts(t => updateTourDataOpts(t, 'annotationBodyBackgroundColor', e.target.value));
              }}
              disabled={isVideoAnnotation(config)}
            />
          </Tags.ColorInputWrapper>
        </div>
        <div style={commonActionPanelItemStyle}>
          <GTags.Txt>Border color</GTags.Txt>
          <Tags.ColorInputWrapper>
            <div>
              <Tags.InputColorCircle color={opts.annotationBodyBorderColor} />
            </div>
            <Input
              defaultValue={opts.annotationBodyBorderColor}
              size="small"
              bordered={false}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.keyCode === 13) {
                  setTourDataOpts(t => updateTourDataOpts(t, 'annotationBodyBorderColor', (e.target as HTMLInputElement).value));
                }
              }}
              onBlur={e => {
                setTourDataOpts(t => updateTourDataOpts(t, 'annotationBodyBorderColor', e.target.value));
              }}
            />
          </Tags.ColorInputWrapper>
        </div>
        <div style={commonActionPanelItemStyle}>
          <GTags.Txt>Font color</GTags.Txt>
          <Tags.ColorInputWrapper>
            <div>
              <Tags.InputColorCircle color={opts.annotationFontColor} />
            </div>
            <Input
              defaultValue={opts.annotationFontColor}
              size="small"
              bordered={false}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.keyCode === 13) {
                  setTourDataOpts(t => updateTourDataOpts(t, 'annotationFontColor', (e.target as HTMLInputElement).value));
                }
              }}
              onBlur={e => {
                setTourDataOpts(t => updateTourDataOpts(t, 'annotationFontColor', e.target.value));
              }}
            />
          </Tags.ColorInputWrapper>
        </div>
        <div style={commonActionPanelItemStyle}>
          <GTags.Txt>Selection color</GTags.Txt>
          <Tags.ColorInputWrapper>
            <div>
              <Tags.InputColorCircle color={opts.annotationSelectionColor} />
            </div>
            <Input
              defaultValue={opts.annotationSelectionColor}
              size="small"
              bordered={false}
              onBlur={e => {
                setTourDataOpts(t => updateTourDataOpts(t, 'annotationSelectionColor', e.target.value));
              }}
            />
          </Tags.ColorInputWrapper>
        </div>
        <div style={commonActionPanelItemStyle}>
          <GTags.Txt>Font family</GTags.Txt>
          <Tags.ActionPaneSelect
            defaultValue={opts.annotationFontFamily}
            placeholder="select font"
            size="small"
            bordered={false}
            options={webFonts.map(v => ({
              value: v,
              label: v,
            }))}
            onChange={(e) => {
              if (e) {
                setTourDataOpts(t => updateTourDataOpts(t, 'annotationFontFamily', e as string));
              } else {
                setTourDataOpts(t => updateTourDataOpts(t, 'annotationFontFamily', null));
              }
            }}
            style={{
              minWidth: '100px',
            }}
            onClick={loadWebFonts}
            notFoundContent="loading"
            showSearch
            allowClear
          />
        </div>
        <div style={commonActionPanelItemStyle}>
          <GTags.Txt style={{}}>Button Layout</GTags.Txt>
          <div style={{ padding: '0.3rem 0' }}>
            <label htmlFor="default">
              <ColumnWidthOutlined />
              <input
                id="default"
                type="radio"
                value="default"
                checked={config.buttonLayout === 'default'}
                onChange={
                  (e) => setConfig(c => updateAnnotationButtonLayout(c, e.target.value as AnnotationButtonLayoutType))
                }
              />
            </label>

            <label htmlFor="full-width">
              <ColumnHeightOutlined />
              <input
                id="full-width"
                type="radio"
                value="full-width"
                checked={config.buttonLayout === 'full-width'}
                onChange={
                  (e) => setConfig(c => updateAnnotationButtonLayout(c, e.target.value as AnnotationButtonLayoutType))
                }
              />
            </label>
          </div>
        </div>
        <div style={commonActionPanelItemStyle}>
          <GTags.Txt style={commonActionPanelItemStyle}>Padding</GTags.Txt>
          <Input
            placeholder="Enter padding"
            defaultValue={opts.annotationPadding}
            size="small"
            bordered={false}
            style={{
              background: '#fff',
              width: '90px'
            }}
            disabled={isVideoAnnotation(config)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.keyCode === 13) {
                setTourDataOpts(t => updateTourDataOpts(t, 'annotationPadding', (e.target as HTMLInputElement).value));
              }
            }}
            onBlur={e => {
              setTourDataOpts(t => updateTourDataOpts(t, 'annotationPadding', e.target.value));
            }}
          />
        </div>

        <div style={commonActionPanelItemStyle}>
          <GTags.Txt style={commonActionPanelItemStyle}>Border Radius</GTags.Txt>

          <InputNumber
            min={0}
            // bordered={false} // looks ugly
            defaultValue={opts.borderRadius}
            size="small"
            addonAfter="px"
            style={{ width: '90px' }}
            disabled={isVideoAnnotation(config)}
            onChange={e => {
              setTourDataOpts(t => updateTourDataOpts(t, 'borderRadius', e));
            }}
          />
        </div>
      </ActionPanel>
      <ActionPanel title="Buttons">
        {config.buttons.map(btnConf => {
          const primaryColor = opts.primaryColor;
          return (
            <Tags.AABtnCtrlLine key={btnConf.id} className={btnEditing === btnConf.id ? 'sel' : ''}>
              <div className="a-head">
                <div style={{ display: 'flex', alignItems: 'center' }}>
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
                </div>
                <Tags.ButtonSecCon>
                  <Tooltip
                    placement="topRight"
                    title={
                      <GTags.Txt style={{ color: '#fff' }} className="subsubhead">
                        {
                          btnConf.hotspot
                            ? 'Click to configure'
                            : 'No action defined for what would happen if user clicks this button'
                        }
                      </GTags.Txt>
                    }
                  >
                    <Popover
                      open={openConnectionPopover === btnConf.id}
                      onOpenChange={(newOpen: boolean) => {
                        if (newOpen) {
                          setOpenConnectionPopover(btnConf.id);
                        } else {
                          setOpenConnectionPopover('');
                        }
                      }}
                      trigger="click"
                      placement="topRight"
                      content={
                        <div style={{ fontSize: '1rem' }}>
                          <GTags.Txt className="title2">
                            Describe what will happen when the button is clicked
                          </GTags.Txt>
                          <Tabs
                            defaultActiveKey="open"
                            style={{ fontSize: '0.95rem' }}
                            size="small"
                            items={[{
                              key: 'open',
                              label: 'Open a link',
                              children: (
                                <div>
                                  <GTags.Txt className="title2">
                                    Enter a link that would be opened in a new tab when the button is clicked
                                  </GTags.Txt>
                                  <div style={{ display: 'flex', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                                    <Input
                                      defaultValue={
                                        btnConf.hotspot && btnConf.hotspot.actionType === 'open'
                                          ? btnConf.hotspot.actionValue
                                          : ''
                                      }
                                      onBlur={(e) => {
                                        const trimmedValue = (e.target.value || '').trim();
                                        let hostspotConfig: ITourEntityHotspot | null = null;
                                        if (trimmedValue) {
                                          hostspotConfig = {
                                            type: 'an-btn',
                                            on: 'click',
                                            target: '$this',
                                            actionType: 'open',
                                            actionValue: e.target.value,
                                          };
                                        }
                                        const thisAntn = updateButtonProp(config, btnConf.id, 'hotspot', hostspotConfig);
                                        setConfig(thisAntn);
                                      }}
                                      size="small"
                                      style={{ marginRight: '1rem' }}
                                    />
                                    <Button
                                      type="primary"
                                      size="small"
                                      onClick={() => setOpenConnectionPopover('')}
                                    >Submit
                                    </Button>
                                  </div>
                                </div>
                              )
                            },
                            {
                              key: 'navigate',
                              label: 'Navigate to',
                              children: (
                                <div>
                                  <GTags.Txt className="title">
                                    Use the canvas to make connection between annotations
                                  </GTags.Txt>
                                </div>
                              )
                            }]}
                          />
                        </div>
                      }
                    >
                      <Button
                        icon={
                          btnConf.hotspot
                            ? <NodeIndexOutlined
                                style={{ ...commonIconStyle, color: btnConf.hotspot ? '#7567FF' : '#FF7450' }}
                            />
                            : <DisconnectOutlined
                                style={{ ...commonIconStyle, color: btnConf.hotspot ? '#7567FF' : '#FF7450' }}
                            />
                        }
                        type="text"
                        size="small"
                        style={{ color: btnConf.hotspot ? '#7567FF' : '#FF7450', ...buttonSecStyle }}
                      />
                    </Popover>
                  </Tooltip>
                  {
                    btnConf.type === 'custom' ? (
                      <Button
                        icon={<DeleteOutlined style={{ ...commonIconStyle }} />}
                        type="text"
                        size="small"
                        style={{ color: '#bdbdbd', ...buttonSecStyle }}
                        onClick={() => {
                          setConfig(c => removeButtonWithId(c, btnConf.id));
                        }}
                      />
                    ) : (
                      <Button
                        icon={
                          btnConf.exclude
                            ? <EyeInvisibleOutlined style={{ ...commonIconStyle }} />
                            : <EyeOutlined style={{ ...commonIconStyle }} />
                        }
                        type="text"
                        size="small"
                        style={{ color: '#bdbdbd', ...buttonSecStyle }}
                        onClick={() => {
                          setConfig(c => toggleBooleanButtonProp(c, btnConf.id, 'exclude'));
                        }}
                      />
                    )
                  }
                  <Button
                    icon={<EditOutlined style={{ ...commonIconStyle }} />}
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
                </Tags.ButtonSecCon>
              </div>
              {btnConf.id === btnEditing && (
                <div className="n-details">
                  <div style={commonActionPanelItemStyle}>
                    <GTags.Txt style={{ marginRight: '0.5rem' }}>Button style</GTags.Txt>
                    <Tags.ActionPaneSelect
                      defaultValue={btnConf.style}
                      size="small"
                      bordered={false}
                      options={Object.values(AnnotationButtonStyle).map(v => ({
                        value: v,
                        label: v,
                      }))}
                      onSelect={(val) => {
                        setConfig(c => updateButtonProp(c, btnConf.id, 'style', val as AnnotationButtonStyle));
                      }}
                    />
                  </div>
                  <div style={commonActionPanelItemStyle}>
                    <GTags.Txt style={{ marginRight: '0.5rem' }}>Button size</GTags.Txt>
                    <Tags.ActionPaneSelect
                      defaultValue={btnConf.size}
                      size="small"
                      bordered={false}
                      options={Object.values(AnnotationButtonSize).map(v => ({
                        value: v,
                        label: v,
                      }))}
                      onSelect={(val) => {
                        setConfig(c => updateButtonProp(c, btnConf.id, 'size', val as AnnotationButtonSize));
                      }}
                    />
                  </div>
                  <div style={{ ...commonActionPanelItemStyle, marginTop: '4px' }}>
                    <GTags.Txt>Button text</GTags.Txt>
                    <Input
                      defaultValue={btnConf.text}
                      size="small"
                      bordered={false}
                      style={{
                        flexGrow: 1,
                        maxWidth: '60%',
                        background: '#fff',
                        padding: '4px 6px'
                      }}
                      placeholder="Button text"
                      onBlur={e => {
                        setConfig(c => updateButtonProp(c, btnConf.id, 'text', e.target.value));
                      }}
                    />
                  </div>
                </div>
              )}
            </Tags.AABtnCtrlLine>
          );
        })}
        <div style={{ ...commonActionPanelItemStyle, justifyContent: 'center', marginTop: '0.5rem' }}>
          <Tags.ActionPaneBtn
            type="text"
            icon={<SubnodeOutlined />}
            onClick={() => {
              setConfig(c => addCustomBtn(c));
            }}
          >Create a custom button
          </Tags.ActionPaneBtn>
        </div>
      </ActionPanel>
      {
        props.screen.type === ScreenType.SerDom && (
          <ActionPanel title="Hotspot" helpText={hotspotHelpText}>
            <div style={commonActionPanelItemStyle}>
              <GTags.Txt>Interactive element</GTags.Txt>
              <Switch
                size="small"
                style={{ backgroundColor: config.isHotspot ? '#7567FF' : '#BDBDBD' }}
                defaultChecked={config.isHotspot}
                onChange={(e) => setConfig(c => updateAnnotationIsHotspot(c, e))}
              />
            </div>
            {config.isHotspot && config.type !== 'cover' && (
              <>
                <div style={{ ...commonActionPanelItemStyle, marginTop: '0.25rem' }}>
                  <Tags.AnotCrtPanelSec row style={{ justifyContent: 'space-between' }}>
                    <GTags.Txt>Hide annotation</GTags.Txt>
                    <Switch
                      size="small"
                      style={{ backgroundColor: config.hideAnnotation ? '#7567FF' : '#BDBDBD' }}
                      defaultChecked={config.hideAnnotation}
                      onChange={(e) => setConfig(c => updateAnnotationHideAnnotation(c, e))}
                    />
                  </Tags.AnotCrtPanelSec>
                </div>
                <div style={commonActionPanelItemStyle}>
                  <GTags.Txt>{!config.hotspotElPath ? 'Nested element' : 'Selected'}</GTags.Txt>
                  {
                    !config.hotspotElPath ? (
                      <Tags.ActionPaneBtn
                        type="text"
                        size="small"
                        onClick={startSelectingHotspotEl}
                      >
                        Select
                      </Tags.ActionPaneBtn>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <div style={{ opacity: 0.5 }}>{hotspotElText.substring(0, 9)}</div>
                        <Tags.ActionPaneBtn
                          icon={<EditOutlined style={{ ...commonIconStyle }} />}
                          type="text"
                          size="small"
                          onClick={startSelectingHotspotEl}
                        />
                        <Tags.ActionPaneBtn
                          icon={<DeleteOutlined style={{ ...commonIconStyle }} />}
                          type="text"
                          size="small"
                          onClick={() => {
                            setConfig(c => updateAnnotationHotspotElPath(c, null));
                          }}
                        />
                        <Tags.ActionPaneBtn
                          icon={<SelectOutlined style={{ ...commonIconStyle }} />}
                          type="text"
                          size="small"
                          onClick={() => {
                            setShowHotspotAdvancedElPicker(!showHotspotAdvancedElPicker);
                          }}
                        />
                      </div>
                    )
                  }
                </div>
                {selectedHotspotEl && showHotspotAdvancedElPicker && (
                  <div style={commonActionPanelItemStyle}>
                    <AdvanceElementPicker
                      elements={selectedHotspotElsParents}
                      domElPicker={domElPicker}
                      selectedEl={selectedHotspotEl}
                      count={selectedHotspotElsParents.length}
                      setSelectedEl={(newSelEl: HTMLElement, oldSelEl: HTMLElement) => {
                        const newElPath = domElPicker.elPath(newSelEl)!;
                        setConfig(c => updateAnnotationHotspotElPath(c, newElPath));
                      }}
                      mouseLeaveHighlightMode={HighlightMode.PinnedHotspot}
                    />
                  </div>
                )}
              </>
            )}
          </ActionPanel>
        )
      }
      <ActionPanel title="Advanced">
        <div style={commonActionPanelItemStyle}>
          <GTags.Txt>Entry point</GTags.Txt>
          <Checkbox
            style={{ marginLeft: '0.75rem' }}
            checked={opts.main === qualifiedAnnotationId}
            onChange={e => {
              let newOpts;
              if (e.target.checked) {
                newOpts = updateTourDataOpts(opts, 'main', qualifiedAnnotationId);
              } else {
                newOpts = updateTourDataOpts(opts, 'main', '');
              }
              setTourDataOpts(newOpts);
            }}
          />
        </div>
        <div style={{ ...commonActionPanelItemStyle, marginTop: '0.5rem' }}>
          <GTags.Txt>Overlay</GTags.Txt>
          <Switch
            size="small"
            style={{ backgroundColor: config.showOverlay ? '#7567FF' : '#BDBDBD' }}
            defaultChecked={config.showOverlay}
            onChange={(e) => setConfig(c => updateOverlay(c, e))}
          />
        </div>
        <div style={{ ...commonActionPanelItemStyle, justifyContent: 'center', marginTop: '0.5rem', flexDirection: 'column' }}>
          <Tags.ActionPaneBtn
            type="text"
            icon={<SwitcherOutlined />}
            onClick={() => {
              convertAnnotation(getConvertAnnotationType());
            }}
          >Convert to {getConvertAnnotationType()} annotation
          </Tags.ActionPaneBtn>
          {showSelectElement && <p>Select an element from screen</p>}
        </div>
      </ActionPanel>
      <div style={{ ...commonActionPanelItemStyle, justifyContent: 'center', marginTop: '0.25rem' }}>
        <Tags.ActionPaneBtn type="text" icon={<DeleteOutlined />} danger onClick={showDeleteConfirm}>
          Delete this annotation
        </Tags.ActionPaneBtn>
      </div>
    </Tags.AnotCrtPanelCon>
  );
}
