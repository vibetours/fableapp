import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { nord } from '@uiw/codemirror-theme-nord';
import { html } from '@codemirror/lang-html';
import CopyHandler from '../publish-preview/copy-handler';
import * as Tags from './styled';

interface Props {
  src: string;
  copyHandler: () => void;
  copyUrl: string;
  height: string;
  width: string;
}

function prepareIframeEmbedCode(opts: {
  src: string;
  width: string;
  height: string;
}): string {
  return `
<iframe
  src="${opts.src}"
  width="${opts.width}"
  height="${opts.height}"
  style="border: none"
  allowfullscreen
/>
  `.trim();
}

export default function IframeCodeSnippet(props: Props): JSX.Element {
  const embedCode = prepareIframeEmbedCode({
    src: props.src,
    height: props.height,
    width: props.width
  });
  return (
    <Tags.CodeCon>
      <CopyHandler onCopyHandler={props.copyHandler} copyUrl={props.copyUrl} />
      <CodeMirror
        lang="html"
        value={embedCode}
        readOnly
        editable={false}
        extensions={[html()]}
        theme={nord}
        style={{
          fontSize: '0.9rem',
          fontWeight: 500,
          fontFamily: '"IBM Plex Mono", monospace !important',
        }}
      />

    </Tags.CodeCon>
  );
}
