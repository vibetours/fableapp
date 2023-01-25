import React, { useEffect, useRef, useState } from 'react';
import {
  IAnnotationConfig,
  AnnotationPositions,
  IAnnotationTheme,
  AnnotationButtonStyle,
  AnnotationButtonSize,
  IAnnotationButton,
  AnnotationPerScreen,
  ITourEntityHotspot
} from '@fable/common/dist/types';
import TextArea from 'antd/lib/input/TextArea';
import Select from 'antd/lib/select';
import Button from 'antd/lib/button';
import Input from 'antd/lib/input';
import Popover from 'antd/lib/popover';
import Tabs from 'antd/lib/tabs';
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
  updateGlobalThemeConfig
} from '../annotation/annotation-config-utils';
import { P_RespScreen, P_RespTour } from '../../entity-processor';

interface IProps {
  screen: P_RespScreen,
  config: IAnnotationConfig,
  globalThemeConfig: IAnnotationTheme,
  allAnnotationsForTour: AnnotationPerScreen[],
  onSideEffectConfigChange: (screenId: number, config: IAnnotationConfig) => void;
  onConfigChange: (
    config: IAnnotationConfig,
    globalThemeConfig: IAnnotationTheme,
  ) => void;
}

interface IState {
  config?: IAnnotationConfig;
  globalThemeConfig?: IAnnotationTheme;
  btnEditing: string;
}

const commonInputStyles: React.CSSProperties = {
  boxShadow: '0 0 0 1px #ff74502e',
  background: '#f5f5f599',
  borderRadius: '4px',
};

