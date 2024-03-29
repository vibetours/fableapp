/* eslint-disable no-mixed-operators */
import { SHORT_MONTHS } from '@fable/common/dist/utils';
import { Tooltip, Timeline } from 'antd';
import React, { ReactElement } from 'react';
import { formatTimeFromSeconds } from '../../analytics/utils';
import { SessionActivity } from '../../container/analytics';
import * as Tags from '../../container/analytics/styled';
import { AnnInverseLookupIndex, LeadActivityWithTime } from '../../types';

interface Props {
  timelineData: SessionActivity;
  annotationLookupMap: AnnInverseLookupIndex;
  maxTimeSpentOnSession: number;
}

function getDate(uts: string): { date: string, time: string } {
  const d = new Date(+uts * 1000);
  const date = `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

  const time = d.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
  return {
    date,
    time
  };
}

function getTimelineAndAnnData(timeline: LeadActivityWithTime, map: AnnInverseLookupIndex) {
  if (!(timeline.payloadAnnId in map)) {
    return {
      hueRotation: 0,
      label: '',
      step: '',
      journeyName: '',
      annDisplayText: '',
      href: ''
    };
  }

  return {
    hueRotation: map[timeline.payloadAnnId].flowIndex / map[timeline.payloadAnnId].flowLength * 360,
    label: `${map[timeline.payloadAnnId].journeyName ? `${map[timeline.payloadAnnId].journeyName} /` : ''} Step ${map[timeline.payloadAnnId].stepNo}`,
    journeyName: map[timeline.payloadAnnId].journeyName,
    step: `Step ${map[timeline.payloadAnnId].stepNo}`,
    annDisplayText: map[timeline.payloadAnnId].ann.displayText,
    href: map[timeline.payloadAnnId].ann.location
  };
}

function InteractionsTimeline(props: Props): ReactElement {
  if (props.timelineData.leadActivity.length === 0) {
    return <></>;
  }

  const formattedDate = getDate(props.timelineData.leadActivity[0].uts);
  return (
    <Tags.TimelineCon>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
        <Tags.UserDataTxt style={{
          fontSize: '0.85rem',
          fontWeight: 600
        }}
        >{formattedDate.date} : {formattedDate.time}
        </Tags.UserDataTxt>
        -
        <Tags.UserDataTxt
          className="subtext"
          style={{
            fontSize: '0.85rem',
            fontWeight: 600
          }}
        >
          Session for {formatTimeFromSeconds(props.timelineData.timeSpentOnSession)}
        </Tags.UserDataTxt>
      </div>
      <div style={{ margin: '2px 0px', display: 'grid', gridTemplateColumns: '1fr' }}>
        <Timeline
          style={{ paddingTop: '10px' }}
          mode="left"
          items={props.timelineData.leadActivity.map((timeline) => {
            const data = getTimelineAndAnnData(timeline, props.annotationLookupMap);
            return {
              color: '#7a7a7c',
              label: (
                <Tooltip
                  placement="left"
                  title={(
                    <Tags.TimelineLabelTooltip>
                      {data.step && (
                        <div className="step"><b>{data.step}</b> of Module
                          &nbsp;
                          <Tags.Colored hueRotation={data.hueRotation}>{data.journeyName}</Tags.Colored>
                        </div>)}
                      {data.annDisplayText && (<div className="dtxt">{data.annDisplayText}</div>)}
                      <div className="hlpr">Click to open the annotation in a new tab</div>
                    </Tags.TimelineLabelTooltip>
              )}
                >
                  <a href={data.href} target="_blank" rel="noreferrer">{data.label}</a>
                </Tooltip>
              ),
              children: (
                <div key={timeline.payloadAnnId}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Tooltip
                      placement="right"
                      title={(
                        <Tags.TimelineLabelTooltip>
                          <div className="step">
                            {data.step && (
                              <>
                                <b>{data.step}</b><br />{data.journeyName ? (<>Module &nbsp;<Tags.Colored hueRotation={data.hueRotation}>{data.journeyName}</Tags.Colored></>) : undefined}
                              </>
                            )}
                            <div className="step">Time spent&nbsp;<b>{timeline.timeSpenOnAnnInSec} Seconds</b></div>
                          </div>
                        </Tags.TimelineLabelTooltip>
                      )}
                    >
                      <Tags.AnnTimeSpent
                        val={timeline.timeSpenOnAnnInSec}
                        maxVal={props.maxTimeSpentOnSession}
                        hueRotation={data.hueRotation}
                      >
                        {formatTimeFromSeconds(timeline.timeSpenOnAnnInSec)}
                      </Tags.AnnTimeSpent>
                    </Tooltip>
                  </div>
                </div>
              )
            };
          })}
        />
      </div>
    </Tags.TimelineCon>
  );
}

export default InteractionsTimeline;
