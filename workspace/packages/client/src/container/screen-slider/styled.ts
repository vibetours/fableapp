import styled from 'styled-components';
import { ScreenSliderMode } from '../../component/timeline/types';

type SelectScreenContainerProp = {
    screenSliderMode: ScreenSliderMode;
  }

export const SelectScreenContainer = styled.div`
  
    position:fixed;
    top: 30px;
    left: ${(p:SelectScreenContainerProp) => (p.screenSliderMode === 'create' ? '50%' : '120px')};
    transform: ${(p:SelectScreenContainerProp) => (p.screenSliderMode === 'create' ? 'translateX(-50%)' : '')};
    width: ${(p:SelectScreenContainerProp) => (p.screenSliderMode === 'create' ? '90vw' : '')};
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
  `;

export const ScreensContainer = styled.div`
  
    background: #FFFFFF;
    border: 1px solid #DDDDDD;
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.08);
    border-radius: 20px;
    max-width: 80vw;
    margin: auto;
    padding: 1rem 1rem;
  
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
    gap: 1rem;
    padding: 0.25rem;
    position: relative;
    overflow-x: auto;
    scrollbar-color: #7567FF #E5E7EB;
  
    &::-webkit-scrollbar-track {
      padding: 2px 0;
      background-color: #e5e7eb;
      border-radius: 10px;
      border: 1px solid #F3F4F6;
    }
  
    &::-webkit-scrollbar {
      margin: 4px 0;
      height: 4px;
    }
  
    &::-webkit-scrollbar-thumb {
      border-radius: 4px;
      background-color: #7567FF;
    }
  `;

export const Screen = styled.div`
    background: #FFFFFF;
    border: 1px solid #DDDDDD;
    border-radius: 10px;
    padding: 1rem;
    width: 220px;
    min-width: 220px;
    max-width: 220px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  
    img {
      width: 100%;
      height: 70%;
      object-fit: cover;
    }
  
    &:hover {
      box-shadow: 0 0 0 1px black;
      cursor: pointer;
    }
  
  `;

export const ScreenTitleIconCon = styled.div`
    display: flex;
    justify-content: space-between;
    margin-top: 1rem;
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
