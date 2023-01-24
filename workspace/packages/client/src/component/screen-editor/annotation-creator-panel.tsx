import React from 'react';
import {
  IAnnotationConfig,
  AnnotationPositions,
  IAnnotationTheme,
  AnnotationButtonStyle,
  AnnotationButtonSize,
  IAnnotationButton
} from '@fable/common/dist/types';
import TextArea from 'antd/lib/input/TextArea';
import Select from 'antd/lib/select';
import Button from 'antd/lib/button';
import Input from 'antd/lib/input';
import {
  DeleteOutlined,
  DisconnectOutlined,
  EditOutlined,
  EyeOutlined,
  QuestionCircleOutlined,
  SubnodeOutlined
} from '@ant-design/icons';
import Tooltip from 'antd/lib/tooltip';
import * as Tags from './styled';
import * as GTags from '../../common-styled';
import * as ATags from '../annotation/styled';

interface IProps {
  config?: IAnnotationConfig,
  globalThemeConfig?: IAnnotationTheme,
  onConfigChange: (config: IAnnotationConfig, globalThemeConfig: IAnnotationTheme) => void;
}

interface IState {
  config?: IAnnotationConfig;
  globalThemeConfig?: IAnnotationTheme;
  btnEditing: string;
}

const commonInputStyles: React.CSSProperties = {
  boxShadow: '0 0 0 1px #e0e0e0',
  background: '#f5f5f5',
  borderRadius: '4px',
};

