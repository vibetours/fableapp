import styled from 'styled-components';

export const Con = styled.div`
  margin: 2rem;
`;

export const ApiKeyTxt = styled.div<{ copyMsg: string }>`
  border: 1px dashed;
  padding: 0.75rem 1.2rem;
  border-radius: 8px;
  margin-right: 1rem;
  cursor: pointer;
  position: relative;
  font-family: "IBM Plex Mono", monospace;

  &:after {
    position: absolute;
    right: 0;
    bottom: -1.5rem;
    font-size: 10px;
    font-weight: normal;
    font-family: 'IBM Plex Sans', sans-serif;
  }

  &:hover {
    border: 1px solid;

    &:after {
      content: '${props => props.copyMsg}';
    }
  }
`;

export const ApiKeyDetails = styled.div`
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;

  .avatar {
    height: 18px;
    border-radius: 9px;
    margin: 0 0.2rem;
  }
`;
