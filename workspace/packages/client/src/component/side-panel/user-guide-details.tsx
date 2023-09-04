import React, { useState } from 'react';
import { Progress } from 'antd';
import * as Tags from './styled';
import {
  CategorizedUserGuides,
  getCategorizedUserGuides,
  resetSkippedOrCompletedStatus
} from '../../user-guides/utils';
import UserGuideCard from './user-guide-card';
import { ProgressCircle } from './user-guide-progess';

interface Props {
  close: () => void;
  show: boolean;
}

export type GuideStatus = 'skipped' | 'completed' | 'remaining';

export default function UserGuideDetails(props: Props): JSX.Element {
  const [categorizedUserGuides, setCategorizedUserGuides] = useState<CategorizedUserGuides>(getCategorizedUserGuides());

  const resetCompletedOrSkippedStatus = (guideId: string, type: GuideStatus): void => {
    resetSkippedOrCompletedStatus(guideId);

    setCategorizedUserGuides(prevState => {
      const newState = { ...prevState };
      const guideIndex = newState[type].findIndex(guide => guide.id === guideId);
      const removedElement = newState[type].splice(guideIndex, 1);

      removedElement[0].isCompleted = false;
      removedElement[0].isSkipped = false;
      removedElement[0].stepsTaken = 0;
      newState.remaining.push(removedElement[0]);

      return newState;
    });
  };

  return props.show ? (
    <Tags.UserGuideDetailsCon style={{ display: props.show ? 'flex' : 'none' }}>

      <Tags.StyledCloseOutlined onClick={props.close} />

      <div style={{ margin: '1rem auto' }}>
        <ProgressCircle size={70} />
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}
      >
        <div>
          <Tags.SectionHeading>Next Steps</Tags.SectionHeading>
          {
            categorizedUserGuides.remaining.length ? (
              <>
                {categorizedUserGuides.remaining.map(userGuide => (
                  <UserGuideCard key={userGuide.id} type="remaining" guide={userGuide} />
                ))}
              </>
            ) : (
              <>
                You are all set!
              </>
            )
          }
        </div>

        {categorizedUserGuides.completed.length > 0 && (
          <div>
            <Tags.SectionHeading>Completed</Tags.SectionHeading>
            {categorizedUserGuides.completed.map(userGuide => (
              <UserGuideCard
                key={userGuide.id}
                type="completed"
                guide={userGuide}
                resetStatus={resetCompletedOrSkippedStatus}
              />
            ))}
          </div>
        )}

        {categorizedUserGuides.skipped.length > 0 && (
          <div>
            <Tags.SectionHeading>Skipped</Tags.SectionHeading>
            {categorizedUserGuides.skipped.map(userGuide => (
              <UserGuideCard
                key={userGuide.id}
                type="skipped"
                guide={userGuide}
                resetStatus={resetCompletedOrSkippedStatus}
              />
            ))}
          </div>
        )}
      </div>

      {/* TODO: add these later */}
      {/* <IntroFableGuides /> */}

    </Tags.UserGuideDetailsCon>
  ) : (<></>);
}

function IntroFableGuides():JSX.Element {
  return (

    <Tags.IntroFableGuidesCon>
      <Tags.FlexRow>
        <Tags.GridCard>
          card 1
        </Tags.GridCard>
        <Tags.GridCard>
          card 2
        </Tags.GridCard>
      </Tags.FlexRow>

      <Tags.FlexRow>
        <Tags.GridCard>
          card 3
        </Tags.GridCard>
        <Tags.GridCard>
          card 4
        </Tags.GridCard>
      </Tags.FlexRow>

      <Tags.GridCard>
        card 5
      </Tags.GridCard>
    </Tags.IntroFableGuidesCon>
  );
}
