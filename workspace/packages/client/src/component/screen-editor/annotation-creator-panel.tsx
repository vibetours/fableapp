import React, {useEffect, useRef, useState} from 'react';
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
  EyeInvisibleOutlined,
  EyeOutlined,
  QuestionCircleOutlined,
  SubnodeOutlined
} from '@ant-design/icons';
import Tooltip from 'antd/lib/tooltip';
import * as Tags from './styled';
import * as GTags from '../../common-styled';
import * as ATags from '../annotation/styled';
import {addCustomBtn, removeButtonWithId, toggleBooleanButtonProp, updateAnnotationText, updateButtonProp, updateGlobalThemeConfig} from '../annotation/annotation-config-utils';

interface IProps {
  config: IAnnotationConfig,
  globalThemeConfig: IAnnotationTheme,
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

export default function AnnotationCreatorPanel(props: IProps) {
  const [config, setConfig] = useState<IAnnotationConfig>(props.config);
  const [theme, setTheme] = useState<IAnnotationTheme>(props.globalThemeConfig);
  const [btnEditing, setBtnEditing] = useState<string>('');

  useEffect(() => {
    props.onConfigChange(config, theme);
  }, [config, theme]);

  return (
    <Tags.AnotCrtPanelCon className="e-ignr">
      <Tags.AnotCrtPanelSec>
        <GTags.Txt className="title2" style={{marginBottom: '0.25rem'}}>Body text</GTags.Txt>
        <TextArea
          style={{...commonInputStyles, width: '100%'}}
          rows={4}
          defaultValue={config.bodyContent}
          bordered={false}
          onBlur={e => {
            setConfig(c => updateAnnotationText(c, e.target.value));
            // this.setState(state => {});
            // this.setState({config: updateAnnotationText(this.state.config!, e.target.value) });
          }}
        />
      </Tags.AnotCrtPanelSec>
      <Tags.AnotCrtPanelSec row>
        <GTags.Txt className="title2" style={{marginRight: '0.5rem'}}>Positioning</GTags.Txt>
        <Select
          defaultValue={config.positioning}
          size="small"
          bordered={false}
          style={{...commonInputStyles, minWidth: '120px', }}
          options={Object.values(AnnotationPositions).map(v => ({
            value: v,
            label: `${v} ${v === AnnotationPositions.Auto ? '' : '(not yet supported)'}`,
            disabled: v !== AnnotationPositions.Auto
          }))}
        />
      </Tags.AnotCrtPanelSec>
      <Tags.AnotCrtPanelSec>
        <div style={{display: 'flex', alignItems: 'center'}}>
          <GTags.Txt className="title2" style={{marginRight: '0.5rem'}}>Theme </GTags.Txt>
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
        <div style={{marginTop: '0.5rem', display: 'flex', alignItems: 'center'}}>
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
            style={{...commonInputStyles, width: '120px'}}
            size="small"
            bordered={false}
            onBlur={e => {
              setTheme(t => updateGlobalThemeConfig(t, 'primaryColor', e.target.value));
            }}
          />
        </div>
      </Tags.AnotCrtPanelSec>
      <Tags.AnotCrtPanelSec style={{marginBottom: 0}}>
        <GTags.Txt className="title2">Buttons</GTags.Txt>
        <Tags.AnotCrtPanelSec style={{marginBottom: 0}}>
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
                  <div style={{display: 'flex', }}>
                    <Tooltip
                      placement="topRight"
                      title={
                        <GTags.Txt className="subsubhead">
                          No action defined for what would happen if user clicks this button
                        </GTags.Txt>
                      }
                    >
                      <Button icon={<DisconnectOutlined />} type="text" size="small" style={{color: '#FF7450'}} />
                    </Tooltip>
                    {btnConf.type === 'custom' ? (
                      <Button
                        icon={<DeleteOutlined />}
                        type="text"
                        size="small"
                        style={{color: '#bdbdbd'}}
                        onClick={() => {
                          setConfig(c => removeButtonWithId(c, btnConf.id));
                        }}
                      />
                    ) : (
                      <Button
                        icon={btnConf.exclude ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                        type="text"
                        size="small"
                        style={{color: '#bdbdbd'}}
                        onClick={() => {
                          setConfig(c => toggleBooleanButtonProp(c, btnConf.id, 'exclude'));
                        }}
                      />
                    )}
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
                {btnConf.id === btnEditing && (
                  <div className="n-details">
                    <Tags.AnotCrtPanelSec row>
                      <GTags.Txt style={{marginRight: '0.5rem'}}>Button style</GTags.Txt>
                      <Select
                        defaultValue={btnConf.style}
                        size="small"
                        bordered={false}
                        style={{...commonInputStyles, minWidth: '120px', }}
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
                      <GTags.Txt style={{marginRight: '0.5rem'}}>Button size</GTags.Txt>
                      <Select
                        defaultValue={btnConf.size}
                        size="small"
                        bordered={false}
                        style={{...commonInputStyles, minWidth: '120px', }}
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
                      <GTags.Txt style={{marginRight: '0.5rem'}}>Button text</GTags.Txt>
                      <Input
                        defaultValue={btnConf.text}
                        size="small"
                        bordered={false}
                        style={{...commonInputStyles, width: '160px', }}
                        onBlur={e => {
                          setConfig(c => updateButtonProp(c, btnConf.id, 'text', e.target.value));
                        }}
                      />
                    </Tags.AnotCrtPanelSec>
                    <Tags.AnotCrtPanelSec row>
                      <GTags.Txt style={{marginRight: '0.5rem'}}>Action</GTags.Txt>
                      {btnConf.type === 'next' ? 'Select or create an annotation' : (btnConf.type === 'prev' ? 'Will be automatically detected' : 'Custom action')}
                    </Tags.AnotCrtPanelSec>
                  </div>)}
              </Tags.AABtnCtrlLine>
            );
          })}
          <Button
            type="link"
            icon={<SubnodeOutlined />}
            style={{marginTop: '1rem'}}
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

