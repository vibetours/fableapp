import styled from 'styled-components';

export const EmbedFrame = styled.iframe<{heightOffset : number}>`
  height: 100%;
  width: 100%;
  border: none;
  box-shadow: none;
  border-radius: ${({ heightOffset }) => (heightOffset === 0 ? '8px' : '0 0 8px 8px')};
`;
