import React, { ReactElement } from 'react';
import { connect } from 'react-redux';
import { IAnnotationConfig, ITourDataOpts } from '@fable/common/dist/types';
import {
  ButtonClicks,
  RespConversion,
  RespTourAnnViews,
  RespTourAnnWithPercentile,
  RespTourView,
  RespUser,
  TotalVisitorsByYmd,
  TourAnnViewsWithPercentile,
  TourAnnWithViews } from '@fable/common/dist/api-contract';
import Dropdown from 'antd/lib/dropdown';
import { ArrowUpOutlined, DownOutlined, WarningOutlined } from '@ant-design/icons';
import { MenuProps } from 'antd';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import Funnel from './sleeping-funnel';
import {
  getConversionDataForTour,
  getTotalViewsForTour,
  getStepsVisitedForTour,
  loadTourAndData,
  getAnnViewsForTour } from '../../action/creator';
import { flatten } from '../../utils';
import { P_RespSubscription, P_RespTour } from '../../entity-processor';
import Loader from '../../component/loader';
import * as GTags from '../../common-styled';
import * as Tags from './styled';
import Header from '../../component/header';
import Line from './line';

interface IDispatchProps {
  loadTourWithData: (rid: string) => void,
  getTotalViewsForTour: (rid: string, days: number) => void;
  getConversionDataForTour: (rid: string, days: number) => void;
  getStepsVisitedForTour: (rid: string, days: number) => void;
  getAnnViewsForTour: (rid: string, days: number) => void;
}

const mapDispatchToProps = (dispatch: any) => ({
  loadTourWithData: (rid: string) => dispatch(loadTourAndData(rid)),
  getTotalViewsForTour: (rid: string, days: number) => dispatch(getTotalViewsForTour(rid, days)),
  getConversionDataForTour: (rid: string, days: number) => dispatch(getConversionDataForTour(rid, days)),
  getStepsVisitedForTour: (rid: string, days: number) => dispatch(getStepsVisitedForTour(rid, days)),
  getAnnViewsForTour: (rid: string, days: number) => dispatch(getAnnViewsForTour(rid, days))
});

type FunnelData = Array<{ step: number, value: number, label: string }>;
type TOrderedAnnWithMetrics = {status: EmptyStateType, orderedAnn: FunnelData, view: {
    totalVisitors: number,
    avgTimeSpentInaTour: number,
    conversion: number;
    viewDist: Array<{ date: Date, value: number }>;
}};

interface IAppStateProps {
  tour: P_RespTour | null;
  isTourLoaded: boolean;
  orderedAnnotationsForTour: TOrderedAnnWithMetrics;
  principal: RespUser | null;
}

const enum EmptyStateType {
  Loading = -1,
  Ok = 0,
  MainMissing = 1,
  NoData
}

function getTotalVisitors(totalViewsForTour: RespTourView): number {
  let totalVisitors = 0;
  if (totalViewsForTour && Object.keys(totalViewsForTour).length > 0) {
    totalVisitors = totalViewsForTour.totalViews || 0;
  }
  return totalVisitors;
}

function getConversionPercentage(
  tourConversion: RespConversion,
  openLinkBtnId: string[],
  firstButtonId: string
): number {
  let conversion = 0;
  let buttons: ButtonClicks[] = [];
  if (tourConversion && Object.keys(tourConversion).length > 0) {
    let firstButtonTotalClicks = 0;
    buttons = tourConversion.buttonsWithTotalClicks;
    if (buttons && buttons.length !== 0) {
      let sum = 0;
      const firstButton = buttons.find(button => button !== undefined && button.btnId === firstButtonId);
      if (firstButton) {
        firstButtonTotalClicks = firstButton.totalClicks;
      }

      for (let i = 0; i < openLinkBtnId.length; i++) {
        const button = buttons.find(b => b !== undefined && b.btnId === openLinkBtnId[i]);
        if (button) {
          sum += button.totalClicks;
        }
      }
      conversion = firstButtonTotalClicks !== 0 ? Math.round((sum / firstButtonTotalClicks) * 100) : 0;
    }
  }
  return conversion;
}

function getAvgTimeSpent(tourStepsVisited: RespTourAnnWithPercentile): number {
  let avgTimeSpentInATour = 0;
  if (tourStepsVisited && Object.keys(tourStepsVisited).length > 0) {
    const timeSpent: TourAnnViewsWithPercentile[] = tourStepsVisited.tourAnnInfo;
    if (timeSpent) {
      for (let i = 0; i < timeSpent.length; i++) {
        avgTimeSpentInATour += timeSpent[i].percentile50;
      }
      return Math.round(avgTimeSpentInATour);
    }
  }
  return avgTimeSpentInATour;
}