export default class AnnotationCreatorPanel extends React.PureComponent<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      config: undefined,
      globalThemeConfig: undefined,
      btnEditing: '1234',
    };
  }

  componentDidMount() {
    this.setState({ config: this.props.config, globalThemeConfig: this.props.globalThemeConfig });
  }

  componentDidUpdate(prevProps: IProps, prevState: IState) {
    if (prevProps.config !== this.props.config || prevProps.globalThemeConfig !== this.props.globalThemeConfig) {
      this.setState({ config: this.props.config, globalThemeConfig: this.props.globalThemeConfig });
    }

    if (
      (
        this.state.config !== prevState.config
        || this.state.globalThemeConfig !== prevState.globalThemeConfig
      )
      && this.state.config
      && this.state.globalThemeConfig) {
      this.props.onConfigChange(this.state.config, this.state.globalThemeConfig);
    }
  }

  render() {
    console.log('rendering');
    const config = this.state.config;
    const globalThemeConfig = this.state.globalThemeConfig;
    if (!config || !globalThemeConfig) {
      return <></>;
    }

    return (
      <Tags.AnotCrtPanelCon>
        <Tags.AnotCrtPanelSec>
          <GTags.Txt className="title2" style={{ marginBottom: '0.25rem' }}>Body text</GTags.Txt>
          <TextArea
            style={{ ...commonInputStyles, width: '100%' }}
            rows={4}
            defaultValue={config.bodyContent}
            bordered={false}
            onBlur={e => {
              const newConfig = { ...config, bodyContent: e.target.value };
              this.setState({ config: newConfig });
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
              background: globalThemeConfig.primaryColor,
              marginRight: '0.5rem',
              marginLeft: '0.5rem'
            }}
            />
            <Input
              defaultValue={globalThemeConfig.primaryColor}
              style={{ ...commonInputStyles, width: '120px' }}
              size="small"
              bordered={false}
              onBlur={e => {
                const theme = this.state.globalThemeConfig!;
                const newTheme = { ...theme };
                newTheme.primaryColor = e.target.value;
                this.setState({ globalThemeConfig: newTheme });
              }}
            />
          </div>
        </Tags.AnotCrtPanelSec>
        <Tags.AnotCrtPanelSec>
          <GTags.Txt className="title2">Buttons</GTags.Txt>
          <Tags.AnotCrtPanelSec>
            {config.buttons.map(btnConf => {
              const primaryColor = globalThemeConfig.primaryColor;
              return (
                <Tags.AABtnCtrlLine key={btnConf.id} className={this.state.btnEditing === btnConf.id ? 'sel' : ''}>
                  <div className="a-head">
                    <ATags.ABtn
                      type="button"
                      btnStyle={btnConf.style}
                      color={primaryColor}
                      size={btnConf.size}
                    >{btnConf.text}
                    </ATags.ABtn>
                    <div style={{ display: 'flex', }}>
                      {btnConf.type === 'custom' && (
                        <Button
                          className="n-vis"
                          icon={<DeleteOutlined />}
                          type="text"
                          size="small"
                          style={{ color: '#bdbdbd' }}
                          onClick={() => {
                            const conf = this.state.config!;
                            const buttons = conf.buttons.slice(0).filter(b => b.id !== btnConf.id);
                            this.setState({ config: { ...conf, buttons } });
                          }}
                        />
                      )}
                      <Tooltip
                        placement="topRight"
                        title={
                          <GTags.Txt className="subsubhead">
                            No action defined for what would happen if user clicks this button
                          </GTags.Txt>
                        }
                      >
                        <Button icon={<DisconnectOutlined />} type="text" size="small" style={{ color: '#FF7450' }} />
                      </Tooltip>
                      <Button icon={<EyeOutlined />} type="text" size="small" style={{ color: '#bdbdbd' }} />
                      <Button
                        icon={<EditOutlined />}
                        type="text"
                        size="small"
                        style={{
                          color: '#bdbdbd'
                        }}
                        onClick={() => {
                          if (this.state.btnEditing === btnConf.id) this.setState({ btnEditing: '' });
                          else this.setState({ btnEditing: btnConf.id });
                        }}
                      />
                    </div>
                  </div>
                  {btnConf.id === this.state.btnEditing && (
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
                            const conf = this.state.config!;
                            const buttons = conf.buttons.slice(0);
                            const thisButton = buttons.map((b, i) => ([b, i] as [IAnnotationButton, number]))
                              .filter(([b, i]) => b.id === btnConf.id);
                            buttons[thisButton[0][1]] = {
                              ...thisButton[0][0],
                              style: val
                            };

                            this.setState({ config: { ...conf, buttons } });
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
                            const conf = this.state.config!;
                            const buttons = conf.buttons.slice(0);
                            const thisButton = buttons.map((b, i) => ([b, i] as [IAnnotationButton, number]))
                              .filter(([b, i]) => b.id === btnConf.id);
                            buttons[thisButton[0][1]] = {
                              ...thisButton[0][0],
                              size: val
                            };

                            this.setState({ config: { ...conf, buttons } });
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
                            const conf = this.state.config!;
                            const buttons = conf.buttons.slice(0);
                            const thisButton = buttons.map((b, i) => ([b, i] as [IAnnotationButton, number]))
                              .filter(([b, i]) => b.id === btnConf.id);
                            buttons[thisButton[0][1]] = {
                              ...thisButton[0][0],
                              text: e.target.value
                            };

                            this.setState({ config: { ...conf, buttons } });
                          }}
                        />
                      </Tags.AnotCrtPanelSec>
                      <Tags.AnotCrtPanelSec row>
                        <GTags.Txt style={{ marginRight: '0.5rem' }}>Action</GTags.Txt>
                        {btnConf.type === 'next' ? 'Select or create an annotation' : (btnConf.type === 'prev' ? 'Will be automatically detected' : 'Custom action')}
                      </Tags.AnotCrtPanelSec>
                    </div>)}
                </Tags.AABtnCtrlLine>
              );
            })}
            <Button type="link" icon={<SubnodeOutlined />} style={{ marginTop: '1rem' }}>Create a custom button</Button>
          </Tags.AnotCrtPanelSec>
        </Tags.AnotCrtPanelSec>
      </Tags.AnotCrtPanelCon>
    );
  }
}
