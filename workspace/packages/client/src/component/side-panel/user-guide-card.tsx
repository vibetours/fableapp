import React from 'react';
import { BulbOutlined } from '@ant-design/icons';
import { Tooltip, Progress } from 'antd';
import { useNavigate } from 'react-router-dom';
import * as Tags from './styled';
import { LocalStoreUserGuideProps } from '../../user-guides/utils';
import { GuideStatus } from './user-guide-details';
import { Link } from '../create-tour/styled';
import CircleGreenFilledIcon from '../../assets/icons/circle-check-green.svg';

interface Props {
  type: GuideStatus;
  guide: LocalStoreUserGuideProps;
  resetStatus: (guideId: string, type: GuideStatus) => void;
  tourAvailable: boolean;
  bgColor: string;
  firstTourRid: string;
}

export default function UserGuideCard(props: Props): JSX.Element {
  const navigate = useNavigate();
  const formatLinkPresentString = (text: string): JSX.Element => {
    const regexPattern = /(.*?)\/(\S+)(.*)/;
    const match = regexPattern.exec(text);

    if (match) {
      const leftPart = match[1];
      const route = match[2];
      const rightPart = match[3];
      const formattedText = (
        <>
          {leftPart} <Link href={`/${route}`} style={{ color: '#7567ff', cursor: 'pointer' }}> /{route} </Link> {rightPart}
        </>
      );
      return formattedText;
    }
    return <>{text}</>;
  };

  const navigateToUserGuide = (serialId: number): void => {
    if (!props.tourAvailable) return;
    switch (serialId) {
      case 1:
        navigate('/');
        break;
      case 2:
        navigate(`/tour/${props.firstTourRid}`);
        break;
      case 3:
        navigate(`/tour/${props.firstTourRid}?g=1`);
        break;
      default:
        break;
    }
  };

  return (
    <Tags.UserGuideCard
      bgColor={props.tourAvailable ? props.bgColor : '#f5f5f5'}
      onClick={() => {
        props.resetStatus && props.resetStatus(props.guide.groupId, props.type);
        navigateToUserGuide(props.guide.serialId);
      }}
      disabled={!props.tourAvailable}
    >
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div
          style={{
            width: '2rem',
            aspectRatio: '1/1',
            backgroundColor: 'white',
            borderRadius: '2rem',
            display: 'grid',
            placeItems: 'center',
            fontSize: '1rem',
            border: '1px solid #ddd'
          }}
        >
          <BulbOutlined />
        </div>
        <Tags.UserGuideTextcon>
          <Tags.UserGuideTitle>
            {props.guide.name}
          </Tags.UserGuideTitle>
          <Tags.UserGuideDesc>
            {
              props.tourAvailable
                ? formatLinkPresentString(props.guide.desc.toursCreated)
                : props.guide.desc.toursNotCreated
            }
          </Tags.UserGuideDesc>
        </Tags.UserGuideTextcon>
      </div>
      <Tooltip
        title={(props.type === 'completed' || props.type === 'skipped') ? 'You have watched this once' : 'Not watched completely'}
        arrow={false}
        placement={(props.type === 'completed' || props.type === 'skipped') ? 'bottomLeft' : 'bottomRight'}
      >
        {(props.type === 'completed' || props.type === 'skipped') ? (
          <img
            src={CircleGreenFilledIcon}
            alt="Green checked outline"
            style={{ aspectRatio: '1/1', width: 20 }}
          />
        ) : (
          <Progress
            type="circle"
            percent={(props.guide.stepsTaken / props.guide.totalSteps) * 100}
            size={20}
            strokeWidth={14}
            strokeColor="#2bd46f"
            trailColor="#D9D9D9"
            showInfo={false}
            strokeLinecap="square"
            style={{
              transform: 'scaleX(-1)',
            }}
          />
        )}
      </Tooltip>
    </Tags.UserGuideCard>
  );
}
