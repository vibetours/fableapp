import React from 'react';
import { SerDoc } from '@fable/common/dist/types';
import { useAuth0 } from '@auth0/auth0-react';
import { getDisplayableTime } from '@fable/common/dist/utils';
import { sentryCaptureException } from '@fable/common/dist/sentry';
import * as Tags from './styled';
import ArrowTopRight from '../../assets/create-tour/top-right-arrow-purple.svg';
import { FrameDataToBeProcessed } from '../../container/create-tour/types';

interface Props {
  frameData: FrameDataToBeProcessed[];
  favicon: string | null;
}

export default function ScreenCard({ frameData, favicon }: Props) {
  const thumbnailFrameData = (frameData.find(frame => frame.type === 'thumbnail') || { data: '' }).data as string;
  const serDomFrameData = (frameData.find(frame => frame.type === 'serdom') || { data: null }).data as SerDoc;
  if (!thumbnailFrameData || !serDomFrameData) {
    sentryCaptureException(
      new Error('Something wrong with screen data'),
      JSON.stringify(frameData),
      'screendata.txt'
    );
    return <></>;
  }
  const { user } = useAuth0();

  return (
    <Tags.CardCon>
      <Tags.Thumbnail src={thumbnailFrameData} alt="thumbnail" />
      <Tags.TitleCon>
        {favicon ? <Tags.Avatar src={favicon} alt="favicon" /> : <div style={{ width: '1rem', height: '1rem' }} />}
        <Tags.CardTitle>{serDomFrameData.title}</Tags.CardTitle>
      </Tags.TitleCon>
      <Tags.LinkCon>
        <img src={ArrowTopRight} alt="" />
        <Tags.Link href={serDomFrameData.frameUrl}>{serDomFrameData.frameUrl}</Tags.Link>
      </Tags.LinkCon>
      <Tags.TimestampCon>
        <Tags.Timestamp>Created {getDisplayableTime(new Date())}</Tags.Timestamp>
        <Tags.Avatar src={user?.picture} alt="profile" style={{ borderRadius: '50%' }} />
      </Tags.TimestampCon>
    </Tags.CardCon>
  );
}
