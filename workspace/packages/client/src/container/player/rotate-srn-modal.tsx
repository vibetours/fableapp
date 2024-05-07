import React from 'react';
import { RotateLeftOutlined } from '@ant-design/icons';
import * as Tags from './styled';

interface Props {
  closeModal: () => void
}

function RotateScreenModal(props: Props): JSX.Element {
  return (
    <Tags.FullScreenModal>
      <Tags.CenteredSection>
        <RotateLeftOutlined style={{ fontSize: '2rem' }} />
        <h2>Rotate your screen</h2>
        <p>Please rotate your screen for a better demo experience</p>
        <Tags.SecondaryBtn onClick={props.closeModal}>Skip rotating</Tags.SecondaryBtn>
      </Tags.CenteredSection>
    </Tags.FullScreenModal>
  );
}

export default RotateScreenModal;
