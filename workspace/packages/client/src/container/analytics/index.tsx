import { ClockCircleOutlined, DownOutlined, LoadingOutlined, QuestionCircleOutlined, UndoOutlined } from '@ant-design/icons';
import {
  ButtonClicks,
  RespConversion,
  RespTourAnnViews,
  RespTourAnnWithPercentile,
  RespTourLeads,
  RespTourView,
  RespUser,
  TourAnnViewsWithPercentile,
  TourAnnWithViews,
} from '@fable/common/dist/api-contract';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { ITourDataOpts, JourneyData } from '@fable/common/dist/types';
import { Button, Divider, Drawer, MenuProps, Table, Tooltip, Dropdown } from 'antd';
import { format } from 'd3-format';
import React, { ReactElement } from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  getAnnViewsForTour,
  getConversionDataForTour,
  getLeadActivityForTour,
  getLeadsForTour,
  getStepsVisitedForTour,
  getTotalViewsForTour,
  loadTourAndData
} from '../../action/creator';
import { formatTimeFromSeconds } from '../../analytics/utils';
import * as GTags from '../../common-styled';
import InteractionsTimeline from '../../component/analytics/interactions-timeline';
import { IAnnotationConfigWithScreenId } from '../../component/annotation/annotation-config-utils';
import Header from '../../component/header';
import { P_RespTour } from '../../entity-processor';
import { TState } from '../../reducer';
import { WithRouterProps, withRouter } from '../../router-hoc';
import { AnnInverseLookupIndex, AnnotationPerScreen, JourneyModuleWithAnns, LeadActivityData, LeadActivityWithTime } from '../../types';
import { annotationInverseLookupIndex, flatten, getAnnotationsPerScreen, getJourneyWithAnnotationsNormalized } from '../../utils';
import Bar from './bar';
import Line from './line';
import Funnel, { IFunnelDatum } from './sleeping-funnel';
import * as Tags from './styled';

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
  ) => dispatch(getAnnViewsForTour(rid, days)),
  getLeadsForTour: (
    rid: string,
    days: number,
    onComplete: (data: RespTourLeads) => void
  ) => dispatch(getLeadsForTour(rid, days)).then(onComplete),
  getLeadActivityForTour: (
    rid: string,
    aid: string,
    onComplete: (data: LeadActivityData[]) => void
  ) => dispatch(getLeadActivityForTour(rid, aid)).then(onComplete)
});

const DEFAULT_FUNNEL_TITLE = 'Funnel drop off across all sessions';

export interface IAnnotationConfigWithLocation extends IAnnotationConfigWithScreenId {
  location: string;
}

