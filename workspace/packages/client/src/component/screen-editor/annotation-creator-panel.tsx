import React, { useEffect, useRef, useState } from 'react';
import {
  AnnotationBodyTextSize,
  AnnotationButtonSize,
  AnnotationButtonStyle,
  AnnotationPositions,
  EAnnotationBoxSize,
  IAnnotationConfig,
  ITourDataOpts,
  ITourEntityHotspot,
  VideoAnnotationPositions
} from '@fable/common/dist/types';
import Select from 'antd/lib/select';
import Button from 'antd/lib/button';
import Input from 'antd/lib/input';
import Popover from 'antd/lib/popover';
import Tabs from 'antd/lib/tabs';
import Checkbox from 'antd/lib/checkbox';
import Modal from 'antd/lib/modal';
import Switch from 'antd/lib/switch';
import Collapse from 'antd/lib/collapse';
import {
  ArrowRightOutlined,
  DeleteOutlined,
  DisconnectOutlined,
  EditOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  NodeIndexOutlined,
  QuestionCircleOutlined,
  SubnodeOutlined,
  ExclamationCircleOutlined,
  VideoCameraAddOutlined,
  VideoCameraOutlined,
  SelectOutlined
} from '@ant-design/icons';
import Tooltip from 'antd/lib/tooltip';
import { ScreenType } from '@fable/common/dist/api-contract';
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
  deleteAnnotation,
  updateAnnotationBoxSize,
  updateAnnotationBodyTextSize,
  updateAnnotationIsHotspot,
  updateAnnotationHideAnnotation,
  updateAnnotationVideoURL,
  updateAnnotationHotspotElPath,
  isBlankString,
  updateAnnotationPositioning,
} from '../annotation/annotation-config-utils';
import { P_RespScreen } from '../../entity-processor';
import AnnotationRichTextEditor from './annotation-rich-text-editor';
import { AnnotationMutationType, AnnotationPerScreen, IdxAnnotationMutation } from '../../types';
import DomElPicker, { HighlightMode } from './dom-element-picker';
import AdvanceElementPicker from './advance-element.picker';
import VideoRecorder from './video-recorder';
import ActionPanel from './action-panel';
import { hotspotHelpText } from './helptexts';

const { confirm } = Modal;
const { Panel } = Collapse;

