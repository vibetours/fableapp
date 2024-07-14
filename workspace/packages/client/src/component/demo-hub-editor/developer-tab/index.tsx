import React, { useState } from 'react';
import TextEditor from './text-editor';
import * as Tags from './styled';
import { useEditorCtx } from '../ctx';
import { defaultCustomStyle } from './constants';

function DeveloperTab() : JSX.Element {
  const { onConfigChange, config } = useEditorCtx();
  const [customStyle, setCustomStyle] = useState(config.customStyles || defaultCustomStyle);

  const handleStyleChange = (value : string) : void => {
    setCustomStyle(value);
    onConfigChange(c => ({
      ...c,
      customStyles: value
    }));
  };
  const handleScriptChange = (value : string) : void => {
    onConfigChange(c => ({
      ...c,
      customScripts: value
    }));
  };

  return (
    <Tags.DeveloperEditor>
      <Tags.EditorContainer>
        <div className="typ-h2">Custom Scripts</div>
        <TextEditor
          value={config.customScripts}
          changeHandler={handleScriptChange}
        />
      </Tags.EditorContainer>
      <Tags.EditorContainer>
        <div className="typ-h2">Custom Styles</div>
        <TextEditor
          value={customStyle}
          changeHandler={handleStyleChange}
        />
      </Tags.EditorContainer>
    </Tags.DeveloperEditor>
  );
}

export default DeveloperTab;