interface IAppStateProps {
  tour: P_RespTour | null;
  principal: RespUser | null;
  // orderedAnn: IAnnotationConfigWithLocation[];
  allAnnotationsForTour: AnnotationPerScreen[];
  journey: JourneyData | null;
  isTourLoaded: boolean;
  opts: ITourDataOpts | null
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
        const button = buttons.find(b => b !== undefined && (b.btnId === openLinkBtnId[i] || b.btnId === '$journey_cta' || b.btnId === '$header_cta'));
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

function getTimeSpentOnAllSessions(activityTimeline: ActivityTimeline):number {
  let totalTimeSpent = 0;

  for (const sid in activityTimeline) {
    if (activityTimeline[sid]) {
      const timeSpentInSession = activityTimeline[sid].timeSpentOnSession;
      totalTimeSpent += timeSpentInSession;
    }
  }
  return totalTimeSpent;
}

function getFormattedTimeSpentOnAllSessions(activityTimeline: ActivityTimeline): string {
  const timeSpent = getTimeSpentOnAllSessions(activityTimeline);
  return formatTimeFromSeconds(timeSpent);
}

const mapStateToProps = (state: TState): IAppStateProps => {
  const allAnnotationsForTour = getAnnotationsPerScreen(state);

  return {
    allAnnotationsForTour,
    opts: state.default.remoteTourOpts,
    tour: state.default.currentTour,
    principal: state.default.principal,
    journey: state.default.journey,
    isTourLoaded: state.default.tourLoaded,
  };
};
interface IOwnProps {
}

type IProps = IOwnProps & IAppStateProps & ReturnType<typeof mapDispatchToProps> &
WithRouterProps<{
  tourId: string;
  activeKey?: 'leads' | 'funnel-dropoff';
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

function groupAndSortSid(payloads: LeadActivityData[]): ActivityTimeline {
  const sortedPayloads = Object.values(payloads).sort((a, b) => parseInt(a.uts, 10) - parseInt(b.uts, 10));
  const groupedPayloads: ActivityTimeline = {};

  sortedPayloads.forEach((payload, index) => {
    if (!(payload.sid in groupedPayloads)) {
      groupedPayloads[payload.sid] = {
        leadActivity: [],
        timeSpentOnSession: 5,
        maxTimeSpentOnSession: 5
      };
      const payloadWithTime: LeadActivityWithTime = {
        ...payload,
        timeSpenOnAnnInSec: 5
      };
      groupedPayloads[payload.sid].leadActivity.push(payloadWithTime);
    } else {
      const currentTime = new Date(+payload.uts * 1000);
      const prevTime = new Date(+sortedPayloads[index - 1].uts * 1000);
      const millisecondsDiff = currentTime.getTime() - prevTime.getTime();
      const timeSpenOnAnnInSec = millisecondsDiff / 1000;
      const payloadWithTime: LeadActivityWithTime = {
        ...payload,
        timeSpenOnAnnInSec
      };
      groupedPayloads[payload.sid].leadActivity.push(payloadWithTime);
      groupedPayloads[payload.sid].timeSpentOnSession += timeSpenOnAnnInSec;
      if (groupedPayloads[payload.sid].maxTimeSpentOnSession < timeSpenOnAnnInSec) {
        groupedPayloads[payload.sid].maxTimeSpentOnSession = timeSpenOnAnnInSec;
      }
    }
  });

  const finalGroupPayload: ActivityTimeline = {};
  Object.keys(groupedPayloads).reverse().forEach(sid => {
    finalGroupPayload[sid] = {
      leadActivity: groupedPayloads[sid].leadActivity.reverse(),
      timeSpentOnSession: groupedPayloads[sid].timeSpentOnSession,
      maxTimeSpentOnSession: groupedPayloads[sid].maxTimeSpentOnSession
    };
  });
  return finalGroupPayload;
}
function getMailFromAid(hashAid: string, leadPerMail: LeadsPerMail): string | null {
  for (const mail in leadPerMail) {
    if (mail in leadPerMail) {
      const lead = leadPerMail[mail].aids.find((aid) => aid === hashAid.substring(1));
      if (lead !== undefined) {
        return mail;
      }
    }
  }
  return null;
}

function getMaxTimeSpent(activityTimeline: ActivityTimeline): number {
  let maxSessionTime = 0;
  for (const sid in activityTimeline) {
    if (activityTimeline[sid]) {
      maxSessionTime = Math.max(maxSessionTime, activityTimeline[sid].maxTimeSpentOnSession);
    }
  }
  return maxSessionTime;
}

interface ActivityDetails {
  numberOfSessions: number,
  timeSpentAcrossAllSessions: string,
  userClickedCTA: boolean
}

export interface SessionActivity {
    leadActivity: LeadActivityWithTime[],
    timeSpentOnSession: number,
    maxTimeSpentOnSession: number
  }

interface ActivityTimeline {
  [sid: string]: SessionActivity
}

const initialLeadsData = {
  status: LoadingStatus.InProgress,
  tourLeads: {},
  uniqueEmailCount: 0
};

type ActiveTabKey = 'funnel-dropoff' | 'leads'

interface LeadsPerMail {
  [email: string]: {idx: number, aids: string[]};
}
interface IOwnStateProps {
  days: number;
  showHelpFor: keyof typeof HelpText | '';
  extLinkOpenBtnIds: string[];
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
    funnelData: Array<IFunnelDatum[]>,
    selectedTab: number,
    tabs: string[],
  },
  leadsData: {
    status: LoadingStatus,
    tourLeads: LeadsPerMail,
    uniqueEmailCount: number,
  },
  annotationLookupMap: AnnInverseLookupIndex;
  activityTimeline: ActivityTimeline | null,
  activityTimelineLoaded: LoadingStatus,
  activityTimelines: Record<string, ActivityTimeline>,
  activeKey: ActiveTabKey,
  currentEmail: string | null,
  activityDetails: ActivityDetails,
  ctaClickedForMail: Record<string, boolean>
}

class Tours extends React.PureComponent<IProps, IOwnStateProps> {
  constructor(props: IProps) {
    super(props);
    this.state = {
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
      extLinkOpenBtnIds: [],
      sessionDuration: {
        status: LoadingStatus.InProgress,
        pVals: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        ps: ps.map(_ => +_.substring(1)) as TPVals,
      },
      funnelData: {
        status: LoadingStatus.InProgress,
        funnelData: [],
        selectedTab: 0,
        tabs: [],
      },
      annotationLookupMap: {},
      leadsData: initialLeadsData,
      activityTimeline: null,
      activityTimelineLoaded: LoadingStatus.NotStarted,
      activityTimelines: {},
      activeKey: 'funnel-dropoff',
      currentEmail: null,
      activityDetails: {
        numberOfSessions: 0,
        timeSpentAcrossAllSessions: '',
        userClickedCTA: false
      },
      ctaClickedForMail: {}
    };
  }

