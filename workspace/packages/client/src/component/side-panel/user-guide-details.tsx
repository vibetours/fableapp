import React, { useState } from 'react';
import * as Tags from './styled';
import {
  resetSkippedOrCompletedStatus,
  LocalStoreUserGuideProps,
  getUserGuidesInArray
} from '../../user-guides/utils';
import { getTourGuideCardColor, getUserGuideType } from './utils';
import openBookIcons from '../../assets/icons/open-book.svg';
import UserGuideCard from './user-guide-card';

interface Props {
  close: () => void;
  show: boolean;
  tourAvailable: boolean;
  firstTourRid: string;
}

export type GuideStatus = 'skipped' | 'completed' | 'remaining';

export default function UserGuideDetails(props: Props): JSX.Element {
  const [userGuides, setUserGuides] = useState<LocalStoreUserGuideProps[]>(getUserGuidesInArray());

  const resetCompletedOrSkippedStatus = (guideId: string, type: GuideStatus): void => {
    resetSkippedOrCompletedStatus(guideId);

    setUserGuides(prvGuide => {
      const newGuide = [...prvGuide];
      const currentGuide = newGuide.find(guide => guide.groupId === guideId) as LocalStoreUserGuideProps;
      currentGuide!.isCompleted = false;
      currentGuide!.isSkipped = false;
      currentGuide!.stepsTaken = 0;
      return newGuide;
    });
  };

  return props.show ? (
    <Tags.UserGuideDetailsCon style={{ display: props.show ? 'flex' : 'none' }}>

      <Tags.StyledCloseOutlined onClick={props.close} />

      <div style={{ margin: '1rem 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem'
          }}
        >
          <img
            src={openBookIcons}
            alt="Guide icon"
          />
          <div>
            <div style={{
              color: '#212121', fontSize: '1rem', fontWeight: '500'
            }}
            >
              User guides
            </div>
            <div
              style={{ color: '#6a6a6a', fontSize: '0.875rem', marginTop: '2px' }}
            >
              Learn how to use Fable
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          {userGuides.filter(Boolean).map((userGuide, idx) => (
            <UserGuideCard
              key={userGuide.id}
              type={getUserGuideType(userGuide)}
              guide={userGuide}
              tourAvailable={props.tourAvailable}
              bgColor={getTourGuideCardColor(idx)}
              resetStatus={resetCompletedOrSkippedStatus}
              firstTourRid={props.firstTourRid}
            />
          ))}
        </div>
      </div>

      {/* TODO: add these later */}
      {/* <IntroFableGuides /> */}

    </Tags.UserGuideDetailsCon>
  ) : (<></>);
}

function IntroFableGuides(): JSX.Element {
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
