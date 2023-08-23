import React, { RefObject, useState } from 'react';
import * as Tags from './styled';

export interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  innerRef?: RefObject<HTMLInputElement>;
}

export default function FileInput({ innerRef, style, ...rest }: Props): JSX.Element {
  const [selectedFileName, setSelectedFileName] = useState<string>('No file chosen');

  return (
    <Tags.InputContainer htmlFor={rest.id} style={style}>
      Click to upload: {selectedFileName}

      <input
        ref={innerRef}
        style={{ opacity: 0 }}
        type="file"
        {...rest}
        onChange={(e) => {
          if (e.target.files && e.target.files.length) {
            setSelectedFileName(e.target.files[0].name);
          } else {
            setSelectedFileName('No file chosen');
          }

          if (rest.onChange) rest.onChange(e);
        }}
      />
    </Tags.InputContainer>
  );
}
