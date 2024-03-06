import { DownOutlined, LoadingOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import {
  ButtonClicks,
  RespConversion,
  RespTourAnnViews,
  RespTourAnnWithPercentile,
  RespTourView,
  RespUser,
  TourAnnViewsWithPercentile,
  TourAnnWithViews
} from '@fable/common/dist/api-contract';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { JourneyData, IAnnotationConfig, ITourDataOpts } from '@fable/common/dist/types';
import { Button, Drawer, MenuProps, Table } from 'antd';
import Dropdown from 'antd/lib/dropdown';
import React, { ReactElement } from 'react';
import { connect } from 'react-redux';
import { format } from 'd3-format';
import { Link } from 'react-router-dom';
import {
  getAnnViewsForTour,
  getConversionDataForTour,
  getStepsVisitedForTour,
  getTotalViewsForTour,
  loadTourAndData
} from '../../action/creator';
import * as GTags from '../../common-styled';
import Header from '../../component/header';
import { P_RespScreen, P_RespTour } from '../../entity-processor';
import { TState } from '../../reducer';
import { WithRouterProps, withRouter } from '../../router-hoc';
import { getAnnotationsPerScreen, getJourneyWithAnnotations } from '../../utils';
import Bar from './bar';
import Line from './line';
import Funnel, { IFunnelDatum } from './sleeping-funnel';
import * as Tags from './styled';
import { AnnotationPerScreen } from '../../types';
import { IAnnotationConfigWithScreenId } from '../../component/annotation/annotation-config-utils';

const mapDispatchToProps = (dispatch: any) => ({
  loadTourWithData: (rid: string) => dispatch(loadTourAndData(rid, true)),
  getTotalViewsForTour: (
    rid: string,
    days: number,
    onComplete: (data: RespTourView) => void
  ) => dispatch(getTotalViewsForTour(rid, days)).then(onComplete),
  getConversionDataForTour: (
    rid: string,
    days: number,
    onComplete: (data: RespConversion) => void
  ) => dispatch(getConversionDataForTour(rid, days)).then(onComplete),
  getStepsVisitedForTour: (
    rid: string,
    days: number,
    onComplete: (data: RespTourAnnWithPercentile) => void
  ) => dispatch(getStepsVisitedForTour(rid, days)).then(onComplete),
  getAnnViewsForTour: (
    rid: string,
    days: number,
  ) => dispatch(getAnnViewsForTour(rid, days))
});

const DEFAULT_FUNNEL_TITLE = 'Funnel drop off across all sessions';

export interface IAnnotationConfigWithLocation extends IAnnotationConfigWithScreenId {
  location: string;
}

interface IAppStateProps {
  tour: P_RespTour | null;
  principal: RespUser | null;
  orderedAnn: IAnnotationConfigWithLocation[];
  extLinkOpenBtnIds: string[];
  allAnnotationsForTour: AnnotationPerScreen[];
  journey: JourneyData | null;
}

const enum LoadingStatus {
  NotStarted,
  InProgress,
  Loaded
}

function getConversionPercentage(
  tourConversion: RespConversion,
  openLinkBtnId: string[],
  totalSessions: number
): number {
  if (!totalSessions) return 0;
  let conversion = 0;
  let buttons: ButtonClicks[] = [];
  if (tourConversion && Object.keys(tourConversion).length > 0) {
    buttons = tourConversion.buttonsWithTotalClicks;
    if (buttons && buttons.length !== 0) {
      let sum = 0;
      for (let i = 0; i < openLinkBtnId.length; i++) {
        const button = buttons.find(b => b !== undefined && b.btnId === openLinkBtnId[i]);
        if (button) {
          sum += button.totalClicks;
        }
      }
      conversion = Math.round((sum / totalSessions) * 100);
    }
  }
  return conversion;
}

type TPVals = [
  p1: number,
  p5: number,
  p10: number,
  p25: number,
  p50: number,
  p75: number,
  p90: number,
  p95: number,
  p99: number
]
const ps: Array<keyof Omit<TourAnnViewsWithPercentile, 'annId' | 'totalViews'>> = ['p1', 'p5', 'p10', 'p25', 'p50', 'p75', 'p90', 'p95', 'p99'];
function medianTimeSpentInTour(tourStepsVisited: RespTourAnnWithPercentile): TPVals {
  const pvals = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  if (tourStepsVisited && Object.keys(tourStepsVisited).length > 0) {
    const timeSpent: TourAnnViewsWithPercentile[] = tourStepsVisited.tourAnnInfo;
    if (timeSpent) {
      for (let i = 0; i < timeSpent.length; i++) {
        for (let j = 0; j < ps.length; j++) {
          pvals[j] += timeSpent[i][ps[j]];
        }
      }
    }
  }
  return pvals.map(v => Math.round(v)) as TPVals;
}

function getEachAnnotationTotalViews(tourAnnInfo: RespTourAnnViews, flatAnn: IAnnotationConfigWithLocation[]): Array<Omit<IFunnelDatum, 'step' | 'label' | 'fullLabel'>> {
  const orderAnnTotalViews: Array<Omit<IFunnelDatum, 'step' | 'label' | 'fullLabel'>> = [];
  if (tourAnnInfo && Object.keys(tourAnnInfo).length > 0) {
    const eachAnnTotalViews: TourAnnWithViews[] = tourAnnInfo.tourAnnWithViews;
    if (eachAnnTotalViews) {
      for (let i = 0; i < flatAnn.length; i++) {
        const matchingAnn = eachAnnTotalViews.find(item => item !== undefined && flatAnn[i].refId === item.annId);
        const value = matchingAnn?.totalViews ?? 0;
        orderAnnTotalViews.push({
          value,
          refId: flatAnn[i].refId,
          p50: matchingAnn?.p50 ?? 0,
          p75: matchingAnn?.p75 ?? 0,
          p95: matchingAnn?.p95 ?? 0,
          retentionP: '',
          formattedValue: format(',')(value),
          loc: flatAnn[i].location
        });
      }
      return orderAnnTotalViews;
    }
  }
  return orderAnnTotalViews;
}

function getFunnelData(annotationTotalViews: Array<Omit<IFunnelDatum, 'step' | 'label' | 'fullLabel'>>, flatAnn: IAnnotationConfigWithLocation[]): IFunnelDatum[] {
  const funnelData: IFunnelDatum[] = [];
  for (let i = 0; i < flatAnn.length; i++) {
    funnelData.push({
      step: i + 1,
      refId: annotationTotalViews[i]?.refId,

      value: annotationTotalViews[i]?.value ?? 0,
      label: flatAnn[i].displayText.substring(0, 19),
      fullLabel: flatAnn[i].displayText,
      p50: annotationTotalViews[i]?.p50 ?? 0,
      p75: annotationTotalViews[i]?.p75 ?? 0,
      p95: annotationTotalViews[i]?.p95 ?? 0,
      formattedValue: annotationTotalViews[i]?.formattedValue ?? '',
      retentionP: '',
      loc: annotationTotalViews[i]?.loc
    });
  }
  const base = funnelData[0];
  if (base && base.value) {
    for (let i = 1; i < funnelData.length; i++) {
      funnelData[i].retentionP = format('.1%')(funnelData[i].value / base.value);
    }
  }
  return funnelData;
}

function parseYYYYMMDDtoDate(str: string): Date {
  if (str.length !== 8) throw new Error(`${str} not in YYYYMMDD format`);
  const yyyy = +str.substring(0, 4);
  const mm = +str.substring(4, 6);
  const dd = +str.substring(6);
  if (Number.isNaN(yyyy) || Number.isNaN(mm) || Number.isNaN(dd)) throw new Error(`Can't parse number properly ${str}`);

  return new Date(yyyy, mm - 1, dd);
}

function orderedAnnotationsForTour(
  tour: P_RespTour | null,
  flattenedScreens: P_RespScreen[],
  annGroupedByScreen: Record<string, IAnnotationConfig[]>,
  opts: ITourDataOpts | null,
): {
  orderedAnn: IAnnotationConfigWithLocation[];
  extLinkOpenBtnIds: string[]
} {
  if (!tour) {
    return {
      orderedAnn: [],
      extLinkOpenBtnIds: []
    };
  }

  const flattenedAnnotations: IAnnotationConfigWithLocation[] = [];
  for (const [screenId, anns] of Object.entries(annGroupedByScreen)) {
    const screen = flattenedScreens.find(s => s.id === +screenId);
    for (const ann of anns) {
      (ann as IAnnotationConfigWithLocation).location = screen ? `/demo/${tour.rid}/${screen!.rid}/${ann.refId}` : '';
      flattenedAnnotations.push(ann as IAnnotationConfigWithLocation);
    }
  }
  let hasAnn = false;
  const allAnnHm = flattenedAnnotations.reduce((hm, an) => {
    hasAnn = true;
    hm[an.refId] = an;
    return hm;
  }, {} as Record<string, IAnnotationConfigWithLocation>);

  if (!hasAnn) {
    return {
      orderedAnn: [],
      extLinkOpenBtnIds: []
    };
  }

  const main = opts!.main || '';
  const mainAnnId: string = main.split('/').at(-1)!;
  const start = allAnnHm[mainAnnId];

  if (!start) {
    return {
      orderedAnn: [],
      extLinkOpenBtnIds: []
    };
  }

  const flatAnn: IAnnotationConfigWithLocation[] = [];
  let ptr: IAnnotationConfigWithLocation = start;
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

  return {
    orderedAnn: flatAnn,
    extLinkOpenBtnIds: openLinkBtnId,
  };
}

const mapStateToProps = (state: TState): IAppStateProps => {
  const allAnnotationsForTour = getAnnotationsPerScreen(state);

  return {
    allAnnotationsForTour,
    tour: state.default.currentTour,
    principal: state.default.principal,
    journey: state.default.journey,
    ...orderedAnnotationsForTour(
      state.default.currentTour,
      state.default.allScreens,
      state.default.remoteAnnotations,
      state.default.remoteTourOpts
    )
  };
};
interface IOwnProps {
}

type IProps = IOwnProps & IAppStateProps & ReturnType<typeof mapDispatchToProps> & WithRouterProps<{
  tourId: string;
}>;

const SampleData = {
  visitors: {
    data: [
      { key: 1, name: 'Emma', day: 'Monday', timeSpent: '10s' },
      { key: 2, name: 'John', day: 'Monday', timeSpent: '12s' },
      { key: 3, name: 'John', day: 'Tuesday', timeSpent: '16s' },
      { key: 4, name: 'Emma', day: 'Thursday', timeSpent: '8s' },
    ],
    cols: [
      { title: 'Name', key: 'name', dataIndex: 'name' },
      { title: 'Visited on', key: 'day', dataIndex: 'day' },
      { title: 'Time Spent', key: 'timeSpent', dataIndex: 'timeSpent' }
    ]
  }
};
const HelpText = {
  '': {
    title: '',
    body: <div />
  },
  totalSession: {
    title: 'How is Total Sessions calculated?',
    body: (
      <div>
        <p>A sessions is created when your buyer interacts with this Fable.</p>
        <p>
          <em>Total Sessions</em> represets all the sessions that were created for past 30 days (or 60 / 90 days).
          This include repeated sessions as well.
        </p>
        <p>
          A repeated session is when a particular user visits the Fable multiple times.
        </p>
        <h3>Example</h3>
        <Table dataSource={SampleData.visitors.data} columns={SampleData.visitors.cols} size="small" pagination={false} />
        <p>
          For the above table <em>Total Sessions</em> are <b>4</b>, even though only 2 (Emma & John)
          users have visited this Fable.
        </p>
      </div>
    )
  },
  uniqueVisitors: {
    title: 'How is Unique Visitors calculated?',
    body: (
      <div>
        <p>A sessions is created when your buyer interacts with this Fable.</p>
        <p>
          <em>Unique Visitors</em> represets all the unique visitors that have interacted with this Fable.
        </p>
        <p>
          If the same user interact with the Fable multiple times we count <em>Unique Visitor</em> as 1 for that particular
          user
        </p>
        <h3>Example</h3>
        <Table dataSource={SampleData.visitors.data} columns={SampleData.visitors.cols} size="small" pagination={false} />
        <p>
          For the above table value of Total Sessions are 4 but <em>Unique Visitors</em> are <b>2</b> (Emma & John).
        </p>
      </div>
    )
  },
  conversion: {
    title: 'How is Conversion calculated?',
    body: (
      <div>
        <p>Roughly <em>Conversion</em> is percentage of <code>count of users finished this demo / count of users interacted with this demo</code></p>
        <p>
          <em>Finshing a demo</em> is calculated from the following points
        </p>
        <ul>
          <li>If user has reached the last annotation and clicked <em>Next</em> CTA</li>
          <li>If the user have clicked CTA from modules pill</li>
          <li>If the user is in between a demo and clicks a button that is not <em>Next</em> or <em>Back</em></li>
        </ul>
        <p>
          Please ensure that the CTA links are valid before deploying this Fable.
        </p>
      </div>
    )
  },
  sessionDuration: {
    title: 'How is Session Duration calculated?',
    body: (
      <div>
        <p>
          <em>Session Duration</em> for a user is the exact amount of time the user has interacted with this demo.
          The time is rounded up to the nearest second value.
        </p>
        <p>
          <em>Median Session Time</em> is a rough but useful representation number that indicates how engaging the demo is.
        </p>
        <p>
          Calculation of <em>Median Session Time</em> is done in the standard way, i.e. by recording all the session duration across
          all users and selecting the value at center.
        </p>
        <p><em>All Session Duration calculations are approximate values with maximum error value of 0.5%</em></p>
        <h3>Example</h3>
        <Table dataSource={SampleData.visitors.data} columns={SampleData.visitors.cols} size="small" pagination={false} />
        <p>
          For the above sessions on a demo, the <em>Median Session Time</em> becomes <b>11s</b>
        </p>
        <h2>Percentile Distribution</h2>
        <p>This graph gives you birds eye view of all the sessions on this demo</p>
        <div style={{ position: 'relative', height: '100px' }}>
          <Bar
            offset={0}
            xs={[1, 5, 10, 25, 50, 75, 90, 95, 99]}
            ys={[6, 11, 11, 11, 15, 18, 22, 45, 48]}
          />
        </div>
        <p>
          X Axis is the percentile buckets. Each bucket consists of roughly 11% of your users.
        </p>
        <p>
          Y Axis is <em>session duration</em> for a particular bucket.
        </p>
        <p>
          You read the chart from left to right. For example
        </p>
        <ol>
          <li>1% of the users have interacted with this demo for at most 6 seconds</li>
          <li>5% of the users have interacted with this demo for 11 seconds or less</li>
          <ul>
            <li>Or 4% (5% - 1%) of the users have interacted with this demo for at least 6 seconds and at most 11 seconds</li>
          </ul>
          <li>Interpolating the same logic, we can say, 75% of the users have  interacted with this demo for 18seconds or less</li>
          <ul>
            <li>Or 25% (75% - 50%) of the users have interacted with this demo for at least 15 seconds and at most 18 seconds</li>
          </ul>
        </ol>
        <p>
          As you can notice, the above chart, is decently skewed. (Longer bar at the end and shorter bar at the start).
        </p>
        <p>
          If your demo has a skewed chart like the above it means only a selective percentage of your users are engaging with the demo
          more than other.
        </p>
        <p>
          Your goal would be to create a demo for which the <em>Session duration distribution</em> is not very skewed. An example of such chart is following
        </p>
        <div style={{ position: 'relative', height: '100px' }}>
          <Bar
            offset={0}
            xs={[1, 5, 10, 25, 50, 75, 90, 95, 99]}
            ys={[12, 12, 12, 15, 18, 20, 24, 25, 28]}
          />
        </div>
      </div>
    )
  },
  funnel: {
    title: 'How is Funnel Drop off calculated?',
    body: (
      <div>
        <p>
          <em>Funnel dropoff</em> gives you insight about how your demo is performing as users interact with the demo.
        </p>
        <p>
          You would see how many sessions have been created per step (annotation of demo), giving you an idea of churn / retentation per step.
        </p>
        <p>
          If you click on the funnel step, you would see details about the conversion and distribution of session duration
          for that particular step.
        </p>
      </div>
    )
  }
};

interface IOwnStateProps {
  // funnelOrUserpathTab: 'funnel' | 'userpath';
  days: number;
  showHelpFor: keyof typeof HelpText | '';
  countVisitors: {
    status: LoadingStatus,
    data: RespTourView | null,
    viewDist: Array<{ date: Date, value: number }>
  },
  conversion: {
    status: LoadingStatus,
    data: number
  },
  sessionDuration: {
    status: LoadingStatus,
    pVals: TPVals
    ps: TPVals
  },
  funnelData: {
    status: LoadingStatus,
    funnelData: { funnelData: IFunnelDatum[]; title: string }[],
  }
}

class Tours extends React.PureComponent<IProps, IOwnStateProps> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      // funnelOrUserpathTab: 'funnel',
      showHelpFor: '',
      days: 30,
      countVisitors: {
        status: LoadingStatus.InProgress,
        data: null,
        viewDist: []
      },
      conversion: {
        status: LoadingStatus.InProgress,
        data: 0
      },
      sessionDuration: {
        status: LoadingStatus.InProgress,
        pVals: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        ps: ps.map(_ => +_.substring(1)) as TPVals,
      },
      funnelData: {
        status: LoadingStatus.InProgress,
        funnelData: []
      }
    };
  }

  componentDidMount(): void {
    this.props.loadTourWithData(this.props.match.params.tourId);
  }

  componentDidUpdate(prevProps: IProps, prevState: IOwnStateProps): void {
    if (this.props.tour && this.props.journey && this.state.days !== prevState.days) {
      this.initAnalytics();
    }
    if (this.props.tour && this.props.journey && this.props.orderedAnn.length !== prevProps.orderedAnn.length) {
      this.initAnalytics();
    }
  }

  initAnalytics = async (): Promise<void> => {
    this.setState(state => ({
      countVisitors: {
        data: state.countVisitors.data,
        viewDist: state.countVisitors.viewDist,
        status: LoadingStatus.InProgress
      },
      conversion: {
        data: state.conversion.data,
        status: LoadingStatus.InProgress
      },
      sessionDuration: {
        status: LoadingStatus.InProgress,
        pVals: state.sessionDuration.pVals,
        ps: state.sessionDuration.ps
      },
      funnelData: {
        status: LoadingStatus.InProgress,
        funnelData: state.funnelData.funnelData
      }
    }));

    this.props.getStepsVisitedForTour(this.props.match.params.tourId, this.state.days, (data) => {
      const medianTime = medianTimeSpentInTour(data);
      this.setState(state => ({
        sessionDuration: {
          status: LoadingStatus.Loaded,
          pVals: medianTime,
          ps: state.sessionDuration.ps
        }
      }));
    });

    const annViewsForTour = await this.props.getAnnViewsForTour(this.props.match.params.tourId, this.state.days);
    const journeysWithAnns = getJourneyWithAnnotations(this.props.allAnnotationsForTour, this.props.journey!.flows, this.props.tour!);
    const funnelDataForJourneys: { funnelData: IFunnelDatum[]; title: string }[] = [];

    if (journeysWithAnns.length) {
      const conjoinedDataForAllJourneys: IFunnelDatum[] = [];

      for (const journey of journeysWithAnns) {
        const annotationViews = getEachAnnotationTotalViews(annViewsForTour, journey.annsInOrder);
        const funnelData = getFunnelData(annotationViews, journey.annsInOrder);
        funnelDataForJourneys.push({ funnelData, title: journey.header1 });
      }

      let stepCounter = 1;
      for (const funnelData of funnelDataForJourneys) {
        for (const step of funnelData.funnelData) {
          conjoinedDataForAllJourneys.push({ ...step, step: stepCounter });
          stepCounter++;
        }
      }

      funnelDataForJourneys.unshift({ funnelData: conjoinedDataForAllJourneys, title: 'Master data' });
    } else {
      const annotationViews = getEachAnnotationTotalViews(annViewsForTour, this.props.orderedAnn);
      const funnelData = getFunnelData(annotationViews, this.props.orderedAnn);
      funnelDataForJourneys.push({ funnelData, title: DEFAULT_FUNNEL_TITLE });
    }

    this.setState({
      funnelData: {
        status: LoadingStatus.Loaded,
        funnelData: funnelDataForJourneys
      }
    });

    const totalViewData: RespTourView = await this.props.getTotalViewsForTour(this.props.match.params.tourId, this.state.days, (data) => {
      const rawDist = data.totalVisitorsByYmd || [];
      let viewDist: Array<{
        value: number;
        date: Date;
      }> = [];
      for (const visitor of rawDist) {
        let date;
        try {
          date = parseYYYYMMDDtoDate(visitor.ymd);
          viewDist.push({
            date,
            value: visitor.totalViews
          });
        } catch (e) {
          raiseDeferredError(e as Error);
          continue;
        }
      }
      viewDist = viewDist.reverse();
      this.setState({
        countVisitors: {
          data,
          viewDist,
          status: LoadingStatus.Loaded
        }
      });
      return data;
    });
    this.props.getConversionDataForTour(this.props.match.params.tourId, this.state.days, data => {
      const conversionPercentage = getConversionPercentage(data, this.props.extLinkOpenBtnIds, totalViewData.totalViews?.viewsAll ?? 0);
      this.setState({
        conversion: {
          status: LoadingStatus.Loaded,
          data: conversionPercentage
        }
      });
    });
  };

  handleDropdownItemClick = (e: { key: string; }): void => {
    this.setState({ days: parseInt(e.key, 10) });
  };

  private items: MenuProps['items'] = [
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

  render(): ReactElement {
    return (
      <GTags.ColCon>
        <GTags.HeaderCon>
          <Header
            tour={this.props.tour}
            navigateToWhenLogoIsClicked="/demos"
            rightElGroups={[(
              <Link to={`/demo/${this.props.tour?.rid}`} style={{ color: 'white' }}>
                <Button
                  size="small"
                  className="sec-btn"
                  type="default"
                  style={{
                    padding: '0 0.8rem',
                    height: '30px',
                    borderRadius: '16px',
                    backgroundColor: '#160245',
                    color: 'white'
                  }}
                >
                  Edit demo
                </Button>
              </Link>
            )]}
            titleElOnLeft={
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <GTags.Txt className="subsubhead">Insight for</GTags.Txt>
                <GTags.Txt style={{ fontWeight: 500 }}>{this.props.tour?.displayName ?? ''}</GTags.Txt>
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
                  items: this.items,
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
              >Refreshes every 1 hour
              </span>
            </div>
          </div>
          <Tags.KpiAndVisitorCon data-x-id-kvc>
            <div style={{ display: 'flex', gap: '1rem', flex: '1 0 auto', flexDirection: 'column' }} className="vis-con">
              <div style={{ display: 'flex', gap: '1rem', flex: '1 1 auto' }}>
                <Tags.KPICon style={{ border: '2px dashed #160245', flex: '1 1 auto' }}>
                  <Tags.KPIHead>
                    <div className="val">{this.state.countVisitors.data?.totalViews?.viewsAll ?? 0}</div>
                    <div className="label">Total Sessions</div>
                  </Tags.KPIHead>
                  {this.state.countVisitors.status !== LoadingStatus.Loaded && (
                  <div className="loader"><LoadingOutlined /></div>
                  )}
                  <div className="helpcn">
                    <Button
                      icon={<QuestionCircleOutlined style={{ color: '#747474', fontSize: '0.85rem' }} />}
                      onClick={() => this.setState({ showHelpFor: 'totalSession' })}
                      type="text"
                      size="small"
                    />
                  </div>
                </Tags.KPICon>
                <Tags.KPICon style={{ flex: '1 1 auto' }}>
                  <Tags.KPIHead>
                    <div className="val">{this.state.countVisitors.data?.totalViews?.viewsUnique ?? 0}</div>
                    <div className="label">Unique Visitors</div>
                  </Tags.KPIHead>
                  {this.state.countVisitors.status !== LoadingStatus.Loaded && (
                  <div className="loader"><LoadingOutlined /></div>
                  )}
                  <div className="helpcn">
                    <Button
                      icon={<QuestionCircleOutlined style={{ color: '#747474', fontSize: '0.85rem' }} />}
                      onClick={() => this.setState({ showHelpFor: 'uniqueVisitors' })}
                      type="text"
                      size="small"
                    />
                  </div>
                </Tags.KPICon>
                <Tags.KPICon style={{ flex: '1 1 auto' }}>
                  <Tags.KPIHead>
                    <div className="val">{this.state.conversion.data}%</div>
                    <div className="label">Conversion</div>
                  </Tags.KPIHead>
                  {this.state.conversion.status !== LoadingStatus.Loaded && (
                  <div className="loader"><LoadingOutlined /></div>
                  )}
                  <div className="helpcn">
                    <Button
                      icon={<QuestionCircleOutlined style={{ color: '#747474', fontSize: '0.85rem' }} />}
                      onClick={() => this.setState({ showHelpFor: 'conversion' })}
                      type="text"
                      size="small"
                    />
                  </div>
                </Tags.KPICon>
              </div>
              <div>
                <Tags.KPICon>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: '100%',
                    position: 'relative',
                    height: 'calc(160px)'
                  }}
                  >
                    <p style={{
                      opacity: '0.75',
                      fontSize: '0.75rem'
                    }}
                    >Count of sessions per day for past {this.state.days / 30} month{this.state.days / 30 > 1 ? 's' : ''}
                    </p>
                    <Line data={this.state.countVisitors.viewDist} />
                  </div>
                  {this.state.countVisitors.status !== LoadingStatus.Loaded && (
                  <div className="loader"><LoadingOutlined /></div>
                  )}
                </Tags.KPICon>
              </div>
            </div>
            <div style={{ flex: '1 0 auto', maxWidth: '480px' }}>
              <Tags.KPICon style={{
                height: 'calc(100% - 3rem)'
              }}
              >
                <Tags.KPIHead>
                  <div className="val">{this.state.sessionDuration.pVals[4]}s</div>
                  <div className="label">Median Session Time</div>
                  <p style={{
                    opacity: '0.75',
                    fontSize: '0.75rem',
                    marginTop: '4.5rem',
                    padding: '0 8px'
                  }}
                  >
                    Percentile distribution of session times across all sessions
                    <br />
                  </p>
                  <Bar
                    ys={this.state.sessionDuration.pVals}
                    xs={this.state.sessionDuration.ps}
                  />
                </Tags.KPIHead>
                {this.state.sessionDuration.status !== LoadingStatus.Loaded && (
                  <div className="loader"><LoadingOutlined /></div>
                )}
                <div className="helpcn">
                  <Button
                    icon={<QuestionCircleOutlined style={{ color: '#747474', fontSize: '0.85rem' }} />}
                    onClick={() => this.setState({ showHelpFor: 'sessionDuration' })}
                    type="text"
                    size="small"
                  />
                </div>
              </Tags.KPICon>
            </div>
          </Tags.KpiAndVisitorCon>
          <Tags.FunnelCon>
            {this.state.funnelData.funnelData.map(funnelData => (
              <Tags.KPICon style={{ height: '420px' }} key={Math.random()}>
                <Tags.KPIHead style={{ marginBottom: '20px' }}>
                  <div className="label">{funnelData.title}</div>
                </Tags.KPIHead>
                <Funnel data={funnelData.funnelData} />
                {this.state.funnelData.status !== LoadingStatus.Loaded && (
                <div className="loader"><LoadingOutlined /></div>
                )}
                <div className="helpcn">
                  <Button
                    icon={<QuestionCircleOutlined style={{ color: '#747474', fontSize: '0.85rem' }} />}
                    onClick={() => this.setState({ showHelpFor: 'funnel' })}
                    type="text"
                    size="small"
                  />
                </div>
              </Tags.KPICon>
            ))}

          </Tags.FunnelCon>
        </GTags.BodyCon>
        <Drawer
          title={HelpText[this.state.showHelpFor].title}
          onClose={() => this.setState({ showHelpFor: '' })}
          open={!!this.state.showHelpFor}
        >
          {HelpText[this.state.showHelpFor].body}
        </Drawer>
      </GTags.ColCon>
    );
  }
}

export default connect<IAppStateProps, ReturnType<typeof mapDispatchToProps>, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(Tours));
