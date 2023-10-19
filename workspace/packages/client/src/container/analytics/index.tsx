import React, { ReactElement } from 'react';
import { connect } from 'react-redux';
import { IAnnotationConfig, ITourDataOpts } from '@fable/common/dist/types';
import { RespUser } from '@fable/common/dist/api-contract';
import Dropdown from 'antd/lib/dropdown';
import { ArrowUpOutlined, DownOutlined, WarningOutlined } from '@ant-design/icons';
import { MenuProps } from 'antd';
import Radio from 'antd/lib/radio';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import Funnel from './sleeping-funnel';
import { loadTourAndData, } from '../../action/creator';
import { flatten } from '../../utils';
import { P_RespSubscription, P_RespTour } from '../../entity-processor';
import Loader from '../../component/loader';
import * as GTags from '../../common-styled';
import * as Tags from './styled';
import Header from '../../component/header';
import Line from './line';

interface IDispatchProps {
  loadTourWithData: (rid: string) => void,
}

const mapDispatchToProps = (dispatch: any) => ({
  loadTourWithData: (rid: string) => dispatch(loadTourAndData(rid)),
});

type FunnelData = Array<{ step: number, value: number, label: string }>;
type TOrderedAnnWithMetrics = [status: EmptyStateType, orderedAnn: FunnelData, view: {
    totalViews: number;
    viewDist: Array<{ date: Date, value: number }>;
    conversionDist: Array<{ date: Date, value: number}>;
}];

interface IAppStateProps {
  tour: P_RespTour | null;
  subs: P_RespSubscription | null;
  isTourLoaded: boolean;
  orderedAnnotationsForTour: TOrderedAnnWithMetrics;
  principal: RespUser | null;
  conversion: number;
}

const enum EmptyStateType {
  Loading = -1,
  Ok = 0,
  MainMissing = 1,
  NoData
}

function orderedAnnotationsForTour(
  annGroupedByScreen: Record<string, IAnnotationConfig[]>,
  opts: ITourDataOpts | null,
  isTourLoaded: boolean,
  conversion: number
): TOrderedAnnWithMetrics {
  if (!isTourLoaded) return [EmptyStateType.Loading, [], { totalViews: 0, viewDist: [], conversionDist: [] }];

  let hasAnn = false;
  const allAnnHm = flatten(Object.values(annGroupedByScreen)).reduce((hm, an) => {
    hasAnn = true;
    hm[an.refId] = an;
    return hm;
  }, {} as Record<string, IAnnotationConfig>);

  if (!hasAnn) return [EmptyStateType.NoData, [], { totalViews: 0, viewDist: [], conversionDist: [] }];

  const main = opts!.main || '';
  const mainAnnId: string = main.split('/').at(-1)!;
  const start = allAnnHm[mainAnnId];
  if (!start) return [EmptyStateType.MainMissing, [], { totalViews: 0, viewDist: [], conversionDist: [] }];

  const flatAnn: IAnnotationConfig[] = [];
  let ptr: IAnnotationConfig = start;
  while (true) {
    flatAnn.push(ptr);
    const nextBtn = ptr.buttons.find(btn => btn.type === 'next')!;
    if (nextBtn.hotspot && nextBtn.hotspot.actionType === 'navigate') {
      const actionVal = nextBtn.hotspot.actionValue;
      const nextAnnId = actionVal.split('/').at(-1)!;
      ptr = allAnnHm[nextAnnId];
    } else break;
  }

  const lowerLimit = 60 + (Math.random() * 10 | 0);
  const upperLimit = Math.ceil((lowerLimit * 100) / conversion);
  const steps = flatAnn.length;
  let gap = ((upperLimit - lowerLimit) / steps) | 0;

  const funnelData: FunnelData = [];
  for (let i = 0; i < steps; i++) {
    let stepGap = gap;
    if (i > 0) {
      stepGap = Math.ceil(Math.random() * gap);
      gap += gap - stepGap;
    }
    funnelData.push({
      step: i + 1,
      value: i === 0 ? upperLimit : i === steps - 1 ? lowerLimit : Math.max(funnelData[i - 1].value - stepGap, lowerLimit),
      label: flatAnn[i].displayText.substring(0, 12)
    });
  }

  const viewDist: Array<{ date: Date, value: number}> = [];
  const conversionDist: Array<{ date: Date, value: number}> = [];
  let i = 20;
  const now = new Date();
  while (i--) {
    const y = Math.ceil(Math.max((0.025 * (i ** 2)) - (0.02 * i), 2));
    viewDist.push({
      date: new Date(2023, now.getMonth(), now.getDate() - i),
      value: i < 3 ? Math.ceil(Math.random() * 20) : y,
    });
    conversionDist.push({
      date: new Date(2023, now.getMonth(), now.getDate() - i),
      value: conversion + Math.ceil(Math.random() * 3) * (Math.ceil(Math.random() * 2) % 2 ? 1 : -1),
    });
  }

  return [EmptyStateType.Ok, funnelData, {
    totalViews: upperLimit,
    viewDist,
    conversionDist
  }];
}