interface IProps {
  screen: P_RespScreen,
  config: IAnnotationConfig,
  opts: ITourDataOpts,
  allAnnotationsForTour: AnnotationPerScreen[],
  onSideEffectConfigChange: (screenId: number, config: IAnnotationConfig, actionType: AnnotationMutationType) => void;
  onConfigChange: (
    config: IAnnotationConfig,
    actionType: 'upsert' | 'delete',
    opts: ITourDataOpts,
  ) => void;
  selectedHotspotEl: HTMLElement | null;
  setSelectionMode: (mode: 'annotation' | 'hotspot') => void;
  domElPicker: DomElPicker | null
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

export default function AnnotationCreatorPanel(props: IProps) {
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

  function isVideoAnnotation() {
    return !isBlankString(config.videoUrl)
    || (!isBlankString(config.videoUrlMp4) && !isBlankString(config.videoUrlWebm));
  }

  const prevConfig = usePrevious(config);
  const prevOpts = usePrevious(opts);

  const domElPicker = props.domElPicker!;

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

  const showDeleteConfirm = () => {
    confirm({
      title: 'Are you sure you want to delete this annotation?',
      icon: <ExclamationCircleOutlined />,
      okText: 'Yes',
      okType: 'danger',
      onOk: () => {
        const [mutationUpdates, newMain] = deleteAnnotation(props.allAnnotationsForTour, config, null, opts);
        for (const update of mutationUpdates) {
          const screenId = update[IdxAnnotationMutation.ScreenId];
          if (screenId === null) {
            let newOpts = opts;
            if (newMain.length !== 0) {
              newOpts = updateTourDataOpts(opts, 'main', newMain);
            }
            props.onConfigChange(
              update[IdxAnnotationMutation.Config],
              update[IdxAnnotationMutation.MutationType],
              newOpts
            );
          } else {
            props.onSideEffectConfigChange(
              screenId,
              update[IdxAnnotationMutation.Config],
              update[IdxAnnotationMutation.MutationType]
            );
          }
        }
      },

    });
  };

  const startSelectingHotspotEl = () => {
    props.setSelectionMode('hotspot');
    const boundedEl = domElPicker.elFromPath(props.config.id);
    domElPicker.setSelectedBoundedEl(boundedEl!);
    domElPicker.setSelectionMode();
    setNewHotspotSelected(true);
  };

  // TODO[siddhi] sometime videourl is blank and videoUrlMp4 and videoUrlMp4 is present.
  // video url should always be present
  const videoUrl = () => config.videoUrl || config.videoUrlMp4 || config.videoUrlWebm;

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
            defaultValue={config.videoUrl}
            style={{ ...commonInputStyles, border: 'none', padding: 'none', flexGrow: 1 }}
            onClick={() => setShowVideoRecorder(true)}
            icon={videoUrl() ? (<VideoCameraOutlined />) : (<VideoCameraAddOutlined />)}
          >
            {videoUrl() ? 'Record Again' : 'Record Video'}
          </Tags.ActionPaneBtn>
        </div>
        {showVideoRecorder && (
        <VideoRecorder
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
            options={isVideoAnnotation() ? Object.values(VideoAnnotationPositions).map(v => ({
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
            options={Object.values(isVideoAnnotation() ? ['medium', 'large'] : ['small', 'medium', 'large']).map(v => ({
              value: v,
              label: `${v}`
            }))}
            onChange={(e) => setConfig(c => updateAnnotationBoxSize(c, e as EAnnotationBoxSize))}
          />
        </div>
        <div style={commonActionPanelItemStyle}>
          <GTags.Txt style={{}}>Body text sizing</GTags.Txt>
          <Tags.ActionPaneSelect
            defaultValue={config.bodyTextSize}
            size="small"
            bordered={false}
            options={Object.entries(AnnotationBodyTextSize).map(([key, value]) => ({
              value,
              label: key
            }))}
            disabled={isVideoAnnotation()}
            onChange={(e) => setConfig(c => updateAnnotationBodyTextSize(c, e as AnnotationBodyTextSize))}
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
              onBlur={e => {
                setTourDataOpts(t => updateTourDataOpts(t, 'primaryColor', e.target.value));
              }}
              disabled={isVideoAnnotation()}
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
              onBlur={e => {
                setTourDataOpts(t => updateTourDataOpts(t, 'annotationBodyBackgroundColor', e.target.value));
              }}
              disabled={isVideoAnnotation()}
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
              onBlur={e => {
                setTourDataOpts(t => updateTourDataOpts(t, 'annotationBodyBorderColor', e.target.value));
              }}
            />
          </Tags.ColorInputWrapper>
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
                    type="button"
                    btnStyle={btnConf.style}
                    color={primaryColor}
                    size={btnConf.size}
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
                            defaultActiveKey="navigate"
                            style={{ fontSize: '0.95rem' }}
                            size="small"
                            items={[{
                              key: 'navigate',
                              label: 'Navigate to',
                              children: (
                                <div>
                                  <GTags.Txt className="title">
                                    Use the canvas to make connection between annotations
                                  </GTags.Txt>
                                </div>
                              )
                            }, {
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
                                        const thisAntn = updateButtonProp(config, btnConf.id, 'hotspot', {
                                          type: 'an-btn',
                                          on: 'click',
                                          target: '$this',
                                          actionType: 'open',
                                          actionValue: e.target.value,
                                        } as ITourEntityHotspot);
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
            style={{ backgroundColor: opts.showOverlay ? '#7567FF' : '#BDBDBD' }}
            defaultChecked={opts.showOverlay}
            onChange={(e) => setTourDataOpts(t => updateTourDataOpts(t, 'showOverlay', e))}
          />
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