// export default class AnnotationCreatorPanel extends React.PureComponent<IProps, IState> {
//   constructor(props: IProps) {
//     super(props);
//     this.state = {
//       config: undefined,
//       globalThemeConfig: undefined,
//       btnEditing: '',
//     };
//   }

//   componentDidMount() {
//     this.setState({
//       config: this.props.config,
//       globalThemeConfig: this.props.globalThemeConfig
//     });
//   }

//   componentDidUpdate(prevProps: IProps, prevState: IState) {
//     // if (prevProps.provider !== this.props.provider) {
//     //   this.setState({
//     //     config: this.props.provider.getConfig(),
//     //     globalThemeConfig: this.props.provider.getGlobalThemeConfig()
//     //   });
//     // }
//     console.log('here');

//     if (
//       (
//         this.state.config !== prevState.config
//         || this.state.globalThemeConfig !== prevState.globalThemeConfig
//       )
//       && this.state.config
//       && this.state.globalThemeConfig) {
//       this.props.onConfigChange(this.state.config, this.state.globalThemeConfig);
//     }
//   }

//   render() {
//     console.log('rendering');
//     const config = this.state.config;
//     const globalThemeConfig = this.state.globalThemeConfig;
//     if (!config || !globalThemeConfig) {
//       return <></>;
//     }

