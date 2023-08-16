import React from 'react';

interface Props {
    src: string,
}

const pMargin = '0.25rem 0.25rem 0.25rem 1.5rem';
const tagStyle = { color: '#e45649' };
const attrKeyStyle = { color: '#4078f2' };
const attrValStyle = { color: '#50a14f' };

export default function IframeCodeSnippet(props: Props): JSX.Element {
  return (
    <code>
      <p style={{ margin: '0 0.25rem', ...tagStyle }}>{'<iframe'}</p>
      <p style={{ margin: pMargin }}>
        <span style={{ ...attrKeyStyle }}>style="</span>
        <span style={{ ...attrValStyle }}>border: 1px solid rgba(0, 0, 0, 0.1);"</span>
      </p>
      <p style={{ margin: pMargin }}>
        <span style={{ ...attrKeyStyle }}>width=</span>
        <span style={{ ...attrValStyle }}>"800"</span>
        <span style={{ ...attrKeyStyle }}>   height=</span>
        <span style={{ ...attrValStyle }}>"450"</span>
      </p>
      <p style={{ margin: pMargin }}>
        <span style={{ ...attrKeyStyle }}>src=</span>
        <span style={{ ...attrValStyle }}>"{props.src}"</span>
      </p>
      <p style={{ margin: pMargin, ...attrKeyStyle }}>
        <span style={{ ...attrKeyStyle }}>allowfullscreen</span>
      </p>
      <p style={{ margin: '0 0.25rem', ...tagStyle }}>{'</iframe>'}</p>
    </code>
  );
}