  componentDidMount(): void {
    this.props.loadTourWithData(this.props.match.params.tourId);
    this.handleInitialActiveKey();
  }

  async componentDidUpdate(prevProps: IProps, prevState: IOwnStateProps): Promise<void> {
    if (this.props.tour && this.props.journey && this.state.days !== prevState.days) {
      this.initAnalytics();
    }
    if (this.props.journey && this.props.isTourLoaded !== prevProps.isTourLoaded && this.props.isTourLoaded) {
      this.initAnalytics();
    }

    if ((this.props.isTourLoaded && prevProps.isTourLoaded !== this.props.isTourLoaded)
      || this.state.days !== prevState.days) {
      this.setState({
        leadsData: initialLeadsData,
        activityTimeline: null,
        activityTimelineLoaded: LoadingStatus.NotStarted,
        activityTimelines: {},
        currentEmail: null
      });
      this.props.getLeadsForTour(this.props.match.params.tourId, this.state.days, (data) => {
        const leadPerMail : LeadsPerMail = data.tourLeads.reduce((accumulator, currentLead, index) => {
          if (currentLead.email in accumulator) (accumulator as any)[currentLead.email].aids.push(currentLead.aid);
          else (accumulator as any)[currentLead.email] = { i: index, aids: [currentLead.aid] };
          return accumulator;
        }, {});

        let currentEmail : null | string = null;
        if (this.props.location.hash) {
          currentEmail = getMailFromAid(this.props.location.hash, leadPerMail);
        } else if (data.tourLeads.length !== 0) {
          currentEmail = data.tourLeads[0].email;
        }
        this.setState((prevS) => ({
          leadsData: {
            status: LoadingStatus.Loaded,
            tourLeads: leadPerMail,
            uniqueEmailCount: data.uniqueEmailCount,
          },
          activityTimelineLoaded: data.tourLeads.length === 0 ? LoadingStatus.Loaded : LoadingStatus.NotStarted,
          currentEmail
        }));
      });
    }

    if (this.state.currentEmail !== prevState.currentEmail
      && this.state.currentEmail !== null) {
      if (this.state.activityTimelines[this.state.currentEmail]) {
        this.setState(prevS => {
          const activityDetails: ActivityDetails = {
            numberOfSessions: Object.keys(prevS.activityTimelines[prevS.currentEmail!]).length,
            timeSpentAcrossAllSessions:
              getFormattedTimeSpentOnAllSessions(prevS.activityTimelines[prevS.currentEmail!]),
            userClickedCTA: prevS.ctaClickedForMail[prevS.currentEmail!]
          };
          return {
            activityTimeline: prevS.activityTimelines[prevS.currentEmail!],
            activityTimelineLoaded: LoadingStatus.Loaded,
            activityDetails
          };
        });
      } else {
        this.setState({
          activityTimeline: null,
          activityTimelineLoaded: LoadingStatus.InProgress
        });

        let emailActivity: LeadActivityData[] = [];
        let numberOfEmailActivityAdded = 0;

        const buttonIdMap : Record<string, boolean> = this.state.extLinkOpenBtnIds.reduce((map, buttonId) => {
          (map as any)[buttonId] = true;
          return map;
        }, {} as Record<string, boolean>);
        let ctaButtonClicked = false;
        this.state.leadsData.tourLeads[this.state.currentEmail].aids.forEach((aid) => {
          this.props.getLeadActivityForTour(this.props.match.params.tourId, aid, (data) => {
            emailActivity = [...emailActivity, ...data];
            numberOfEmailActivityAdded++;
            ctaButtonClicked = ctaButtonClicked || data.some(activity => buttonIdMap[activity.payloadButtonId]);

            if (numberOfEmailActivityAdded === this.state.leadsData.tourLeads[this.state.currentEmail!].aids.length) {
              const allTimelineForMail = groupAndSortSid(emailActivity);
              this.setState(prevS => {
                const activityDetails: ActivityDetails = {
                  numberOfSessions: Object.keys(allTimelineForMail).length,
                  timeSpentAcrossAllSessions:
                    getFormattedTimeSpentOnAllSessions(allTimelineForMail),
                  userClickedCTA: ctaButtonClicked
                };

                return {
                  activityTimeline: allTimelineForMail,
                  activityTimelineLoaded: LoadingStatus.Loaded,
                  activityTimelines: {
                    ...prevS.activityTimelines,
                    [prevS.currentEmail!]: allTimelineForMail
                  },
                  activityDetails,
                  ctaClickedForMail: {
                    ...prevS.ctaClickedForMail,
                    [prevS.currentEmail!]: ctaButtonClicked
                  }
                };
              });
            }
          });
        });
      }
    }
  }