//     return (
//       <Tags.AnotCrtPanelCon>
//         <Tags.AnotCrtPanelSec>
//           <GTags.Txt className="title2" style={{ marginBottom: '0.25rem' }}>Body text</GTags.Txt>
//           <TextArea
//             style={{ ...commonInputStyles, width: '100%' }}
//             rows={4}
//             defaultValue={config.bodyContent}
//             bordered={false}
//             onBlur={e => {
//               console.log('changed');
//               this.setState(state => { updateAnnotationText(state.config!, e.target.value); });
//               // this.setState({ config: updateAnnotationText(this.state.config!, e.target.value) });
//             }}
//           />
//         </Tags.AnotCrtPanelSec>
//         <Tags.AnotCrtPanelSec row>
//           <GTags.Txt className="title2" style={{ marginRight: '0.5rem' }}>Positioning</GTags.Txt>
//           <Select
//             defaultValue={config.positioning}
//             size="small"
//             bordered={false}
//             style={{ ...commonInputStyles, minWidth: '120px', }}
//             options={Object.values(AnnotationPositions).map(v => ({
//               value: v,
//               label: `${v} ${v === AnnotationPositions.Auto ? '' : '(not yet supported)'}`,
//               disabled: v !== AnnotationPositions.Auto
//             }))}
//           />
//         </Tags.AnotCrtPanelSec>
//         <Tags.AnotCrtPanelSec>
//           <div style={{ display: 'flex', alignItems: 'center' }}>
//             <GTags.Txt className="title2" style={{ marginRight: '0.5rem' }}>Theme </GTags.Txt>
//             <Tooltip
//               placement="right"
//               title={
//                 <GTags.Txt className="subsubhead">
//                   Changing theme here affects all other annotations in this tour
//                 </GTags.Txt>
//               }
//             >
//               <QuestionCircleOutlined />
//             </Tooltip>
//           </div>
//           <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center' }}>
//             <GTags.Txt>Primary color</GTags.Txt>
//             <div style={{
//               height: '18px',
//               width: '18px',
//               borderRadius: '18px',
//               background: globalThemeConfig.primaryColor,
//               marginRight: '0.5rem',
//               marginLeft: '0.5rem'
//             }}
//             />
//             <Input
//               defaultValue={globalThemeConfig.primaryColor}
//               style={{ ...commonInputStyles, width: '120px' }}
//               size="small"
//               bordered={false}
//               onBlur={e => {
//                 this.setState(state => {
//                   updateGlobalThemeConfig(state.globalThemeConfig!, 'primaryColor', e.target.value);
//                 });
//               }}
//             />
//           </div>
//         </Tags.AnotCrtPanelSec>
//         <Tags.AnotCrtPanelSec style={{ marginBottom: 0 }}>
//           <GTags.Txt className="title2">Buttons</GTags.Txt>
//           <Tags.AnotCrtPanelSec style={{ marginBottom: 0 }}>
//             {config.buttons.map(btnConf => {
//               const primaryColor = globalThemeConfig.primaryColor;
//               return (
//                 <Tags.AABtnCtrlLine key={btnConf.id} className={this.state.btnEditing === btnConf.id ? 'sel' : ''}>
//                   <div className="a-head">
//                     <ATags.ABtn
//                       type="button"
//                       btnStyle={btnConf.style}
//                       color={primaryColor}
//                       size={btnConf.size}
//                     >{btnConf.text}
//                     </ATags.ABtn>
//                     <div style={{ display: 'flex', }}>
//                       <Tooltip
//                         placement="topRight"
//                         title={
//                           <GTags.Txt className="subsubhead">
//                             No action defined for what would happen if user clicks this button
//                           </GTags.Txt>
//                         }
//                       >
//                         <Button icon={<DisconnectOutlined />} type="text" size="small" style={{ color: '#FF7450' }} />
//                       </Tooltip>
//                       {btnConf.type === 'custom' ? (
//                         <Button
//                           icon={<DeleteOutlined />}
//                           type="text"
//                           size="small"
//                           style={{ color: '#bdbdbd' }}
//                           onClick={() => {
//                             this.setState(state => { removeButtonWithId(state.config!, btnConf.id); });
//                           }}
//                         />
//                       ) : (
//                         <Button
//                           icon={btnConf.exclude ? <EyeInvisibleOutlined /> : <EyeOutlined />}
//                           type="text"
//                           size="small"
//                           style={{ color: '#bdbdbd' }}
//                           onClick={() => {
//                             this.setState(state => {
//                               toggleBooleanButtonProp(state.config!, btnConf.id, 'exclude');
//                             });
//                           }}
//                         />
//                       )}
//                       <Button
//                         icon={<EditOutlined />}
//                         type="text"
//                         size="small"
//                         style={{
//                           color: '#bdbdbd'
//                         }}
//                         onClick={() => {
//                           if (this.state.btnEditing === btnConf.id) this.setState({ btnEditing: '' });
//                           else this.setState({ btnEditing: btnConf.id });
//                         }}
//                       />
//                     </div>
//                   </div>
//                   {btnConf.id === this.state.btnEditing && (
//                     <div className="n-details">
//                       <Tags.AnotCrtPanelSec row>
//                         <GTags.Txt style={{ marginRight: '0.5rem' }}>Button style</GTags.Txt>
//                         <Select
//                           defaultValue={btnConf.style}
//                           size="small"
//                           bordered={false}
//                           style={{ ...commonInputStyles, minWidth: '120px', }}
//                           options={Object.values(AnnotationButtonStyle).map(v => ({
//                             value: v,
//                             label: v,
//                           }))}
//                           onSelect={(val: AnnotationButtonStyle) => {
//                             this.setState(state => { updateButtonProp(state.config!, btnConf.id, 'style', val); });
//                           }}
//                         />
//                       </Tags.AnotCrtPanelSec>
//                       <Tags.AnotCrtPanelSec row>
//                         <GTags.Txt style={{ marginRight: '0.5rem' }}>Button size</GTags.Txt>
//                         <Select
//                           defaultValue={btnConf.size}
//                           size="small"
//                           bordered={false}
//                           style={{ ...commonInputStyles, minWidth: '120px', }}
//                           options={Object.values(AnnotationButtonSize).map(v => ({
//                             value: v,
//                             label: v,
//                           }))}
//                           onSelect={(val: AnnotationButtonSize) => {
//                             this.setState(state => { updateButtonProp(state.config!, btnConf.id, 'size', val); });
//                           }}
//                         />
//                       </Tags.AnotCrtPanelSec>
//                       <Tags.AnotCrtPanelSec row>
//                         <GTags.Txt style={{ marginRight: '0.5rem' }}>Button text</GTags.Txt>
//                         <Input
//                           defaultValue={btnConf.text}
//                           size="small"
//                           bordered={false}
//                           style={{ ...commonInputStyles, width: '160px', }}
//                           onBlur={e => {
//                             this.setState(
//                               state => { updateButtonProp(state.config!, btnConf.id, 'text', e.target.value); }
//                             );
//                           }}
//                         />
//                       </Tags.AnotCrtPanelSec>
//                       <Tags.AnotCrtPanelSec row>
//                         <GTags.Txt style={{ marginRight: '0.5rem' }}>Action</GTags.Txt>
//                         {btnConf.type === 'next' ? 'Select or create an annotation' : (btnConf.type === 'prev' ? 'Will be automatically detected' : 'Custom action')}
//                       </Tags.AnotCrtPanelSec>
//                     </div>)}
//                 </Tags.AABtnCtrlLine>
//               );
//             })}
//             <Button
//               type="link"
//               icon={<SubnodeOutlined />}
//               style={{ marginTop: '1rem' }}
//               onClick={() => {
//                 this.setState(state => { addCustomBtn(state.config!); });
//               }}
//             >Create a custom button
//             </Button>
//           </Tags.AnotCrtPanelSec>
//         </Tags.AnotCrtPanelSec>
//       </Tags.AnotCrtPanelCon>
//     );
//   }
// }
