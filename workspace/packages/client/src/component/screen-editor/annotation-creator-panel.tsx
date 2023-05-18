import React, { useEffect, useRef, useState } from 'react';
import {
  AnnotationBodyTextSize,
  AnnotationButtonSize,
  AnnotationButtonStyle,
  AnnotationPositions,
  EAnnotationBoxSize,
  IAnnotationConfig,
  ITourDataOpts,
  ITourEntityHotspot
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
  ExclamationCircleOutlined
} from '@ant-design/icons';
import Tooltip from 'antd/lib/tooltip';
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
} from '../annotation/annotation-config-utils';
import { P_RespScreen } from '../../entity-processor';
import AnnotationRichTextEditor from './annotation-rich-text-editor';
import { AnnotationMutationType, AnnotationPerScreen } from '../../types';
import DomElPicker, { HighlightMode } from './dom-element-picker';
import AdvanceElementPicker from './advance-element.picker';
import VideoRecorder from './video-recorder';

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
  borderRadius: '8px',
  border: '1px solid #DDDDDD',
  fontSize: '1rem',
  backgroundColor: '#f9f9f9',
  padding: '0.4rem 0.6rem'
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
  border: '1px solid #DDDDDD',
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
  const [openConnectionPopover, setOpenConnectionPopover] = useState<string>('');
  const [newHotspotSelected, setNewHotspotSelected] = useState<boolean>(false);
  const [selectedHotspotEl, setSelectedHotspotEl] = useState<HTMLElement>();
  const [selectedHotspotElsParents, setSelectedHotspotElsParents] = useState<Node[]>([]);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);

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
    if (config.hotspotElPath) {
      const hotspotEl = domElPicker.elFromPath(config.hotspotElPath)!;
      if (hotspotEl) {
        setSelectedHotspotEl(hotspotEl);
        const boundedEl = domElPicker.elFromPath(props.config.id)!;
        domElPicker.setSelectedBoundedEl(boundedEl);
        const parents = domElPicker.getParents(hotspotEl);
        setSelectedHotspotElsParents(parents!);
        domElPicker.setSelectedBoundedEl(null);
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
        const mutationUpdates = deleteAnnotation(props.allAnnotationsForTour, config, null);
        for (const update of mutationUpdates) {
          if (update[0] === null) {
            props.onConfigChange(update[1], update[2], opts);
          } else {
            props.onSideEffectConfigChange(update[0], update[1], update[2]);
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

  const qualifiedAnnotationId = `${props.screen.id}/${props.config.refId}`;
  return (
    <Tags.AnotCrtPanelCon className="e-ignr">
      <Tags.AnotCrtPanelSec>
        <GTags.Txt>Change text content</GTags.Txt>
        <AnnotationRichTextEditor
          onBlurHandler={(htmlString, displayText) => {
            setConfig(c => updateAnnotationText(c, htmlString, displayText));
          }}
          defaultValue={config.bodyContent}
        />
      </Tags.AnotCrtPanelSec>
      <Tags.AnotCrtPanelSec row>
        <div style={{ display: 'flex' }}>
          <GTags.Txt className="title2" style={{ marginRight: '0.5rem' }}>Entry point</GTags.Txt>
          <Tooltip
            placement="right"
            title={
              <GTags.Txt className="subsubhead" color="#fff">
                Is this the annotaiton user would see when they load first. Ideally for this annotation, there won't be
                any Back button visible.
              </GTags.Txt>
          }
          >
            <QuestionCircleOutlined />
          </Tooltip>
        </div>
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
      </Tags.AnotCrtPanelSec>
      <Tags.AnotCrtPanelSec row style={{ justifyContent: 'space-between' }}>
        <GTags.Txt className="title2" style={{ marginRight: '0.5rem' }}>Positioning</GTags.Txt>
        <Select
          defaultValue={config.positioning}
          size="small"
          bordered={false}
          style={{ ...commonInputStyles, minWidth: '120px', }}
          options={Object.values(AnnotationPositions).map(v => ({
            value: v,
            label: `${v} ${v === AnnotationPositions.Auto ? '' : '(not yet supported)'}`,
            disabled: v !== AnnotationPositions.Auto
          }))}
        />
      </Tags.AnotCrtPanelSec>
      <Tags.AnotCrtPanelSec row style={{ justifyContent: 'space-between' }}>
        <GTags.Txt className="title2" style={{ marginRight: '0.5rem' }}>Box sizing</GTags.Txt>
        <Select
          defaultValue={config.size ?? 'small'}
          size="small"
          bordered={false}
          style={{ ...commonInputStyles, minWidth: '120px', }}
          options={Object.values(['small', 'medium', 'large']).map(v => ({
            value: v,
            label: `${v}`
          }))}
          onChange={(e: EAnnotationBoxSize) => setConfig(c => updateAnnotationBoxSize(c, e))}
        />
      </Tags.AnotCrtPanelSec>
      <Tags.AnotCrtPanelSec row style={{ justifyContent: 'space-between' }}>
        <GTags.Txt className="title2" style={{ marginRight: '0.5rem' }}>Body text sizing</GTags.Txt>
        <Select
          defaultValue={config.bodyTextSize}
          size="small"
          bordered={false}
          style={{ ...commonInputStyles, minWidth: '120px', }}
          options={Object.entries(AnnotationBodyTextSize).map(([key, value]) => ({
            value,
            label: key
          }))}
          onChange={(e: AnnotationBodyTextSize) => setConfig(c => updateAnnotationBodyTextSize(c, e))}
        />
      </Tags.AnotCrtPanelSec>
      <Tags.AnotCrtPanelSec row style={{ justifyContent: 'space-between' }}>
        <GTags.Txt className="title2" style={{ marginRight: '0.5rem' }}>Video Annotation</GTags.Txt>
        <Button
          defaultValue={config.videoUrl}
          style={{ ...commonInputStyles, maxWidth: '120px', padding: 'none' }}
          onClick={() => setShowVideoRecorder(true)}
        >
          Record
        </Button>
      </Tags.AnotCrtPanelSec>
      {showVideoRecorder && (
        <VideoRecorder
          closeRecorder={() => setShowVideoRecorder(false)}
          setConfig={setConfig}
        />
      )}
      {
        config.type !== 'cover' && (
          <Tags.AnotCrtPanelSec row style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <GTags.Txt className="title2" style={{ marginRight: '0.5rem' }}>Hotspot</GTags.Txt>
              <Tooltip
                placement="right"
                title={
                  <GTags.Txt className="subsubhead" style={{ color: 'white' }}>
                    If the element is made hotspot, user can click on the element to go to the next annotation.
                  </GTags.Txt>
                }
              >
                <QuestionCircleOutlined />
              </Tooltip>
            </div>
            <Switch
              style={{ backgroundColor: config.isHotspot ? '#7567FF' : '#BDBDBD' }}
              defaultChecked={config.isHotspot}
              onChange={(e) => setConfig(c => updateAnnotationIsHotspot(c, e))}
            />
          </Tags.AnotCrtPanelSec>
        )
      }
      {
        config.isHotspot && config.type !== 'cover' && (
          <Tags.AnotCrtPanelSec row style={{ justifyContent: 'space-between' }}>
            <GTags.Txt className="title2" style={{ marginRight: '0.5rem' }}>Hide Annotation</GTags.Txt>
            <Switch
              style={{ backgroundColor: config.hideAnnotation ? '#7567FF' : '#BDBDBD' }}
              defaultChecked={config.hideAnnotation}
              onChange={(e) => setConfig(c => updateAnnotationHideAnnotation(c, e))}
            />
          </Tags.AnotCrtPanelSec>
        )
      }
      {
        config.isHotspot && config.type !== 'cover' && (
          <>
            <Tags.AnotCrtPanelSec row style={{ justifyContent: 'space-between' }}>
              <GTags.Txt className="title2" style={{ marginRight: '0.5rem' }}>Hotspot element</GTags.Txt>
              {
                !config.hotspotElPath && (
                  <Button
                    type="text"
                    style={{
                      ...commonInputStyles,
                      padding: 'none',
                    }}
                    onClick={startSelectingHotspotEl}
                  >
                    Select
                  </Button>
                )
              }
            </Tags.AnotCrtPanelSec>
            {
              config.hotspotElPath && (
                <>
                  <div style={{
                    marginBottom: '1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  >
                    <div>{domElPicker.elFromPath(config.hotspotElPath)!.textContent}</div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Button
                        icon={<EditOutlined style={{ ...commonIconStyle }} />}
                        type="text"
                        size="small"
                        style={{
                          color: '#bdbdbd',
                          ...buttonSecStyle,
                        }}
                        onClick={startSelectingHotspotEl}
                      />
                      <Button
                        icon={<DeleteOutlined style={{ ...commonIconStyle }} />}
                        type="text"
                        size="small"
                        style={{
                          color: '#bdbdbd',
                          ...buttonSecStyle,
                        }}
                        onClick={() => {
                          setConfig(c => updateAnnotationHotspotElPath(c, null));
                        }}
                      />
                    </div>
                  </div>
                  <Collapse
                    bordered={false}
                    style={{
                      marginBottom: '1rem',
                    }}
                  >
                    {
                      selectedHotspotEl && (
                        <Panel
                          header="Advanced element picker"
                          key="1"
                          style={{
                            fontSize: '14px',
                            margin: 0,
                            padding: 0
                          }}
                        >
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
                        </Panel>
                      )
                    }
                  </Collapse>
                </>
              )
            }
          </>
        )
      }
      <Tags.AnotCrtPanelSec>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <GTags.Txt className="title2" style={{ marginRight: '0.5rem' }}>Theme </GTags.Txt>
          <Tooltip
            placement="right"
            title={
              <GTags.Txt className="subsubhead" style={{ color: 'white' }}>
                Changing theme here affects all other annotations in this tour
              </GTags.Txt>
            }
          >
            <QuestionCircleOutlined />
          </Tooltip>
        </div>
        <Tags.InputContainer>
          <GTags.Txt>Primary color</GTags.Txt>
          <Tags.ColorInputWrapper
            style={{
              ...commonInputStyles,
            }}
          >
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
            />
          </Tags.ColorInputWrapper>
        </Tags.InputContainer>
        <Tags.InputContainer>
          <GTags.Txt>Background color</GTags.Txt>
          <Tags.ColorInputWrapper
            style={{
              ...commonInputStyles,
            }}
          >
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
            />
          </Tags.ColorInputWrapper>
        </Tags.InputContainer>
        <Tags.InputContainer>
          <GTags.Txt>Border color</GTags.Txt>
          <Tags.ColorInputWrapper
            style={{
              ...commonInputStyles,
            }}
          >
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
        </Tags.InputContainer>
        <Tags.InputContainer>
          <GTags.Txt>Overlay</GTags.Txt>
          <Switch
            style={{ backgroundColor: opts.showOverlay ? '#7567FF' : '#BDBDBD' }}
            defaultChecked={opts.showOverlay}
            onChange={(e) => setTourDataOpts(t => updateTourDataOpts(t, 'showOverlay', e))}
          />
        </Tags.InputContainer>
      </Tags.AnotCrtPanelSec>
      <Tags.AnotCrtPanelSec style={{ marginBottom: 0 }}>
        <GTags.Txt className="title2">Buttons</GTags.Txt>
        <Tags.AnotCrtPanelSec style={{ marginBottom: 0 }}>
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
                                        type="default"
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
                {
                  btnConf.id === btnEditing && (
                    <div className="n-details">
                      <Tags.AnotCrtPanelSec row>
                        <GTags.Txt style={{ marginRight: '0.5rem' }}>Button style</GTags.Txt>
                        <Select
                          defaultValue={btnConf.style}
                          size="small"
                          bordered={false}
                          style={{ ...commonInputStyles, minWidth: '120px', }}
                          options={Object.values(AnnotationButtonStyle).map(v => ({
                            value: v,
                            label: v,
                          }))}
                          onSelect={(val: AnnotationButtonStyle) => {
                            setConfig(c => updateButtonProp(c, btnConf.id, 'style', val));
                          }}
                        />
                      </Tags.AnotCrtPanelSec>
                      <Tags.AnotCrtPanelSec row>
                        <GTags.Txt style={{ marginRight: '0.5rem' }}>Button size</GTags.Txt>
                        <Select
                          defaultValue={btnConf.size}
                          size="small"
                          bordered={false}
                          style={{ ...commonInputStyles, minWidth: '120px', }}
                          options={Object.values(AnnotationButtonSize).map(v => ({
                            value: v,
                            label: v,
                          }))}
                          onSelect={(val: AnnotationButtonSize) => {
                            setConfig(c => updateButtonProp(c, btnConf.id, 'size', val));
                          }}
                        />
                      </Tags.AnotCrtPanelSec>
                      <Tags.AnotCrtPanelSec row>
                        {/* <GTags.Txt style={{ marginRight: '0.5rem' }}>Button text</GTags.Txt> */}
                        <Input
                          defaultValue={btnConf.text}
                          size="small"
                          bordered={false}
                          style={{
                            ...commonInputStyles,
                            width: '100%',
                            backgroundColor: '#fff'
                          }}
                          placeholder="Button text"
                          onBlur={e => {
                            setConfig(c => updateButtonProp(c, btnConf.id, 'text', e.target.value));
                          }}
                        />
                      </Tags.AnotCrtPanelSec>
                    </div>)
                }
              </Tags.AABtnCtrlLine>
            );
          })}
          <Button
            type="link"
            icon={<SubnodeOutlined />}
            style={{ marginTop: '1rem' }}
            onClick={() => {
              setConfig(c => addCustomBtn(c));
            }}
          >Create a custom button
          </Button>
        </Tags.AnotCrtPanelSec>
      </Tags.AnotCrtPanelSec>
      <Tags.AnotCrtPanelSec>
        <Button type="text" icon={<DeleteOutlined />} danger onClick={showDeleteConfirm}>
          Delete this annotation
        </Button>
      </Tags.AnotCrtPanelSec>
    </Tags.AnotCrtPanelCon>

  );
}

// {props.allAnnotationsForTour.map(screenAntnPair => (
//                                         <div key={screenAntnPair.screen.id}>
//                                           <GTags.Txt className="title2">
//                                             {
//                                               screenAntnPair.screen.id === props.screen.id
//                                                 ? 'Current screen'
//                                                 : `Screen: ${screenAntnPair.screen.displayName}`
//                                             }
//                                           </GTags.Txt>
//                                           <div>
//                                             {screenAntnPair.annotations.filter(an => an.id !== config.id).map(an => (
//                                               <div style={{ margin: '0.25rem 0rem' }} key={an.id}>
//                                                 <Tags.AnnotationHotspotSelector
//                                                   style={{
//                                                     flexDirection: btnConf.type === 'prev' ? 'row-reverse' : 'row',
//                                                   }}
//                                                   onClick={e => {
//                                                     // A similar canvas like logic would be needed here
//                                                     // the commented out logic is incomplete

//                                                     // let navigateTo = '';
//                                                     // if (btnConf.type === 'prev') {
//                                                     //   //  prev annotation's next button should point to this annotation
//                                                     //   //  this annotation's prev button should point to prev annotation
//                                                     //   //    => navigateTo
//                                                     //   const nextBtnOfPrevAntn = an.buttons
//                                                     //     .find(btn => btn.type === 'next');
//                                                     //   const prevAntn = updateButtonProp(
//                                                     //     an,
//                                                     //     nextBtnOfPrevAntn!.id,
//                                                     //     'hotspot',
//                                                     //     {
//                                                     //       type: 'an-btn',
//                                                     //       on: 'click',
//                                                     //       target: '$this',
//                                                     //       actionType: 'navigate',
//                                                     //       actionValue: qualifiedAnnotationId,
//                                                     //     } as ITourEntityHotspot
//                                                     //   );
//                                                     //   props.onSideEffectConfigChange(
//                                                     //     screenAntnPair.screen.id,
//                                                     //     prevAntn,
//                                                     //     'upsert'
//                                                     //   );
//                                                     // } else if (btnConf.type === 'next') {
//                                                     //   // this annotations next button should point to next annotaiton
//                                                     //   //    => navigateTo
//                                                     //   // next annotations prev button should point to this annotation
//                                                     //   const prevBtnOfNextAntn = an.buttons
//                                                     //     .find(btn => btn.type === 'prev');
//                                                     //   const nextAntn = updateButtonProp(
//                                                     //     an,
//                                                     //     prevBtnOfNextAntn!.id,
//                                                     //     'hotspot',
//                                                     //     {
//                                                     //       type: 'an-btn',
//                                                     //       on: 'click',
//                                                     //       target: '$this',
//                                                     //       actionType: 'navigate',
//                                                     //       actionValue: qualifiedAnnotationId,
//                                                     //     } as ITourEntityHotspot
//                                                     //   );
//                                                     //   props.onSideEffectConfigChange(
//                                                     //     screenAntnPair.screen.id,
//                                                     //     nextAntn,
//                                                     //     'upsert'
//                                                     //   );
//                                                     // } else {
//                                                     //   // just one way connection
//                                                     // }
//                                                     // navigateTo = `${screenAntnPair.screen.id}/${an.refId}`;
//                                                     // const thisAntn = updateButtonProp(config, btnConf.id, 'hotspot', {
//                                                     //   type: 'an-btn',
//                                                     //   on: 'click',
//                                                     //   target: '$this',
//                                                     //   actionType: 'navigate',
//                                                     //   actionValue: navigateTo,
//                                                     // } as ITourEntityHotspot);
//                                                     // setConfig(thisAntn);
//                                                     // setOpenConnectionPopover('');
//                                                   }}
//                                                 >
//                                                   {btnConf.type !== 'custom' && (
//                                                     <div style={{ fontSize: '1.5rem', margin: '0rem 1.5rem' }}>
//                                                       <ArrowRightOutlined />
//                                                     </div>
//                                                   )}
//                                                   <div style={{
//                                                     background: '#d0d0ff',
//                                                     borderRadius: '8px',
//                                                     padding: '0.25rem 0.5rem 0.25rem 0.5rem',
//                                                     display: 'flex',
//                                                     alignItems: 'center',
//                                                     justifyContent: 'center'
//                                                   }}
//                                                   >
//                                                     <GTags.Txt className="subhead">{an.bodyContent}</GTags.Txt>
//                                                   </div>
//                                                 </Tags.AnnotationHotspotSelector>
//                                               </div>
//                                             ))}
//                                           </div>
//                                         </div>
//                                       ))}