const usePrevious = <T extends unknown>(value: T): T | undefined => {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

// props.allAnnotationsForTour.map(screenAnPair => (
// <div style={{display: 'flex', flexDirection: 'column'}}>
// <div>For btn {btnConf.type}</div>
// <div>For screen {screenAnPair.screen.displayName}</div>
// {screenAnPair.annotations.map(an => (
// <div style={{display: 'flex', flexDirection: 'column'}}>
// {an.bodyContent}
// </div>
// ))}
// </div>

export default function AnnotationCreatorPanel(props: IProps) {
  const [config, setConfig] = useState<IAnnotationConfig>(props.config);
  const [theme, setTheme] = useState<IAnnotationTheme>(props.globalThemeConfig);
  const [btnEditing, setBtnEditing] = useState<string>('');

  const prevConfig = usePrevious(config);
  const prevTheme = usePrevious(theme);

  useEffect(() => {
    if (
      prevConfig
      && prevTheme
      && (config.monoIncKey > prevConfig.monoIncKey || theme.monoIncKey > prevTheme.monoIncKey)) {
      props.onConfigChange(config, theme);
    }
  }, [config, theme]);

  return (
    <Tags.AnotCrtPanelCon className="e-ignr">
      <Tags.AnotCrtPanelSec>
        <GTags.Txt className="title2" style={{ marginBottom: '0.25rem' }}>Body text</GTags.Txt>
        <TextArea
          style={{ ...commonInputStyles, width: '100%' }}
          rows={4}
          defaultValue={config.bodyContent}
          bordered={false}
          onBlur={e => {
            setConfig(c => updateAnnotationText(c, e.target.value));
          }}
        />
      </Tags.AnotCrtPanelSec>
      <Tags.AnotCrtPanelSec row>
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
              <GTags.Txt className="subsubhead">
                Changing theme here affects all other annotations in this tour
              </GTags.Txt>
            }
          >
            <QuestionCircleOutlined />
          </Tooltip>
        </div>
        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center' }}>
          <GTags.Txt>Primary color</GTags.Txt>
          <div style={{
            height: '18px',
            width: '18px',
            borderRadius: '18px',
            background: theme.primaryColor,
            marginRight: '0.5rem',
            marginLeft: '0.5rem'
          }}
          />
          <Input
            defaultValue={theme.primaryColor}
            style={{ ...commonInputStyles, width: '120px' }}
            size="small"
            bordered={false}
            onBlur={e => {
              setTheme(t => updateGlobalThemeConfig(t, 'primaryColor', e.target.value));
            }}
          />
        </div>
      </Tags.AnotCrtPanelSec>
      <Tags.AnotCrtPanelSec style={{ marginBottom: 0 }}>
        <GTags.Txt className="title2">Buttons</GTags.Txt>
        <Tags.AnotCrtPanelSec style={{ marginBottom: 0 }}>
          {config.buttons.map(btnConf => {
            const primaryColor = theme.primaryColor;
            return (
              <Tags.AABtnCtrlLine key={btnConf.id} className={btnEditing === btnConf.id ? 'sel' : ''}>
                <div className="a-head">
                  <ATags.ABtn
                    type="button"
                    btnStyle={btnConf.style}
                    color={primaryColor}
                    size={btnConf.size}
                  >{btnConf.text}
                  </ATags.ABtn>
                  <div style={{ display: 'flex', }}>
                    <Tooltip
                      placement="topRight"
                      title={
                        <GTags.Txt className="subsubhead">
                          No action defined for what would happen if user clicks this button
                        </GTags.Txt>
                      }
                    >
                      <Popover
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
                                            Screen: {screenAntnPair.screen.displayName}
                                          </GTags.Txt>
                                          <div>
                                            {screenAntnPair.annotations.filter(an => an.id !== config.id).map(an => (
                                              <div style={{ margin: '0.25rem 0rem' }} key={an.id}>
                                                <Tags.AnnotationHotspotSelector
                                                  style={{
                                                    flexDirection: btnConf.type === 'next' ? 'row' : 'row-reverse',
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
                                                          actionValue:
                                                            `${props.screen.id}/${config.refId}`,
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
                                                          actionValue:
                                                            `${props.screen.id}/${config.refId}`,
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
                                        onChange={(e) => console.log(e.target.value)}
                                        size="small"
                                        style={{ marginRight: '1rem' }}
                                      />
                                      <Button type="default" size="small">Submit</Button>
                                    </div>
                                  </div>
                                )
                              }]}
                            />
                          </div>
                        }
                      >
                        <Button
                          icon={btnConf.hotspot ? <NodeIndexOutlined /> : <DisconnectOutlined />}
                          type="text"
                          size="small"
                          style={{ color: btnConf.hotspot ? '#7567FF' : '#FF7450' }}
                        />
                      </Popover>
                    </Tooltip>
                    {
                      btnConf.type === 'custom' ? (
                        <Button
                          icon={<DeleteOutlined />}
                          type="text"
                          size="small"
                          style={{ color: '#bdbdbd' }}
                          onClick={() => {
                            setConfig(c => removeButtonWithId(c, btnConf.id));
                          }}
                        />
                      ) : (
                        <Button
                          icon={btnConf.exclude ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                          type="text"
                          size="small"
                          style={{ color: '#bdbdbd' }}
                          onClick={() => {
                            setConfig(c => toggleBooleanButtonProp(c, btnConf.id, 'exclude'));
                          }}
                        />
                      )
                    }
                    <Button
                      icon={<EditOutlined />}
                      type="text"
                      size="small"
                      style={{
                        color: '#bdbdbd'
                      }}
                      onClick={() => {
                        if (btnEditing === btnConf.id) setBtnEditing('');
                        else setBtnEditing(btnConf.id);
                      }}
                    />
                  </div>
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
                        <GTags.Txt style={{ marginRight: '0.5rem' }}>Button text</GTags.Txt>
                        <Input
                          defaultValue={btnConf.text}
                          size="small"
                          bordered={false}
                          style={{ ...commonInputStyles, width: '160px', }}
                          onBlur={e => {
                            setConfig(c => updateButtonProp(c, btnConf.id, 'text', e.target.value));
                          }}
                        />
                      </Tags.AnotCrtPanelSec>
                      <Tags.AnotCrtPanelSec row>
                        <GTags.Txt style={{ marginRight: '0.5rem' }}>Action</GTags.Txt>
                        {btnConf.type === 'next' ? 'Select or create an annotation' : (btnConf.type === 'prev' ? 'Will be automatically detected' : 'Custom action')}
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
