import React from 'react';
import { connect } from 'react-redux';
import { AnnotationButtonSize,
  CreateJourneyData, CreateJourneyPositioning, ITourDataOpts, JourneyFlow } from '@fable/common/dist/types';
import { Input as CTAInput, Button as AntdButton } from 'antd';
import Select from 'antd/lib/select';
import Tooltip from 'antd/lib/tooltip';
import { DeleteOutlined, HolderOutlined, PlusOutlined } from '@ant-design/icons';
import { getSampleJourneyData } from '@fable/common/dist/utils';
import { Divider } from 'antd/lib';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { TState } from '../../reducer';
import * as Tags from './styled';
import * as GTags from '../../common-styled';
import CloseIcon from '../../assets/tour/close.svg';
import Input from '../../component/input';
import { IAnnotationConfigWithScreen } from '../../types';
import { Tx } from '../tour-editor/chunk-sync-manager';
import CreateJourneyEmptyIcon from '../../assets/create-journey-empty.svg';
import Focus from '../../assets/icons/focus.svg';
import { getValidUrl } from '../../utils';

interface IDispatchProps {
}

const mapDispatchToProps = (dispatch: any): IDispatchProps => ({
});

interface IAppStateProps {
}

const mapStateToProps = (state: TState): IAppStateProps => ({
});