const mapStateToProps = (state: TState): IAppStateProps => {
  const conversion = (10 + Math.random() * 10 | 0);
  return {
    tour: state.default.currentTour,
    subs: state.default.subs,
    isTourLoaded: state.default.tourLoaded,
    conversion,
    orderedAnnotationsForTour: orderedAnnotationsForTour(
      state.default.remoteAnnotations,
      state.default.remoteTourOpts,
      state.default.tourLoaded,
      conversion
    ),
    principal: state.default.principal,
  };
};

interface IOwnProps {
}
type IProps = IOwnProps & IAppStateProps & IDispatchProps & WithRouterProps<{
  tourId: string;
}>;

interface IOwnStateProps {
  funnelOrUserpathTab: 'funnel' | 'userpath';
}

class Tours extends React.PureComponent<IProps, IOwnStateProps> {
  constructor(props: IProps) {
    super(props);
    this.state = { funnelOrUserpathTab: 'funnel' };
  }

  componentDidMount(): void {
    this.props.loadTourWithData(this.props.match.params.tourId);
  }

  render(): ReactElement {
    if (!this.props.isTourLoaded) {
      return (
        <div>
          <Loader width="80px" txtBefore="Crunching number!!!" showAtPageCenter />
        </div>
      );
    }
    const data = this.props.orderedAnnotationsForTour[1];
    const lastSyncMs = +new Date() - (41 * 60 * 1000);
    const lastSync = new Date(lastSyncMs);
    return (
      <GTags.ColCon>
        <GTags.HeaderCon>
          <Header
            tour={this.props.tour}
            subs={this.props.subs}
            navigateToWhenLogoIsClicked="/tours"
            titleElOnLeft={
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <GTags.Txt className="subsubhead">Insight for</GTags.Txt>
                <GTags.Txt style={{ fontWeight: 500 }}>{this.props.tour!.displayName}</GTags.Txt>
              </div>
            }
            leftElGroups={[]}
            principal={this.props.principal}
          />
        </GTags.HeaderCon>
        <GTags.BodyCon style={{
          height: 'calc(100% - 72px)',
          background: '#fff',
          padding: '0.25rem 2rem',
          overflowY: 'hidden',
        }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'end',
              gap: '1rem'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center'
              }}
            >
              Data from past&nbsp;&nbsp;
              <Dropdown menu={{ items }} trigger={['click']}>
                <a
                  onClick={(e) => e.preventDefault()}
                  style={{
                    background: '#F5F5F5',
                    padding: '0.15rem 0.25rem',
                    borderRadius: '4px',
                    border: '1px solid #BDBDBD',
                    cursor: 'pointer'
                  }}
                >
                  30d&nbsp;
                  <DownOutlined />
                </a>
              </Dropdown>
            </div>
            <div>
              <span
                style={{
                  padding: '0.15rem 0.25rem',
                  fontSize: '12px',
                  background: '#E0E0E0',
                  borderRadius: '4px',
                  color: '#757575'
                }}
              >Last synced {lastSync.getHours()}:{lastSync.getMinutes()}
              </span>
            </div>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', marginBottom: '2rem', gap: '1rem' }}>
              <Tags.KPICon style={{ height: '240px', width: '480px' }}>
                <Tags.KPIHead>
                  <span className="label">Total visitors</span>
                  <span className="val">{this.props.orderedAnnotationsForTour[2].totalViews}</span>
                </Tags.KPIHead>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}
                >
                  <p style={{
                    opacity: '0.75',
                    fontSize: '0.75rem'
                  }}
                  >Count of visitors day by day for past 3 months
                  </p>
                  <Line
                    data={this.props.orderedAnnotationsForTour[2].viewDist}
                    width={360}
                    height={120}
                    chartId="totalviewkpi"
                    yTooltipText="visitor"
                  />
                </div>
              </Tags.KPICon>
              <Tags.KPICon style={{ height: '240px', width: '480px' }}>
                <Tags.KPIHead>
                  <span className="label">Steps completed</span>
                  <span className="val">{Math.max(this.props.orderedAnnotationsForTour[1].length - 3, 3)}</span>
                </Tags.KPIHead>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  transform: 'translateY(-4rem)'
                }}
                >
                  <p style={{
                    opacity: '0.75',
                    fontSize: '0.75rem'
                  }}
                  >75% visitors atleast completed <b><i>{Math.max(this.props.orderedAnnotationsForTour[1].length - 3, 3)} steps out of {this.props.orderedAnnotationsForTour[1].length}</i></b> before they drops, which is
                  </p>
                  <div style={{ fontSize: '2rem', fontWeight: 500, color: '#1ece1e', marginTop: '1rem' }}>
                    <ArrowUpOutlined />
                    2%
                  </div>
                  <div>
                    than last week
                  </div>
                </div>
              </Tags.KPICon>
              <Tags.KPICon style={{ height: '240px', width: '480px' }}>
                <Tags.KPIHead>
                  <span className="label">Conversion</span>
                  <span className="val">{this.props.conversion}%</span>
                </Tags.KPIHead>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
                >
                  <p style={{
                    opacity: '0.75',
                    fontSize: '0.75rem'
                  }}
                  >Conversion over time by day
                  </p>
                  <Line
                    data={this.props.orderedAnnotationsForTour[2].conversionDist}
                    width={360}
                    height={120}
                    chartId="conversionkpi"
                    yTooltipText="Conversion"
                    percentageScale
                    isArea
                  />
                </div>
              </Tags.KPICon>
            </div>
            <Tags.BtnGroup style={{ marginBottom: '1rem', marginTop: '3rem' }}>
              <span
                className={this.state.funnelOrUserpathTab === 'funnel' ? 'sel' : 'nasel'}
                onClick={() => this.setState({ funnelOrUserpathTab: 'funnel' })}
              >
                Funnel Dropoffs
              </span>
              <span
                className={this.state.funnelOrUserpathTab === 'userpath' ? 'sel' : 'nasel'}
                onClick={() => this.setState({ funnelOrUserpathTab: 'userpath' })}
              >
                User Path <WarningOutlined />
              </span>
            </Tags.BtnGroup>
            {this.state.funnelOrUserpathTab === 'funnel' ? (
              <>
                <p style={{ opacity: '0.65' }}>Funnel view provides a bird's eye view of where the visitors are dropping off if they are not booking a demo. You can futher drill down and see how long user has spent on a specific part of the tour giving you opportunities to optimize further.
                </p>
                <div style={{
                  padding: '1rem',
                  height: '400px',
                  display: 'flex',
                  flexDirection: 'column',
                  background: '#f5f5f5',
                  borderRadius: '8px'
                }}
                >
                  <Funnel data={data} />
                </div>
              </>
            ) : (
              <div style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'center'
              }}
              >
                <img src="/ph_userpath.png" alt="userpath guide" style={{ width: '480px' }} />
                <div>
                  <h3>Properties to display user path are not configured</h3>
                  <p>
                    Fable shows user specific path once you use Fable's Form or integrate your own form with Fable.
                  </p>
                </div>
              </div>
            )}
          </div>
        </GTags.BodyCon>
      </GTags.ColCon>
    );
  }
}

const items: MenuProps['items'] = [
  {
    label: '30d',
    key: '0',
  },
];

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(Tours));
