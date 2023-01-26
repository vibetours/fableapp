import styled from 'styled-components';
import { CanvasMode } from './types';

type SVGProps = {
  mode: CanvasMode;
};

export const SVGCanvas = styled.svg`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  cursor: ${(p: SVGProps) => (p.mode === CanvasMode.SelectMode ? 'default' : 'move')};

  image {
    cursor: pointer;
  }

  .imageHover:hover {
    outline: 2px solid lightgray;
  }

  line {
    cursor: ${(p: SVGProps) => (p.mode === CanvasMode.SelectMode ? 'pointer' : 'default')};
  }

  .canvasElArea {
    fill: transparent
  }
  
  .canvasElArea:hover {
    fill: ${(p: SVGProps) => (p.mode === CanvasMode.ConnectMode ? '#e5e7eb' : 'transparent')}
  }

`;

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

export const SelectScreenContainer = styled.div`

  position: absolute;
  top: 50%;
  left: 50%;
  -ms-transform: translate(-50%, -50%);
  transform: translate(-50%, -50%);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;


  button {
    border-radius: 5px;
    border: 2px solid #7567FF;
    padding: 0.75rem 2.25rem;
    font-weight: 700;
    line-height: 18px;
    background: #7567FF;
    color: #FFFFFF;
  }

`;

export const ScreensContainer = styled.div`

  background: #FFFFFF;
  border: 1px solid #DDDDDD;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.08);
  border-radius: 20px;
  max-width: 80vw;
  margin: auto;
  padding: 1rem 2rem;
  margin-top: 2rem;

  h2 {
    font-style: normal;
    font-weight: 700;
    font-size: 1.2rem;
    line-height: 20px;
    margin-bottom: 1rem;
  }
`;

export const ScreenSlider = styled.div`
  display: flex;
  gap: 1.5rem;
  position: relative;
  padding-bottom: 1rem;
  overflow-x: auto;
  scrollbar-color: #7567FF #E5E7EB;

  &::-webkit-scrollbar-track {
    padding: 2px 0;
    background-color: #e5e7eb;
    border-radius: 10px;
    border: 1px solid #F3F4F6;
  }

  &::-webkit-scrollbar {
    width: 10px;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 10px;
    background-color: #7567FF;
  }
`;

export const Screen = styled.div`
  background: #FFFFFF;
  border: 1px solid #DDDDDD;
  border-radius: 10px;
  padding: 1rem;
  min-width: 260px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  img {
    width: 100%;
    height: 70%;
    object-fit: cover;
  }

  p {
    font-weight: 700;
    line-height: 20px;
    color: #16023E;
    margin: 0;
    margin-top: 1rem;
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
