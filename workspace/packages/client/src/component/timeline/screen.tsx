import React, { useEffect, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import * as Tags from './styled';
import { P_RespScreen } from '../../entity-processor';

const scrollIntoView = require('scroll-into-view');

interface Props {
  screen: P_RespScreen;
  selected: boolean;
  navigate: (uri: string) => void;
}

export default function TimelineScreen({
  screen,
  selected,
  navigate,
}: Props): JSX.Element {
  const { user } = useAuth0();
  const conRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) {
      setTimeout(() => {
        conRef.current && scrollIntoView(conRef.current, { time: 1000 });
      }, 100);
    }
  }, [selected]);

  return (
    <Tags.Con style={{ opacity: selected ? 1 : 0.6, marginLeft: '28px' }} ref={conRef}>
      <Tags.ScreenVerticalBar isLastScreen={false} />
      <Tags.ScreenThumbnail
        onClick={() => { navigate(`${screen.id}`); }}
        style={{ boxShadow: selected ? '0 0 0 2px #7566ff' : 'none' }}
        src={screen.thumbnailUri.href}
        alt={screen.displayName}
        tabIndex={0}
      />
      <Tags.TextCon>
        <Tags.DisplayName>{screen.displayName}</Tags.DisplayName>
        <Tags.FlexColCon>
          <Tags.DisplayableTime>{screen.displayableUpdatedAt}</Tags.DisplayableTime>
          <Tags.DisplayPicture src={user!.picture} alt="" width={16} height={16} />
        </Tags.FlexColCon>
      </Tags.TextCon>
      <Tags.ScreenVerticalBar isLastScreen={false} />
    </Tags.Con>
  );
}
