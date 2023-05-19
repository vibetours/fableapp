import styled from 'styled-components';

interface ScreenThumbnailProps {
  isLastScreen: boolean;
}

export const Con = styled.div`
  display: flex;
  gap: 0.8rem;
  position: relative;
  padding-top: ${(props: ScreenThumbnailProps) => (props.isLastScreen ? '1.1rem' : '0')};
  padding-bottom: ${(props: ScreenThumbnailProps) => (props.isLastScreen ? '0' : '1.1rem')};
`;

export const ScreenThumbnail = styled.img`
  border:  1px solid #7567FF;
  border-radius: 4px;
  cursor: pointer;
`;

export const TextCon = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const DisplayName = styled.h4`
  font-size: 1rem;
  line-height: 1.25rem;
  font-weight: 500;
  color: #16023E;
  margin: 0;
`;

export const DisplayableTime = styled.h5`
  font-weight: 400;
  font-size: 0.75rem;
  line-height: 1rem;
  color: #16023E;
  margin: 0;
`;

export const VerticalBar = styled.div`
  height: 1.1rem;  
  border-left: 1px solid #7567FF;
  position: absolute;
  left: 1rem;
  ${(props: ScreenThumbnailProps) => (props.isLastScreen ? 'top: 0;' : 'bottom: 0;')};
`;

export const FlexColCon = styled.div`
  display: flex;
  gap: 0.5rem;
`;

export const DisplayPicture = styled.img`
  border-radius: 50%;
`;
