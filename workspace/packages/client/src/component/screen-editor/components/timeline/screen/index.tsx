import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { P_RespScreen } from '../../../../../entity-processor';
import * as Tags from './styled';

interface Props {
  screen: P_RespScreen;
  isLastScreen: boolean;
  navigate: (uri: string) => void;
  annotationId: string | null;
}

export default function TimelineScreen({ screen, isLastScreen, navigate, annotationId }: Props) {
  const { user } = useAuth0();

  return (
    <Tags.Con isLastScreen={isLastScreen}>
      <Tags.ScreenThumbnail
        onClick={() => (annotationId ? navigate(`${screen.id}/${annotationId}`) : navigate(`${screen.id}`))}
        src={screen.thumbnailUri.href}
        alt={screen.displayName}
        tabIndex={0}
        width={86}
      />
      <Tags.TextCon>
        <Tags.DisplayName>{screen.displayName}</Tags.DisplayName>
        <Tags.FlexColCon>
          <Tags.DisplayableTime>{screen.displayableUpdatedAt}</Tags.DisplayableTime>
          <Tags.DisplayPicture src={user!.picture} alt="" width={16} height={16} />
        </Tags.FlexColCon>
      </Tags.TextCon>
      <Tags.VerticalBar isLastScreen={isLastScreen} />
    </Tags.Con>
  );
}
