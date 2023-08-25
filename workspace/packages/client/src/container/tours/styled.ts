import styled from 'styled-components';

export const TopPanel = styled.div`
  margin: 1rem;
`;

export const BottomPanel = styled.div`
  flex-grow: 1;
  margin: 1rem;
  scrollbar-width: thin;
  scrollbar-color: #F8F8F8 #F1F1F1;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: #F2F2F2;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background-color: #F1F1F1;
  }
`;

export const ToursHeading = styled.h1`
  color: #16023E;
  font-size: ${(props) => props.theme.typography.size.heading};
  font-weight: bold;
`;

export const Text = styled.h4`
  color: #16023E;
  margin-top: 0px;
  font-style: italic;
`;