  // eslint-disable-next-line class-methods-use-this
  getBtnIdsLinkedWithConversion = (journeysWithAnns: JourneyModuleWithAnns[]): string[] => {
    const btnIds: string[] = [];

    for (const ann of journeysWithAnns[0].annsInOrder) {
      for (const btn of ann.buttons) {
        if ((btn.type === 'custom' || btn.type === 'next') && btn.hotspot && btn.hotspot.actionType === 'open') {
          btnIds.push(btn.id);
        }
      }
    }

    return btnIds;
  };

  initAnalytics = async (): Promise<void> => {
    const journeysWithAnns = getJourneyWithAnnotationsNormalized(
      this.props.allAnnotationsForTour,
      this.props.journey!.flows,
      this.props.tour!,
      this.props.opts!
    );

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
        funnelData: state.funnelData.funnelData,
        selectedTab: 0,
        tabs: journeysWithAnns.map((item, i) => (i ? item.header1 : 'All'))
      },
      annotationLookupMap: annotationInverseLookupIndex(journeysWithAnns),
      extLinkOpenBtnIds: this.getBtnIdsLinkedWithConversion(journeysWithAnns),
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
    const annotationViews = getEachAnnotationTotalViews(annViewsForTour, journeysWithAnns[this.state.funnelData.selectedTab].annsInOrder);
    const funnelDataPerModule = journeysWithAnns.map(item => getFunnelData(annotationViews, item.annsInOrder));

