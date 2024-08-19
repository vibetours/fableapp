import { FrameSettings } from '@fable/common/dist/api-contract';
import styled from 'styled-components';
import { IframePos } from '../../types';
import { MAC_FRAME_HEIGHT } from '../../utils';

export const Frame = styled.div<{iframePos : IframePos, mode : FrameSettings, scaleFactor : number, zIndex: number}>`
  width: ${({ iframePos, scaleFactor }) => `${iframePos.width * (1 / scaleFactor)}px`};;
  height: ${MAC_FRAME_HEIGHT}px;
  position: absolute;
  top: ${({ iframePos, scaleFactor }) => `${iframePos.top - (MAC_FRAME_HEIGHT * scaleFactor)}px`};
  left: ${({ iframePos }) => `${iframePos.left}px`};
  background-color: ${({ mode }) => (mode === FrameSettings.LIGHT ? '#f8fafc' : '#171717')};
  border-radius: 0.5rem 0.5rem 0 0;
  box-sizing: border-box;
  padding: 0.5rem 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transform: scale(${({ scaleFactor }) => `${scaleFactor}`});
  transform-origin: 0 0%;
  z-index: ${({ zIndex }) => zIndex};
  .ctrl-btns {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    .ctrl-btn {
      border-radius: 100%;
      width: 10px;
      height: 10px;
    }
    }
  .central-options {
    margin: 0;
    padding: 0;
    display: flex;
    gap: 0.5rem;
    align-items: center;
    
    .central-btn {
      border: none;
      outline: none;
      background-color: transparent;
      cursor: pointer;
      color: ${({ mode }) => (mode === FrameSettings.LIGHT ? '#404040' : '#e5e5e5')};
    }
    .central-title {
      margin: 0;
      padding: 0.125rem 0.5rem;
      font-size: 0.875rem;
      background-color:${({ mode }) => (mode === FrameSettings.LIGHT ? '#e5e5e5' : '#404040')};
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      
      color: ${({ mode }) => (mode === FrameSettings.LIGHT ? '#404040' : '#e5e5e5')};
      p {
        margin: 0;
        width: 480px;
        text-align: center;
        text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
          max-width: 480px;
      }
    }
    .module-btn-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      z-index: ${Number.MAX_SAFE_INTEGER};

      .module-menu {
        position: absolute;
        top: 2rem;
        z-index: ${Number.MAX_SAFE_INTEGER};
        animation: module-menu 200ms;
      }
    }
  }

  @keyframes module-menu {
    0% {
      opacity: 0
    }

    100% {
      opacity: 1
    }
  }


  .right-btns {
    display: flex;
    gap: 0.5rem;
    button {
      background: transparent;
      border: none;
      outline: none;
      cursor: pointer;
      color: ${({ mode }) => (mode === FrameSettings.LIGHT ? '#404040' : '#e5e5e5')};
    }
  }

  @media (max-width: 960px) {
    .module-btn-container {
      .module-menu {
        top:2rem;
        margin-left: 8rem;
        transform: scale(0.8);
        transform-origin: top center
      }
    }

    .central-options {
      max-width : 50%;
      .central-title {
        width: 80%;
        p {
          text-align: center;
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
          max-width: 80%;
        }
      }
    }
  }
  @media (max-width: 640px) {
    .module-btn-container {
      .module-menu {
        transform: scale(0.6);
        transform-origin: top center
      }
    }
  }
`;
