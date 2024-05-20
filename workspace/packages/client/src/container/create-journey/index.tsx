import React from 'react';
import { connect } from 'react-redux';
import { AnnotationButtonSize,
  JourneyData, CreateJourneyPositioning, ITourDataOpts, JourneyFlow } from '@fable/common/dist/types';
import { Button as AntdButton, Select, Tooltip, Divider } from 'antd';
import { DeleteFilled, DeleteOutlined, HolderOutlined, PlusOutlined } from '@ant-design/icons';
import { getSampleJourneyData } from '@fable/common/dist/utils';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { TState } from '../../reducer';
import * as Tags from './styled';
import * as GTags from '../../common-styled';
import CloseIcon from '../../assets/tour/close.svg';
import Input from '../../component/input';
import { IAnnotationConfigWithScreen, JourneyOrOptsDataChange } from '../../types';
import { Tx } from '../tour-editor/chunk-sync-manager';
import CreateJourneyEmptyIcon from '../../assets/create-journey-empty.svg';
import Focus from '../../assets/icons/focus.svg';
import { getValidUrl, isFeatureAvailable } from '../../utils';
import Button from '../../component/button';
import { FeatureForPlan } from '../../plans';
import Upgrade from '../../component/upgrade';
import { P_RespSubscription } from '../../entity-processor';

interface IDispatchProps {
}

const mapDispatchToProps = (dispatch: any): IDispatchProps => ({
});

interface IAppStateProps {
  subs: P_RespSubscription | null;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  subs: state.default.subs,
});

interface IOwnProps {
    closeEditor: () => void;
    firstAnnotations: IAnnotationConfigWithScreen[];
    getAnnInView: (refId: string) => void;
    onTourJourneyChange: JourneyOrOptsDataChange;
    tourOpts: ITourDataOpts;
    journey: JourneyData;
    featurePlan: FeatureForPlan | null;
}

type IProps = IOwnProps &
  IAppStateProps &
  IDispatchProps &
  WithRouterProps<{
    tourId: string;
    screenId: string;
    annotationId?: string;
  }>;

interface IOwnStateProps {
  journeyData: JourneyData;
  isUrlValid: boolean;
}

const { Option } = Select;

class CreateJourney extends React.PureComponent<IProps, IOwnStateProps> {
  private selectTimer : NodeJS.Timeout | null = null;

  constructor(props: IProps) {
    super(props);
    this.state = {
      journeyData: this.props.journey,
      isUrlValid: true
    };
  }

  componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IOwnStateProps>, snapshot?: any): void {
    if (prevState.journeyData !== this.state.journeyData) {
      this.props.onTourJourneyChange(null, this.state.journeyData);
    }
  }

  updateFlowAtIndex = (idx: number, key: keyof JourneyFlow, newValue: JourneyFlow[keyof JourneyFlow]) : void => {
    this.setState((prevState) => {
      const updatedJourneyData = { ...prevState.journeyData };
      const updatedFlows = [...updatedJourneyData.flows];

      if (key !== 'mandatory') {
        updatedFlows[idx][key] = newValue as string;
      } else {
        updatedFlows[idx].mandatory = newValue as boolean;
      }
      updatedJourneyData.flows = updatedFlows;
      return { journeyData: updatedJourneyData };
    });
  };

  deleteFlow = (idx: number) : void => {
    this.setState((prevState) => {
      const updatedJourneyData = { ...prevState.journeyData };
      const updatedFlows = [...updatedJourneyData.flows];

      updatedFlows.splice(idx, 1);
      updatedJourneyData.flows = updatedFlows;
      return { journeyData: updatedJourneyData };
    });
  };

  addNewFlow = (): void => {
    const flow = {
      header1: '',
      header2: '',
      main: '',
      mandatory: false
    };
    this.setState((prevState) => ({
      journeyData: { ...prevState.journeyData, flows: [...prevState.journeyData.flows, flow] } }));
  };

  repositionFlows = (sourceIndex: number, targetIndex: number) : void => {
    this.setState((prevState) => {
      const updatedJourneyData = { ...prevState.journeyData };
      const updatedFlows = [...updatedJourneyData.flows];

      const [movedFlow] = updatedFlows.splice(sourceIndex, 1);
      updatedFlows.splice(targetIndex, 0, movedFlow);
      updatedJourneyData.flows = updatedFlows;

      return { journeyData: updatedJourneyData };
    });
  };

  handleOnDragEnd(result: DropResult) : void {
    if (!result.destination) return;
    this.repositionFlows(result.source.index, result.destination.index);
  }

  advanceBranchingFeatureAvailable = isFeatureAvailable(this.props.featurePlan, 'advanced_branching');

  render():JSX.Element {
    return (
      <Tags.CreateJourneyCon>
        <Tags.Header>
          <Tags.CloseIcon alt="close" src={CloseIcon} onClick={this.props.closeEditor} />
        </Tags.Header>
        <div style={{ overflow: 'auto' }}>
          {
          !(this.state.journeyData.flows.length !== 0 || this.state.journeyData.title.length !== 0) ? (
            <Tags.NoJourneyCon>
              <img src={CreateJourneyEmptyIcon} alt="no module created" />
              <div className="typ-reg">
                <p style={{ margin: 0, textAlign: 'center', marginBottom: '2rem' }} className="typ-h1">You don't have any modules yet.</p>
                <p style={{ margin: '10px 0', textAlign: 'center' }}>
                  Modules help you to split your demo in multiple logical small demos instead of one large demo.
                </p>
                <p style={{ margin: '10px 0', textAlign: 'center' }}>
                  Your buyer can choose which demo they want to see right from the UI.
                </p>
              </div>
              {!this.advanceBranchingFeatureAvailable ? (
                <div style={{ position: 'relative', height: '100px' }}>
                  <Upgrade subs={this.props.subs} />
                </div>)
                : (
                  <Button
                    intent="primary"
                    onClick={this.addNewFlow}
                    icon={<PlusOutlined />}
                    iconPlacement="left"
                  >
                    Create a module
                  </Button>
                )}
            </Tags.NoJourneyCon>
          ) : (
            <Tags.EditorCon className={this.advanceBranchingFeatureAvailable ? '' : 'upgrade-plan'}>
              {!this.advanceBranchingFeatureAvailable && <Upgrade subs={this.props.subs} />}
              <Tags.JourneyInnerCon>
                <Input
                  label="Heading"
                  defaultValue={this.state.journeyData.title}
                  onBlur={async (e) => {
                    this.setState(prevState => ({ journeyData: { ...prevState.journeyData, title: e.target.value } }));
                  }}
                />
              </Tags.JourneyInnerCon>
              <Tags.JourneyInnerCon>
                <DragDropContext onDragEnd={(r) => this.handleOnDragEnd(r)}>
                  <Droppable droppableId="droppable">
                    {(provided, snapshot) => (
                      <Tags.FlowCon
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                      >
                        {this.state.journeyData.flows.map((flow, idx) => (
                          <Draggable key={flow.header1 + idx} draggableId={flow.header1 + idx} index={idx}>
                            {(providedInner, snapshotInner) => (
                              <Tags.FieldOuterCon
                                key={flow.header1 + idx}
                                {...providedInner.draggableProps}
                                ref={providedInner.innerRef}
                              >
                                <Tags.FieldCon
                                  key={flow.header1 + idx}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Tooltip
                                      placement="left"
                                      title={<span>Drag to reorder.</span>}
                                      overlayStyle={{ fontSize: '0.75rem' }}
                                    >
                                      <AntdButton
                                        type="text"
                                        size="small"
                                        icon={<HolderOutlined
                                          style={{ opacity: '0.65', fontSize: '18px', rotate: '90deg' }}
                                        />}
                                        {...providedInner.dragHandleProps}
                                      />
                                    </Tooltip>
                                    <div style={{ display: 'flex' }}>
                                      <Tooltip
                                        placement="right"
                                        title={<span>focus this flow.</span>}
                                        overlayStyle={{ fontSize: '0.75rem' }}
                                      >
                                        <AntdButton
                                          type="text"
                                          size="small"
                                          onClick={() => {
                                            if (!flow.main) return;
                                            if (this.selectTimer) {
                                              clearTimeout(this.selectTimer);
                                            }
                                            this.selectTimer = setTimeout(() => {
                                              this.selectTimer = null;
                                              this.props.getAnnInView(flow.main.split('/')[1]);
                                            }, 300);
                                          }}
                                        >
                                          <img
                                            src={Focus}
                                            alt="focus"
                                            style={{ height: '18px' }}
                                          />
                                        </AntdButton>
                                      </Tooltip>
                                      <Tooltip
                                        placement="right"
                                        title={<span>delete this flow.</span>}
                                        overlayStyle={{ fontSize: '0.75rem' }}
                                      >
                                        <AntdButton
                                          type="text"
                                          size="small"
                                          icon={<DeleteOutlined style={{ opacity: '0.65', fontSize: '18px' }} />}
                                          onClick={() => { this.deleteFlow(idx); }}
                                        />
                                      </Tooltip>
                                    </div>
                                  </div>
                                  <Tags.FieldInputCon>
                                    <Input
                                      label="Module name"
                                      defaultValue={flow.header1}
                                      onBlur={(e) => { this.updateFlowAtIndex(idx, 'header1', e.target.value); }}
                                    />
                                    <Input
                                      label="Module description"
                                      defaultValue={flow.header2}
                                      onBlur={(e) => { this.updateFlowAtIndex(idx, 'header2', e.target.value); }}
                                    />
                                    <GTags.FableSelect
                                      bordered={false}
                                      size="large"
                                      defaultValue={flow.main || undefined}
                                      style={{ width: '100%', borderRadius: '8px' }}
                                      onSelect={(value) => { this.updateFlowAtIndex(idx, 'main', value as string); }}
                                      placeholder="Choose a module"
                                      optionLabelProp="children"
                                    >
                                      {this.props.firstAnnotations.map((ann => ((
                                        <Option
                                          key={`${ann.screen.id}/${ann.refId}`}
                                          value={`${ann.screen.id}/${ann.refId}`}
                                          onMouseEnter={() => {
                                            if (this.selectTimer) {
                                              clearTimeout(this.selectTimer);
                                            }
                                            this.selectTimer = setTimeout(() => {
                                              this.selectTimer = null;
                                              this.props.getAnnInView(ann.refId);
                                            }, 300);
                                          }}
                                        >
                                          <b>{ann.stepNumber}</b>: {ann.displayText}
                                        </Option>
                                      ))))}
                                    </GTags.FableSelect>
                                    <div>
                                      <GTags.OurCheckbox
                                        checked={flow.mandatory}
                                        onChange={(e) => {
                                          this.updateFlowAtIndex(idx, 'mandatory', e.target.checked);
                                        }}
                                      >Mandatory module
                                      </GTags.OurCheckbox>
                                      <div className="typ-sm hlpr">
                                        If a module is made <em>Mandatory</em>, user needs to finish this module before
                                        they switch to a different module.
                                        This is helpful when you have a <em>Lead Form</em> or an <em>introduction</em>.
                                      </div>
                                    </div>
                                  </Tags.FieldInputCon>
                                </Tags.FieldCon>
                              </Tags.FieldOuterCon>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </Tags.FlowCon>
                    )}
                  </Droppable>
                </DragDropContext>
                <Tags.CTAInputCon style={{ margin: '0.5rem' }}>
                  <GTags.DashedBtn
                    className="fullWidth typ-reg"
                    icon={<PlusOutlined />}
                    onClick={this.addNewFlow}
                    type="text"
                  >
                    Add another module
                  </GTags.DashedBtn>
                </Tags.CTAInputCon>
              </Tags.JourneyInnerCon>
              <Divider style={{ margin: '16px 0 32px 0' }} />
              <Tags.JourneyConfigCon>
                {
                  this.state.journeyData.cta === undefined ? (
                    <Tags.CTAInputCon>
                      <GTags.DashedBtn
                        onClick={() => {
                          const newCta = {
                            size: AnnotationButtonSize.Medium,
                            text: 'Book Demo',
                            navigateTo: ''
                          };
                          this.setState((prevState) => ({ journeyData: { ...prevState.journeyData, cta: newCta } }));
                        }}
                        className="fullWidth typ-reg"
                        type="text"
                      >
                        Create CTA
                      </GTags.DashedBtn>
                    </Tags.CTAInputCon>
                  ) : (
                    <Tags.JourneyInnerCon>
                      <Tags.CTAInputCon>
                        <div className="typ-reg" style={{ marginTop: 0 }}>Button settings</div>
                        <GTags.CTABtn
                          style={{ width: '50%' }}
                          size={this.state.journeyData.cta.size}
                          color={this.state.journeyData.primaryColor}
                          borderRadius={this.props.tourOpts.borderRadius}
                        >
                          {this.state.journeyData.cta.text}
                        </GTags.CTABtn>
                      </Tags.CTAInputCon>
                      <Tags.CTAInputCon>
                        <div className="typ-reg">Text</div>
                        <GTags.SimpleInput
                          defaultValue={this.state.journeyData.cta.text}
                          size="small"
                          style={{
                            width: '50%',
                            height: '40px'
                          }}
                          placeholder="Button text"
                          onBlur={e => {
                            const newCta = {
                              ...this.state.journeyData.cta!,
                              text: e.target.value
                            };
                            this.setState(prevState => ({ journeyData: { ...prevState.journeyData, cta: newCta } }));
                          }}
                          className="typ-ip"
                        />
                      </Tags.CTAInputCon>
                      <Tags.CTAInputCon>
                        <div className="typ-reg">Size</div>
                        <GTags.FableSelect
                          bordered={false}
                          style={{ width: '50%' }}
                          size="large"
                          defaultValue={this.state.journeyData.cta.size}
                          options={Object.values(AnnotationButtonSize).map(v => ({
                            value: v,
                            label: v,
                          }))}
                          onSelect={(val) => {
                            const newCta = {
                              ...this.state.journeyData.cta!,
                              size: val as AnnotationButtonSize
                            };
                            this.setState(prevState => ({ journeyData: { ...prevState.journeyData, cta: newCta } }));
                          }}
                          className="typ-ip"
                        />
                      </Tags.CTAInputCon>
                      <div>
                        <Tags.CTAInputCon>
                          <div className="typ-reg">Navigate to</div>
                          <GTags.SimpleInput
                            defaultValue={this.state.journeyData.cta.navigateTo}
                            size="small"
                            style={{
                              width: '50%',
                              height: '40px'
                            }}
                            placeholder="Open Url when clicked"
                            onBlur={e => {
                              const uri = e.target.value;
                              const validUrl = getValidUrl(uri);
                              this.setState({ isUrlValid: Boolean(validUrl) });
                              if (!validUrl) return;
                              const newCta = {
                                ...this.state.journeyData.cta!,
                                navigateTo: validUrl
                              };
                              this.setState(prevState => ({ journeyData: { ...prevState.journeyData, cta: newCta } }));
                            }}
                            className="typ-ip"
                          />
                        </Tags.CTAInputCon>
                        {!this.state.isUrlValid && (
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'red', textAlign: 'end' }}>
                          The url you have entered appears to be malformed. A correctly formed url would look like
                          &nbsp; <em>https://acme.com</em>
                        </p>
                        )}
                      </div>
                      <GTags.DashedBtn
                        className="fullWidth typ-reg"
                        style={{ color: '#AB2424' }}
                        type="text"
                        onClick={() => {
                          this.setState((prevState) => ({ journeyData: { ...prevState.journeyData, cta: undefined } }));
                        }}
                        icon={<DeleteFilled style={{ color: '#d64e4d' }} />}
                      >
                        Delete CTA
                      </GTags.DashedBtn>
                    </Tags.JourneyInnerCon>
                  )
                }
                <Divider style={{ margin: '24px 0' }} />
                <Tags.JourneyInnerCon>
                  <div className="typ-reg">Module Box Positioning</div>
                  <Tags.CTAInputCon className="typ-ip">
                    <label htmlFor={CreateJourneyPositioning.Left_Bottom}>
                      <input
                        id={CreateJourneyPositioning.Left_Bottom}
                        type="radio"
                        value={CreateJourneyPositioning.Left_Bottom}
                        checked={this.state.journeyData.positioning === CreateJourneyPositioning.Left_Bottom}
                        onChange={(e) => {
                          this.setState(prevState => ({ journeyData:
                            { ...prevState.journeyData, positioning: e.target.value as CreateJourneyPositioning } }));
                        }}
                      />
                      <span>Bottom Left</span>
                    </label>
                    <label htmlFor={CreateJourneyPositioning.Right_Bottom} className="typ-ip">
                      <input
                        id={CreateJourneyPositioning.Right_Bottom}
                        type="radio"
                        value={CreateJourneyPositioning.Right_Bottom}
                        checked={this.state.journeyData.positioning === CreateJourneyPositioning.Right_Bottom}
                        onChange={(e) => {
                          this.setState(prevState => ({ journeyData: {
                            ...prevState.journeyData, positioning: e.target.value as CreateJourneyPositioning } }));
                        }}
                      />
                      <span>Bottom Right</span>
                    </label>
                  </Tags.CTAInputCon>
                </Tags.JourneyInnerCon>
                <Divider style={{ margin: '24px 0' }} />
                <Tags.JourneyInnerCon style={{ marginBottom: '20px' }}>
                  <Tags.CTAInputCon>
                    <div className="typ-reg">Primary color</div>
                    <GTags.ColorPicker
                      className="typ-ip"
                      showText={(color) => color.toHexString()}
                      onChangeComplete={e => {
                        this.setState(prevState => ({ journeyData: {
                          ...prevState.journeyData, primaryColor: e.toHexString() } }));
                      }}
                      defaultValue={this.state.journeyData.primaryColor}
                    />
                  </Tags.CTAInputCon>
                  <GTags.OurCheckbox
                    showafterlabel="true"
                    checked={this.props.journey.hideModuleOnLoad}
                    onChange={(e) => {
                      this.setState((prevState) => ({ journeyData:
                        { ...prevState.journeyData,
                          hideModuleOnLoad: e.target.checked
                        } }));
                    }}
                  >Minimize module on start
                  </GTags.OurCheckbox>
                </Tags.JourneyInnerCon>
              </Tags.JourneyConfigCon>
              <div style={{ width: '99%', marginBottom: '20px' }}>
                <GTags.DashedBtn
                  className="fullWidth typ-reg"
                  style={{ color: '#AB2424' }}
                  type="text"
                  onClick={() => {
                    this.setState({
                      journeyData: getSampleJourneyData() });
                  }}
                  icon={<DeleteFilled style={{ color: '#d64e4d' }} />}
                > Delete Module
                </GTags.DashedBtn>
              </div>
            </Tags.EditorCon>

          )
        }
        </div>
      </Tags.CreateJourneyCon>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(CreateJourney));