    this.setState(state => ({
      funnelData: {
        ...state.funnelData,
        status: LoadingStatus.Loaded,
        funnelData: funnelDataPerModule,
      },
    }));

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
      this.setState(state => ({
        conversion: {
          status: LoadingStatus.Loaded,
          data: getConversionPercentage(
            data,
            state.extLinkOpenBtnIds,
            totalViewData.totalViews ?? 0
          )
        }
      }));
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

  handleInitialActiveKey(): void {
    const propsActiveKey = this.props.match.params.activeKey;
    if (propsActiveKey) {
      this.setState({ activeKey: propsActiveKey });
    } else {
      window.history.replaceState({}, '', `${this.props.location.pathname}/funnel-dropoff`);
    }
  }

  handleActiveKey(activeKey: ActiveTabKey): void {
    this.setState({ activeKey });
    const pathNameSegment = this.props.location.pathname.split('/');
    if (pathNameSegment[pathNameSegment.length - 1] === 'leads'
    || pathNameSegment[pathNameSegment.length - 1] === 'funnel-dropoff') { pathNameSegment.pop(); }
    const newPathName = pathNameSegment.join('/');
    const newUrl = `${newPathName}/${activeKey}`;
    window.history.replaceState({}, '', newUrl);
  }

  render(): ReactElement {
    return (
      <GTags.ColCon>
        <GTags.HeaderCon>
          <Header
            showOnboardingGuides
            tour={this.props.tour}
            navigateToWhenLogoIsClicked="/demos"
            rightElGroups={[(
              <Link to={`/demo/${this.props.tour?.rid}`} style={{ color: 'white' }}>
                <Button
                  size="small"
                  className="edit-btn"
                  type="default"
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
            principal={this.props.principal}
            showCalendar
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
                    <div className="val">{this.state.countVisitors.data?.totalViews ?? 0}</div>
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
                    <div className="val">{this.state.countVisitors.data?.uniqueViews ?? 0}</div>
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
                <Tags.KPICon style={{ border: '2px dashed #160245', flex: '1 1 auto' }}>
                  <Tags.KPIHead>
                    <div className="val">{this.state.leadsData.uniqueEmailCount ?? 0}</div>
                    <div className="label">Leads Captured</div>
                  </Tags.KPIHead>
                  {this.state.leadsData.status !== LoadingStatus.Loaded && (
                    <div className="loader"><LoadingOutlined /></div>
                  )}
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
          <div style={{ margin: '0 10%' }}>
            <Tags.AnalyticsTabs
              activeKey={this.state.activeKey}
              onChange={(activeKey) => {
                this.handleActiveKey(activeKey as ActiveTabKey);
              }}
              destroyInactiveTabPane
              items={[
                {
                  key: 'funnel-dropoff',
                  label: <>Funnel Drop off</>,
                  children: (
                    <Tags.FunnelCon>
                      <Tags.KPICon style={{ height: '420px', justifyContent: 'unset', alignItems: 'unset' }} className="waldo">
                        <Tags.TabsWithVisibilityCtrl
                          tabBarGutter={8}
                          style={{ font: 'inherit', padding: '1rem' }}
                          destroyInactiveTabPane
                          type="card"
                          hidden={this.state.funnelData.tabs.length <= 1}
                          size="small"
                          items={this.state.funnelData.tabs.map((name, i) => ({
                            key: String(i),
                            label: name,
                            children: (
                              <div style={{
                                height: '360px'
                              }}
                              >
                                <Funnel data={this.state.funnelData.funnelData[i] || []} />
                              </div>
                            )
                          }))}
                          onChange={(key) => this.setState(state => ({
                            funnelData: {
                              ...state.funnelData,
                              selectedTab: +key,
                            }
                          }))}
                        />
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

                    </Tags.FunnelCon>
                  )
                },
                {
                  key: 'leads',
                  label: <>Lead Activity</>,
                  children: (
                    <div style={{ minHeight: '50vh' }}>
                      <p style={{
                        fontSize: '0.85rem',
                        padding: '0 1.5rem',
                        lineHeight: '1rem',
                        color: '#757575',
                        margin: '0rem 0rem 1.5rem 0rem'
                      }}
                      >
                        Lead activity outlines how a lead interacted with the demo.
                        In the left hand side of the following section, all the emailIds are listed.
                        On the right hand side the details of demo interaction is outlined.
                      </p>
                      {this.state.leadsData.status !== LoadingStatus.Loaded ? (
                        <Tags.LoaderCon><LoadingOutlined /></Tags.LoaderCon>
                      )
                        : (
                          <div>
                            <Tags.UserDataCon>
                              <Tags.UserDataTxt className="title">Email ID</Tags.UserDataTxt>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Tags.UserDataTxt className="title">Activity</Tags.UserDataTxt>
                              </div>
                            </Tags.UserDataCon>
                            <Divider style={{ marginBottom: '5px', marginTop: '0px' }} />
                            <Tags.UserDataCon>
                              <div style={{ flex: '1 0 auto' }}>
                                {Object.keys(this.state.leadsData.tourLeads).map((lead) => (
                                  <Tags.UserDataMailCon
                                    key={lead}
                                    className={lead === this.state.currentEmail ? 'active' : ''}
                                    onClick={() => {
                                      this.setState((prevS) => ({ currentEmail: lead }));
                                      window.history.pushState(null, '', `#${this.state.leadsData.tourLeads[lead].aids[0]}`);
                                    }}
                                  >
                                    <Tags.UserDataTxt
                                      className={
                                        lead === this.state.currentEmail ? ' subtext active' : 'subtext'
                                      }
                                    >
                                      {lead}
                                    </Tags.UserDataTxt>
                                  </Tags.UserDataMailCon>
                                ))}
                              </div>
                              <div style={{ display: 'flex', gap: '10px' }}>
                                <Tags.UserDataTimeline
                                  style={{
                                    flex: '1 0 auto',
                                    borderRadius: '16px',
                                    minHeight: this.state.activityTimelineLoaded !== LoadingStatus.Loaded ? '80vh' : undefined
                                  }}
                                >
                                  {
                                  this.state.activityTimelineLoaded === LoadingStatus.Loaded
                                    ? (
                                      <div>
                                        {
                                        this.state.activityTimeline && (
                                        <div className="timelinecon">
                                          {Object.keys(this.state.activityTimeline!).map(sid => (
                                            <InteractionsTimeline
                                              key={sid}
                                              timelineData={this.state.activityTimeline![sid]}
                                              annotationLookupMap={this.state.annotationLookupMap}
                                              maxTimeSpentOnSession={getMaxTimeSpent(this.state.activityTimeline!)}
                                            />
                                          ))}
                                        </div>
                                        )
                                        }
                                      </div>
                                    )
                                    : (<LoadingOutlined />)
                                }
                                </Tags.UserDataTimeline>
                                {this.state.activityTimeline && (
                                <Tags.UserMetaInf>
                                  <p>
                                    <span>Number of sessions</span>
                                    <Tags.ActivityInfo>
                                      <UndoOutlined />&nbsp;{this.state.activityDetails.numberOfSessions}
                                    </Tags.ActivityInfo>
                                  </p>
                                  <p>
                                    <span>Time spent across all sessions</span>
                                    <Tags.ActivityInfo><ClockCircleOutlined />&nbsp;
                                      {this.state.activityDetails.timeSpentAcrossAllSessions}
                                    </Tags.ActivityInfo>
                                  </p>
                                  <p>
                                    <span>User has clicked CTA</span>
                                    <Tags.ActivityInfo>
                                      {this.state.activityDetails.userClickedCTA ? 'Yes' : 'No'}
                                    </Tags.ActivityInfo>
                                  </p>
                                </Tags.UserMetaInf>
                                )}
                              </div>
                            </Tags.UserDataCon>
                          </div>
                        )}
                    </div>
                  )
                }
              ]}
            />
          </div>
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
