import styled from 'styled-components';
import { ModalPosition } from './types';

export const TILE_STROKE_COLOR_ON_HOVER = '#7566ff';
export const TILE_STROKE_COLOR_DEFAULT = '#E0E0E0';
export const TILE_STROKE_COLORON_SELECT = '#9f96fa';

export const SVGCanvas = styled.svg`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;

  .fade {
    opacity: 0.2;
  }

  image {
    cursor: pointer;
  }

  .imageHover:hover {
    outline: 2px solid lightgray;
  }

  line {
    cursor: pointer;
  }

  .canvasElArea {
    fill: transparent
  }

  .node {
    .droptg {
      fill: #15034517;
      stroke: none;

      &.sel {
        fill: #d0d0ff;
        stroke: #150345;
        stroke-width: 2;
      }
    }

    .tg-hide {
      display: none;
    }

    .tg-show {
      display: block;

      &.rev {
        display: none;
      }
    }

  }
`;

export const CanvasMenuCon = styled.div`
  position: absolute;
  background: #D0D0FF;
  left: 30px;
  position: absolute;
  top: 30px;
  border-radius: 8px;
  padding: 30px 0px 0px 0px;
  box-shadow: 0 0 4px -1px #7567ff;
`;

export const CanvasMenuItemCon = styled.div`
  display: flex;
  background: white;
  flex-direction: column;
  padding: 1rem;
  border-top-left-radius: 0px;
  border-top-right-radius: 0px;
  border-bottom-right-radius: 8px;
  border-bottom-left-radius: 8px;
`;

// ----------
export const EmptyCanvasContainer = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  -ms-transform: translate(-50%, -50%);
  transform: translate(-50%, -50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  max-width: 650px;

  img {
    width: 350px;
    height: auto;
    box-shadow: 0 2px 20px rgba(0, 0, 0, 0.06);
    display: inline-block;
  }

  p{
    margin: 0;
  }

  .primary-text {
    font-weight: 700;
    font-size: 16px;
    line-height: 21px;
    color: #16023E;
    margin-top: 3rem;
  }

  .secondary-text {
    font-size: 14px;
    line-height: 18px;
    color: #979797;
    margin-top: 1rem;
    margin-bottom: 2rem;
  }

`;

export const EmptyCanvasButtons = styled.div`

  display: flex;
  gap: 1rem;

  button {
    border-radius: 5px;
    border: 2px solid #7567FF;
    padding: 0.75rem 2rem;
    font-weight: 700;
    line-height: 18px;
  }

  .primary-btn {
    background: #7567FF;
    color: #FFFFFF;

    span {
      margin-left: 0.75rem;
    }
  }

  .secondary-btn {
    background: #FFFFFF;
    color: #7567FF;
  }

`;

export const ModeOptions = styled.div`
  background: white;
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  left: 0px;
  box-shadow: rgba(100, 100, 111, 0.2) 0px 7px 29px 0px;
  border-top-right-radius: 10px;
  border-bottom-right-radius: 10px;
  padding: 1rem 0;
  button {
    cursor: pointer;
    font-size: 1.5rem;
    padding: 0.25rem 1rem;
    display: block;
    background: transparent;
    border: none;
    margin: 0.5rem 0.25rem;
  }
  button:hover {
    color: #7e22ce;
  }

  .active {
    color: #7e22ce;
  }
`;

export const ModalContainer = styled.div`
    margin: 2.5rem 1rem 1.5rem 1rem;
`;

export const ModalBorderTop = styled.div`

    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height:5px;
    display: flex;

    div {
        width: 40%;
        border-radius: 12px;
        z-index: 2;
        height: 5px;

        &:nth-child(1) {
          background-color: #ff7450;
        }

        &:nth-child(2) {
          background-color: #fedf64;
        }

        &:nth-child(3) {
          background-color: #7567ff;
        }

        &:not(:first-child) {
        margin-left: -18px;
        }
    }
`;

export const InputLabel = styled.label`
    font-weight: 700;
    font-size: 1rem;
    line-height: 21px;
    color: #16023E;
    margin-bottom: 1rem;
    display: inline-block;
`;

export const InputContainer = styled.div`
    position: relative;
    
    input {
        background: #FFFFFF;
        border: 1px solid #7567FF;
        border-radius: 8px;
        font-weight: 600;
        font-size: 1rem;
        line-height: 1.25rem;
        padding-block: 0.75rem;
        padding-left: 1rem;
        width: 100%;
    }
`;

export const UploadImgCont = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
    text-align: center;
    gap: 1rem;
`;

export const PrimaryButton = styled.button`
    background: #7567FF;
    color: white;
    border-radius: 24px;
    font-size: 0.95rem;
    border: 1px solid #7567FF;
    display: block;
    width: 90%;
    margin: 1rem auto;
    padding: 0.75rem 0;
    cursor: pointer;

    &:disabled {
      opacity: 0.5;
    }
`;

export const ErrorMsg = styled.div`
  color: red;
  margin-top: 0.5rem;
  text-align: center;
`;

export const MenuModal = styled.div<{xy: ModalPosition}>`
  left: ${props => (props.xy[2] === 'l' ? props.xy[0] : 'auto')}px;
  right: ${props => (props.xy[2] === 'r' ? props.xy[0] : 'auto')}px;
  top: ${props => props.xy[1]}px;
  position: absolute;
  background: #FAFAFA;
  padding: 0.5rem 0.55rem;
  border-radius: 2px;
  box-shadow: 0 0 3px -1px black;
  font-size: 0.9rem;
  z-index: 2;

  div.menu-item {
    padding: 0.25rem 0.45rem;
    border-radius: 2px;

    .subtext {
      font-size: 0.75rem;
      color: gray;
    }

    &:hover {
      background: #EEEEEE;
      cursor: pointer;
    }
  }

  div.danger {
    color: red;
  }

`;

export const MenuModalMask = styled.div`
  position: relative;
  height: 100%;
  width: 100%;
  background: transparent;
`;

export const AnnEditorModalCon = styled.div`
  animation: fade-in 1.75s ease-out;
    
  @keyframes fade-in {
    0% {
      opacity: 0;
    }

    50% {
      opacity: 0;
    }

    75% {
      opacity: 1;
    }

    100% {
      opacity: 1;
    }
  }
`;

export const AnnEditorModalArrow = styled.svg<{top: number, left: number, applyTransition: boolean}>`
  position: absolute;
  top: ${props => `${props.top}px`};
  left: ${props => `${props.left}px`};
  transform: translateX(-50%);
  transition:${props => (props.applyTransition ? 'left 0.5s ease-in-out' : 'none')};
`;

export const AnnEditorModalWrapper = styled.div<{top: number}>`
  position: absolute;
  top: ${props => `${props.top}px`};
  left: 10px;
  right: 10px;
  bottom: 0px;
  width: calc(100% - 20px);
  background-color: white;
  transition: all 0.3s ease;
  border-radius: 20px;
`;

export const AnnEditorModal = styled.div`
  height: 100%;
  margin: auto;
  border-radius: 20px;
`;

export const CloseIcon = styled.img`
  position: absolute;
  height: 2rem;
  width: 2rem;
  top: 40px;
  right: 40px;
  cursor: pointer;
  background: #ffffffc4;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s ease-out;

  &:hover {
    background: #ffffff;
  }
`;
