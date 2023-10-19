import styled from 'styled-components';

export const Con = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0;
  overflow-y: hidden;
`;

export const PreviewFrameWrapper = styled.div<{ showOverlay: boolean }>`
  flex-grow: 1;
  width: 90%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 1rem;
  position: relative;

  .replay-overlay {
    position: absolute;    
    background-color: ${({ showOverlay }) => (showOverlay ? 'rgba(0, 0, 0, 0.8)' : '')};
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    justify-content: center;
    align-items: center;
  }

  .preview-frame {
    border: none;
    border-radius: 1rem;  
  }
`;

export const InfoCon = styled.div`
  border-radius: 16px;
  box-shadow: 0 0 2px 0px gray;
  width: 375px;
  padding: 2rem 1.2rem;
  transform: translate(-50%, -50%);
  top: 50%;
  left: 50%;
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;

  .title {
    text-align: center;
    font-weight: 600;
    font-size: 1.5rem;
    line-height: 1.25rem;
    color: #16023E;
  }

  .description-con {
    background: rgba(236, 235, 244, 0.49);
    border-radius: 8px;
    padding: 1rem;
    color: #16023E;
    line-height: 1.5rem;
    font-size: 1rem;
    text-align: left;
    margin: 1rem 0;
  }

  .link-to-canvas {
    text-decoration: none;
    width: 100%;
  }
`;

export const HeaderCon = styled.div`
  align-self: stretch;
  position: static;
  background-color: #160245;
  color: #FFF;
  font-family: IBM Plex Sans;
  font-size: 14px;
  font-style: normal;
  font-weight: 700;
  line-height: normal;
`;
