import styled from 'styled-components';

export const FullScreenModal = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: white;
  z-index: 10000;
`;

export const CenteredSection = styled.div`
  min-width: 320px;
  position: absolute;
  top:50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 1rem;

  h2 {
    font-size: 2rem;
  }

  h2, p {
    margin: 0;
    padding: 0;
  }
`;

export const SecondaryBtn = styled.div`
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.1);
  padding: 0.5rem 2rem;
`;