interface IOwnProps {
    closeEditor: () => void;
    firstAnnotations: IAnnotationConfigWithScreen[];
    getAnnInView: (refId: string) => void;
    onTourJourneyChange: (newJourney: CreateJourneyData, tx?: Tx)=> void;
    tourOpts: ITourDataOpts;
    journey: CreateJourneyData;
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
  journeyData: CreateJourneyData;
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
      this.props.onTourJourneyChange(this.state.journeyData);
    }
  }

  updateFlowAtIndex = (idx: number, key: keyof JourneyFlow, newValue: JourneyFlow[keyof JourneyFlow]) : void => {
    this.setState((prevState) => {
      const updatedJourneyData = { ...prevState.journeyData };
      const updatedFlows = [...updatedJourneyData.flows];

      updatedFlows[idx][key] = newValue;
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
      main: ''
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

  render():JSX.Element {
    return (
      <Tags.CreateJourneyCon>
        <Tags.Header>
          <Tags.CloseIcon alt="close" src={CloseIcon} onClick={this.props.closeEditor} />
        </Tags.Header>
        {
          !(this.state.journeyData.flows.length !== 0 || this.state.journeyData.title.length !== 0) ? (
            <Tags.NoJourneyCon>
              <img src={CreateJourneyEmptyIcon} alt="no journey created" />
              <div>
                <p style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>You don't have a journey yet.</p>
                <p style={{ margin: '10px 0' }}>You can add journey to your product tours</p>
              </div>
              <AntdButton
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                style={{
                  backgroundColor: '#7567FF', borderRadius: '4px', width: '200px', fontSize: '14px'
                }}
                onClick={this.addNewFlow}
              >
                Create a journey
              </AntdButton>
            </Tags.NoJourneyCon>
          ) : (
            <Tags.EditorCon>
              <Tags.JourneyInnerCon>
                <Input
                  label="Journey name"
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
                                      label="Heading 1"
                                      defaultValue={flow.header1}
                                      onBlur={(e) => { this.updateFlowAtIndex(idx, 'header1', e.target.value); }}
                                    />
                                    <Input
                                      label="Heading 2"
                                      defaultValue={flow.header2}
                                      onBlur={(e) => { this.updateFlowAtIndex(idx, 'header2', e.target.value); }}
                                    />
                                    <Tags.FlowSelect
                                      size="large"
                                      defaultValue={flow.main || undefined}
                                      style={{ width: '100%', borderRadius: '8px' }}
                                      onSelect={(value) => { this.updateFlowAtIndex(idx, 'main', value as string); }}
                                      placeholder="Choose a flow"
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
                                          <b>{ann.index}</b>: {ann.displayText}
                                        </Option>
                                      ))))}
                                    </Tags.FlowSelect>
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
                <Tags.CTAInputCon>
                  <Tags.OutlineButton icon={<PlusOutlined />} onClick={this.addNewFlow}>
                    Add another flow
                  </Tags.OutlineButton>
                </Tags.CTAInputCon>
              </Tags.JourneyInnerCon>
              <Divider style={{ margin: '16px 0 32px 0' }} />
              <Tags.JourneyConfigCon>
                {
                  this.state.journeyData.cta === undefined ? (
                    <Tags.CTAInputCon>
                      <Tags.OutlineButton
                        onClick={() => {
                          const newCta = {
                            size: AnnotationButtonSize.Medium,
                            text: 'Book Demo',
                            navigateTo: ''
                          };
                          this.setState((prevState) => ({ journeyData: { ...prevState.journeyData, cta: newCta } }));
                        }}
                      >
                        Create CTA
                      </Tags.OutlineButton>
                    </Tags.CTAInputCon>
                  ) : (
                    <Tags.JourneyInnerCon>
                      <Tags.CTAInputCon>
                        <Tags.CTAText style={{ marginTop: 0 }}>Button settings</Tags.CTAText>
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
                        <GTags.Txt style={{ fontWeight: 500 }}>Text</GTags.Txt>
                        <CTAInput
                          defaultValue={this.state.journeyData.cta.text}
                          size="small"
                          style={{
                            width: '50%',
                            background: '#fff',
                            padding: '10px 14px',
                            borderRadius: '8px'
                          }}
                          placeholder="Button text"
                          onBlur={e => {
                            const newCta = {
                              ...this.state.journeyData.cta!,
                              text: e.target.value
                            };
                            this.setState(prevState => ({ journeyData: { ...prevState.journeyData, cta: newCta } }));
                          }}
                        />
                      </Tags.CTAInputCon>
                      <Tags.CTAInputCon>
                        <GTags.Txt style={{ fontWeight: 500 }}>Size</GTags.Txt>
                        <Tags.FlowSelect
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
                        />
                      </Tags.CTAInputCon>
                      <div>
                        <Tags.CTAInputCon>
                          <GTags.Txt style={{ fontWeight: 500 }}>Navigate to</GTags.Txt>
                          <CTAInput
                            defaultValue={this.state.journeyData.cta.navigateTo}
                            size="small"
                            style={{
                              width: '50%',
                              background: '#fff',
                              padding: '10px 14px',
                              borderRadius: '8px'
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
                          />
                        </Tags.CTAInputCon>
                        {!this.state.isUrlValid && (
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'red', textAlign: 'end' }}>
                          The url you have entered appears to be malformed. A correctly formed url would look like
                          &nbsp; <em>https://acme.com</em>
                        </p>
                        )}
                      </div>
                    </Tags.JourneyInnerCon>
                  )
                }
                <Divider style={{ margin: '24px 0' }} />
                <Tags.JourneyInnerCon>
                  <Tags.CTAText>Journey Box Positioning</Tags.CTAText>
                  <Tags.CTAInputCon>
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
                    <label htmlFor={CreateJourneyPositioning.Right_Bottom}>
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
                <Tags.JourneyInnerCon>
                  <Tags.CTAText>Branding</Tags.CTAText>
                  <Tags.CTAInputCon>
                    <GTags.Txt style={{ fontWeight: 500 }}>Primary color</GTags.Txt>
                    <Tags.ColorPicker
                      showText={(color) => color.toHexString()}
                      onChangeComplete={e => {
                        this.setState(prevState => ({ journeyData: {
                          ...prevState.journeyData, primaryColor: e.toHexString() } }));
                      }}
                      defaultValue={this.state.journeyData.primaryColor}
                    />
                  </Tags.CTAInputCon>
                </Tags.JourneyInnerCon>
              </Tags.JourneyConfigCon>
              <Tags.OutlineButton
                color="red"
                style={{ marginTop: '32px' }}
                onClick={() => {
                  this.setState({
                    journeyData: getSampleJourneyData() });
                }}
              > Delete journey
              </Tags.OutlineButton>
            </Tags.EditorCon>

          )
        }

      </Tags.CreateJourneyCon>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(CreateJourney));