function getEachAnnotationTotalViews(tourAnnInfo: RespTourAnnViews, flatAnn: IAnnotationConfig[]): number[] {
  const OrderAnnTotalViews: number[] = [];
  if (tourAnnInfo && Object.keys(tourAnnInfo).length > 0) {
    const eachAnnTotalViews: TourAnnWithViews[] = tourAnnInfo.tourAnnWithViews;
    if (eachAnnTotalViews) {
      for (let i = 0; i < flatAnn.length; i++) {
        const matchingAnn = eachAnnTotalViews.find(item => item !== undefined && flatAnn[i].refId === item.annId);
        OrderAnnTotalViews.push(matchingAnn ? matchingAnn.totalViews : 0);
      }
      return OrderAnnTotalViews;
    }
  }
  return OrderAnnTotalViews;
}

function getFunnelData(annotationTotalViews: number[], flatAnn: IAnnotationConfig[]): FunnelData {
  const funnelData: FunnelData = [];
  for (let i = 0; i < flatAnn.length; i++) {
    funnelData.push({
      step: i + 1,
      value: annotationTotalViews[i] ? annotationTotalViews[i] : 0,
      label: flatAnn[i].displayText.substring(0, 19)
    });
  }
  return funnelData;
}

function getTotalVisitorsForAPeriod(totalViewsForTour: RespTourView): TotalVisitorsByYmd[] {
  let totalVisitorsByYmd: TotalVisitorsByYmd[] = [];
  if (totalViewsForTour && Object.keys(totalViewsForTour).length > 0 && totalViewsForTour.totalVisitorsByYmd) {
    totalVisitorsByYmd = totalViewsForTour.totalVisitorsByYmd;
  }
  return totalVisitorsByYmd;
}

function orderedAnnotationsForTour(
  annGroupedByScreen: Record<string, IAnnotationConfig[]>,
  opts: ITourDataOpts | null,
  isTourLoaded: boolean,
  totalViewsForTour: RespTourView,
  tourConversion: RespConversion,
  tourStepsVisited: RespTourAnnWithPercentile,
  tourAnnInfo: RespTourAnnViews,
): TOrderedAnnWithMetrics {
  if (!isTourLoaded) {
    return {
      status: EmptyStateType.Loading,
      orderedAnn: [],
      view: {
        totalVisitors: 0,
        avgTimeSpentInaTour: 0,
        conversion: 0,
        viewDist: []
      }
    };
  }

  let hasAnn = false;
  const allAnnHm = flatten(Object.values(annGroupedByScreen)).reduce((hm, an) => {
    hasAnn = true;
    hm[an.refId] = an;
    return hm;
  }, {} as Record<string, IAnnotationConfig>);

  if (!hasAnn) {
    return {
      status: EmptyStateType.Loading,
      orderedAnn: [],
      view: {
        totalVisitors: 0,
        avgTimeSpentInaTour: 0,
        conversion: 0,
        viewDist: []
      }
    };
  }

  const main = opts!.main || '';
  const mainAnnId: string = main.split('/').at(-1)!;
  const start = allAnnHm[mainAnnId];

  if (!start) {
    return {
      status: EmptyStateType.Loading,
      orderedAnn: [],
      view: {
        totalVisitors: 0,
        avgTimeSpentInaTour: 0,
        conversion: 0,
        viewDist: []
      }
    };
  }

  const flatAnn: IAnnotationConfig[] = [];
  let ptr: IAnnotationConfig = start;
  const firstButtonId: string = ptr.buttons[0].id;
  const openLinkBtnId: string[] = [];
  while (true) {
    flatAnn.push(ptr);
    const nextBtn = ptr.buttons.find(btn => btn.type === 'next')!;
    if (nextBtn.hotspot && nextBtn.hotspot.actionType === 'navigate') {
      const actionVal = nextBtn.hotspot.actionValue;
      const nextAnnId = actionVal.split('/').at(-1)!;
      ptr = allAnnHm[nextAnnId];
    } else {
      openLinkBtnId.push(nextBtn.id);
      break;
    }
  }

  const totalVisitors = getTotalVisitors(totalViewsForTour);
  const conversion = getConversionPercentage(tourConversion, openLinkBtnId, firstButtonId);
  const avgTimeSpentInATour = getAvgTimeSpent(tourStepsVisited);
  const annotationViews = getEachAnnotationTotalViews(tourAnnInfo, flatAnn);
  const funnelData: FunnelData = getFunnelData(annotationViews, flatAnn);
  const totalVisitorsByYmd: TotalVisitorsByYmd[] = getTotalVisitorsForAPeriod(totalViewsForTour);

  const now = new Date();
  const viewDist: Array<{ date: Date, value: number}> = [];

  let numOfDays = 30;
  while (numOfDays--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - numOfDays);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const ymd = `${date.getFullYear().toString()}${month}${date.getDate().toString().padStart(2, '0')}`;
    let viewDistValue = 0;
    if (totalVisitorsByYmd.length > 0) {
      for (const visitor of totalVisitorsByYmd) {
        if (visitor.ymd !== undefined && visitor.ymd === ymd) {
          viewDistValue = visitor.totalViews;
          break;
        }
      }
    }
    viewDist.push({
      date,
      value: viewDistValue
    });
  }
  return {
    status: EmptyStateType.Ok,
    orderedAnn: funnelData,
    view: {
      totalVisitors,
      avgTimeSpentInaTour: avgTimeSpentInATour,
      conversion,
      viewDist
    }
  };
}

