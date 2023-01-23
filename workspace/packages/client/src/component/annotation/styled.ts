import styled from 'styled-components';

export const BubbleCon = styled.div`
  position: absolute;
  background: #FF7450;
  color: #fff;
  height: 10px;
  width: 10px;
  border-radius: 20px;
  padding: 0.5rem;
  justify-items: center;
  align-items: center;
  z-index: ${Number.MAX_SAFE_INTEGER - 2};
`;
