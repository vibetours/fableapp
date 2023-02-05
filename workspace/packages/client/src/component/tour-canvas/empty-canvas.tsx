import React from 'react';
import { PlusOutlined } from '@ant-design/icons';
import * as Tags from './styled';
import EmptyCanvasImage from '../../assets/emptycanvas.png';
// import { Mode } from './types';

type EmptyCanvasProps = {
    setMode: Function,
}

function EmptyCanvas({ setMode }: EmptyCanvasProps) {
  return (
    <Tags.EmptyCanvasContainer>
      <img src={EmptyCanvasImage} alt="empty canvas" />
      <p className="primary-text">Add a new screen, or select a screen to get started.</p>
      <p className="secondary-text">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc vulputate libero et velit interdum, ac aliquet
        odio mattis. Class aptent taciti sociosqu{' '}
      </p>
      <Tags.EmptyCanvasButtons>
        <button
          type="button"
          className="primary-btn"
          onClick={() => {
            // setMode(Mode.SelectScreenMode)
          }}
        >
          <PlusOutlined />
          <span>Add a screen in this flow</span>
        </button>
        <button type="button" className="secondary-btn">
          Add a Qualification criteria
        </button>
      </Tags.EmptyCanvasButtons>
    </Tags.EmptyCanvasContainer>
  );
}

export default EmptyCanvas;
