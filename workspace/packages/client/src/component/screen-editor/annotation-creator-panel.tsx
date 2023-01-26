import React, { useEffect, useRef, useState } from 'react';
import {
  IAnnotationConfig,
  AnnotationPositions,
  AnnotationButtonStyle,
  AnnotationButtonSize,
  IAnnotationButton,
  AnnotationPerScreen,
  ITourEntityHotspot,
  ITourDataOpts
} from '@fable/common/dist/types';
import TextArea from 'antd/lib/input/TextArea';
import Select from 'antd/lib/select';
import Button from 'antd/lib/button';
import Input from 'antd/lib/input';
import Popover from 'antd/lib/popover';
import Tabs from 'antd/lib/tabs';
import Checkbox from 'antd/lib/checkbox';
import {
  ArrowRightOutlined,
  DeleteOutlined,
  DisconnectOutlined,
  EditOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  NodeIndexOutlined,
  QuestionCircleOutlined,
  SubnodeOutlined
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
  updateTourDataOpts
} from '../annotation/annotation-config-utils';
import { P_RespScreen, P_RespTour } from '../../entity-processor';

interface IProps {
  screen: P_RespScreen,
  config: IAnnotationConfig,
  opts: ITourDataOpts,
  allAnnotationsForTour: AnnotationPerScreen[],
  onSideEffectConfigChange: (screenId: number, config: IAnnotationConfig) => void;
  onConfigChange: (
    config: IAnnotationConfig,
    opts: ITourDataOpts,
  ) => void;
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

const commonIconStyle : React.CSSProperties = {
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

  const prevConfig = usePrevious(config);
  const prevOpts = usePrevious(opts);

  useEffect(() => {
    if (
      prevConfig
      && prevOpts
      && (config.monoIncKey > prevConfig.monoIncKey
        || opts.monoIncKey > prevOpts.monoIncKey)) {
      props.onConfigChange(config, opts);
    }
  }, [config, opts]);

  const qualifiedAnnotationId = `${props.screen.id}/${props.config.refId}`;
  return (
    <Tags.AnotCrtPanelCon className="e-ignr">
      <Tags.AnotCrtPanelSec>
        {/*
        <Tags.AnotCrtPanelSecLabel>
          <div>
            <span style={{ width: '1rem' }} />
            <GTags.Txt className="title2" style={{ marginBottom: '0.25rem' }}>Body text</GTags.Txt>
          </div>
          <div />
        </Tags.AnotCrtPanelSecLabel>
        */}
        <TextArea
          style={{ ...commonInputStyles, width: '100%', backgroundColor: '#FFF' }}
          rows={3}
          defaultValue={config.bodyContent}
          bordered={false}
          onBlur={e => {
            setConfig(c => updateAnnotationText(c, e.target.value));
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
        <div
          style={{
            marginTop: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <GTags.Txt>Primary color</GTags.Txt>
          <div
            style={{
              ...commonInputStyles,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxSizing: 'border-box',
              width: '120px',
              padding: '0.4rem 0.6rem',
            }}
          >
            <div>
              <div style={{
                height: '18px',
                width: '18px',
                borderRadius: '18rem',
                background: opts.primaryColor,
              }}
              />
            </div>
            <Input
              defaultValue={opts.primaryColor}
              size="small"
              bordered={false}
              onBlur={e => {
                setTourDataOpts(t => updateTourDataOpts(t, 'primaryColor', e.target.value));
              }}
            />
          </div>
        </div>
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
                                    <GTags.Txt>
                                      Select an annotation that would be navigated to when the button is clicked
                                    </GTags.Txt>
                                    <div>
                                      {props.allAnnotationsForTour.map(screenAntnPair => (
                                        <div key={screenAntnPair.screen.id}>
                                          <GTags.Txt className="title2">
                                            {
                                              screenAntnPair.screen.id === props.screen.id
                                                ? 'Current screen'
                                                : `Screen: ${screenAntnPair.screen.displayName}`
                                            }
                                          </GTags.Txt>
                                          <div>
                                            {screenAntnPair.annotations.filter(an => an.id !== config.id).map(an => (
                                              <div style={{ margin: '0.25rem 0rem' }} key={an.id}>
                                                <Tags.AnnotationHotspotSelector
                                                  style={{
                                                    flexDirection: btnConf.type === 'prev' ? 'row-reverse' : 'row',
                                                  }}
                                                  onClick={e => {
                                                    let navigateTo = '';
                                                    if (btnConf.type === 'prev') {
                                                      //  prev annotation's next button should point to this annotation
                                                      //  this annotation's prev button should point to prev annotation
                                                      //    => navigateTo
                                                      const nextBtnOfPrevAntn = an.buttons
                                                        .find(btn => btn.type === 'next');
                                                      const prevAntn = updateButtonProp(
                                                        an,
                                                        nextBtnOfPrevAntn!.id,
                                                        'hotspot',
                                                        {
                                                          type: 'an-btn',
                                                          on: 'click',
                                                          target: '$this',
                                                          actionType: 'navigate',
                                                          actionValue: qualifiedAnnotationId,
                                                        } as ITourEntityHotspot
                                                      );
                                                      props.onSideEffectConfigChange(
                                                        screenAntnPair.screen.id,
                                                        prevAntn
                                                      );
                                                    } else if (btnConf.type === 'next') {
                                                      // this annotations next button should point to next annotaiton
                                                      //    => navigateTo
                                                      // next annotations prev button should point to this annotation
                                                      const prevBtnOfNextAntn = an.buttons
                                                        .find(btn => btn.type === 'prev');
                                                      const nextAntn = updateButtonProp(
                                                        an,
                                                        prevBtnOfNextAntn!.id,
                                                        'hotspot',
                                                        {
                                                          type: 'an-btn',
                                                          on: 'click',
                                                          target: '$this',
                                                          actionType: 'navigate',
                                                          actionValue: qualifiedAnnotationId,
                                                        } as ITourEntityHotspot
                                                      );
                                                      props.onSideEffectConfigChange(
                                                        screenAntnPair.screen.id,
                                                        nextAntn
                                                      );
                                                    } else {
                                                      // just one way connection
                                                    }
                                                    navigateTo = `${screenAntnPair.screen.id}/${an.refId}`;
                                                    const thisAntn = updateButtonProp(config, btnConf.id, 'hotspot', {
                                                      type: 'an-btn',
                                                      on: 'click',
                                                      target: '$this',
                                                      actionType: 'navigate',
                                                      actionValue: navigateTo,
                                                    } as ITourEntityHotspot);
                                                    setConfig(thisAntn);
                                                    setOpenConnectionPopover('');
                                                  }}
                                                >
                                                  {btnConf.type !== 'custom' && (
                                                    <div style={{ fontSize: '1.5rem', margin: '0rem 1.5rem' }}>
                                                      <ArrowRightOutlined />
                                                    </div>
                                                  )}
                                                  <div style={{
                                                    background: '#d0d0ff',
                                                    borderRadius: '8px',
                                                    padding: '0.25rem 0.5rem 0.25rem 0.5rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                  }}
                                                  >
                                                    <GTags.Txt className="subhead">{an.bodyContent}</GTags.Txt>
                                                  </div>
                                                </Tags.AnnotationHotspotSelector>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
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
    </Tags.AnotCrtPanelCon>

  );
}
