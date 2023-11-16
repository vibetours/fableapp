import React from 'react';
import * as Tags from './styled';

interface Props {
  style?: React.CSSProperties;
  selColor?: string;
}

export default function FocusBubble(props: Props): JSX.Element {
  return (
    <Tags.Con style={props.style}>
      <Tags.HelpBubble selColor={props.selColor}>
        <Tags.HelpBubbleOuterDot selColor={props.selColor}>
          <Tags.HelpBubbleInnerDot selColor={props.selColor} />
        </Tags.HelpBubbleOuterDot>
      </Tags.HelpBubble>
    </Tags.Con>
  );
}