const mapStateToProps = (state: TState): IAppStateProps => {
  const totalViewsForTour = state.default.totalViewsForTour as RespTourView;
  const tourConversion = state.default.tourConversion as RespConversion;
  const tourStepsVisited = state.default.tourStepsVisited as RespTourAnnWithPercentile;
  const tourAnnInfo = state.default.tourAnnInfo as RespTourAnnViews;
  return {
    tour: state.default.currentTour,
    isTourLoaded: state.default.tourLoaded,
    orderedAnnotationsForTour: orderedAnnotationsForTour(
      state.default.remoteAnnotations,
      state.default.remoteTourOpts,
      state.default.tourLoaded,
      totalViewsForTour,
      tourConversion,
      tourStepsVisited,
      tourAnnInfo
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
  days: number;
}

class Tours extends React.PureComponent<IProps, IOwnStateProps> {
  constructor(props: IProps) {
    super(props);
    this.state = { funnelOrUserpathTab: 'funnel', days: 30 };
  }

  componentDidMount(): void {
    this.initAnalytics();
  }

  componentDidUpdate(_prevProps: IProps, prevState: IOwnStateProps): void {
    if (this.state.days !== prevState.days) {
      this.initAnalytics();
    }
  }

  initAnalytics = (): void => {
    this.props.loadTourWithData(this.props.match.params.tourId);
    this.props.getTotalViewsForTour(this.props.match.params.tourId, this.state.days);
    this.props.getStepsVisitedForTour(this.props.match.params.tourId, this.state.days);
    this.props.getAnnViewsForTour(this.props.match.params.tourId, this.state.days);
    this.props.getConversionDataForTour(this.props.match.params.tourId, this.state.days);
  };

  handleDropdownItemClick = (e: { key: string; }): void => {
    this.setState({ days: parseInt(e.key, 10) });
  };

  render(): ReactElement {
    const items: MenuProps['items'] = [
      {
        label: '30d',
        key: '30',
      },
      {
        label: '60d',
        key: '60',
      },
      {
        label: '90d',
        key: '90',
      },
    ];
    if (!this.props.isTourLoaded) {
      return (
        <div>
          <Loader width="80px" txtBefore="Crunching number!!!" showAtPageCenter />
        </div>
      );
    }
    const data = this.props.orderedAnnotationsForTour.orderedAnn;
    const lastSyncMs = +new Date() - (41 * 60 * 1000);
    const lastSync = new Date(lastSyncMs);
    return (
      <GTags.ColCon>
        <GTags.HeaderCon>
          <Header
            tour={this.props.tour}
            navigateToWhenLogoIsClicked="/demos"
            titleElOnLeft={
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <GTags.Txt className="subsubhead">Insight for</GTags.Txt>
                <GTags.Txt style={{ fontWeight: 500 }}>{this.props.tour!.displayName}</GTags.Txt>
              </div>
            }
            leftElGroups={[]}
            manifestPath=""
            principal={this.props.principal}
          />
        </GTags.HeaderCon>
        <GTags.BodyCon style={{
          height: 'calc(100% - 72px)',
          background: '#fff',
          padding: '0.25rem 2rem',
          overflowY: 'scroll',
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
              <Dropdown
                menu={{
                  onClick: this.handleDropdownItemClick,
                  items,
                }}
                trigger={['click']}
              >
                <a
                  onClick={(e) => { e.preventDefault(); }}
                  style={{
                    background: '#F5F5F5',
                    padding: '0.15rem 0.25rem',
                    borderRadius: '4px',
                    border: '1px solid #BDBDBD',
                    cursor: 'pointer'
                  }}
                >
                  {`${this.state.days}d`}&nbsp;
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
              <Tags.KPICon style={{ height: '50px', width: '480px' }}>
                <Tags.KPIHead>
                  <span className="label">Total visitors</span>
                  <span className="val">{this.props.orderedAnnotationsForTour.view.totalVisitors}</span>
                </Tags.KPIHead>
              </Tags.KPICon>
              <Tags.KPICon style={{ height: '50px', width: '480px' }}>
                <Tags.KPIHead>
                  <span className="label">Average Time Spent</span>
                  <span className="val">{this.props.orderedAnnotationsForTour.view.avgTimeSpentInaTour}s</span>
                </Tags.KPIHead>
              </Tags.KPICon>
              <Tags.KPICon style={{ height: '50px', width: '480px' }}>
                <Tags.KPIHead>
                  <span className="label">Conversion</span>
                  <span className="val">{this.props.orderedAnnotationsForTour.view.conversion}%</span>
                </Tags.KPIHead>
              </Tags.KPICon>
            </div>
            <div>
              <Tags.KPICon>
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
                  >Count of visitors day by day for past 1 month
                  </p>
                  <Line
                    data={this.props.orderedAnnotationsForTour.view.viewDist}
                    width={1140}
                    height={120}
                    chartId="totalviewkpi"
                    yTooltipText="visitor"
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
                  height: '300px',
                  display: 'flex',
                  position: 'relative',
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

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(Tours));
