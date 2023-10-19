import React from 'react';
import { Tooltip } from 'antd/lib';
import { CopyOutlined } from '@ant-design/icons';
import * as Tags from './styled';

interface Props {
  src: string;
  copyHandler: () => void;
  height: string;
  width: string;
}

const pMargin = '0.25rem 0.25rem 0.25rem 1.5rem';
const tagStyle = { color: '#e45649' };
const attrKeyStyle = { color: '#4078f2' };
const attrValStyle = { color: '#50a14f' };

export default function IframeCodeSnippet(props: Props): JSX.Element {
  return (
    <Tags.CodeCon>
      <Tooltip title="Copy to clipboard">
        <CopyOutlined
          className="copy-outline"
          onClick={props.copyHandler}
        />
      </Tooltip>

      <p style={{ margin: '0 0.25rem', ...tagStyle }}>{'<iframe'}</p>
      <p style={{ margin: pMargin }}>
        <span style={{ ...attrKeyStyle }}>style="</span>
        <span style={{ ...attrValStyle }}>border: 1px solid rgba(0, 0, 0, 0.1);"</span>
      </p>
      <p style={{ margin: pMargin }}>
        <span style={{ ...attrKeyStyle }}>width=</span>
        <span style={{ ...attrValStyle }}>"{props.width}"</span>
        <span style={{ ...attrKeyStyle }}>   height=</span>
        <span style={{ ...attrValStyle }}>"{props.height}"</span>
      </p>
      <p style={{ margin: pMargin }}>
        <span style={{ ...attrKeyStyle }}>src=</span>
        <span style={{ ...attrValStyle }}>"{props.src}"</span>
      </p>
      <p style={{ margin: pMargin, ...attrKeyStyle }}>
        <span style={{ ...attrKeyStyle }}>allowfullscreen</span>
      </p>
      <p style={{ margin: '0 0.25rem', ...tagStyle }}>{'</iframe>'}</p>
    </Tags.CodeCon>
  );
}
