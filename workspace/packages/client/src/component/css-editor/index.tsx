import { ArrowLeftOutlined, EyeOutlined, SaveOutlined } from '@ant-design/icons';
import React, { ReactElement, useEffect, useRef } from 'react';
import * as Tags from './styled';

interface IProps {
  content: string;
  infoText: ReactElement;
  onCancel: () => void;
  onPreview: (css: string) => void;
  onSubmit: (css: string) => void;
}

// if this works use https://codepen.io/WebCoder49/pen/dyNyraq

export default function CssEditor(props: IProps): JSX.Element {
  const elRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    setTimeout(() => {
      if (!elRef.current) return;
      const el = elRef.current;
      el.focus();
      el.selectionStart = el.value.length;
    }, 48);
  });

  return (
    <Tags.EditorCon>
      <Tags.InfoTextCon>
        {props.infoText}
      </Tags.InfoTextCon>
      <textarea
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        wrap="off"
        ref={elRef}
        defaultValue={props.content.trim()}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Tags.EditorBtn className="link" onClick={props.onCancel}><ArrowLeftOutlined /> Back </Tags.EditorBtn>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Tags.EditorBtn className="outline" onClick={() => props.onSubmit(elRef.current!.value)}><SaveOutlined /> Save </Tags.EditorBtn>
          <Tags.EditorBtn className="primary" onClick={() => props.onPreview(elRef.current!.value)}><EyeOutlined /> Preview </Tags.EditorBtn>
        </div>
      </div>
    </Tags.EditorCon>
  );
}
