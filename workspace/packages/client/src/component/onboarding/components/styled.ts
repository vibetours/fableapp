import styled from 'styled-components';

export const InputContainer = styled.div`
  position: relative;

  input {
    height: 48px;
    width: 27rem;
    border: 1px solid #D9D9D9;
    border-radius: 8px;
    box-sizing: border-box;
    padding: 16px;
    font: inherit;
    line-height: 20px;
    color: #16023E;
  }
  
  .label {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 16px;
    display: flex;
    align-items: center;
    pointer-events: none;
  }
  
  input,
  .label .text {
    font-size: 16px;
  }
  
  input:focus {
    outline: none;
    border: 2px solid #D9D9D9;
  }
  
  input:focus+.label .text {
    font-size: 12px;
    transform: translate(0, -50%);
    background-color: white;
    padding-left: 4px;
    padding-right: 4px;    
    color: #16023E;
  }
  
  .label .text {
    transition: all 0.15s ease-out;
  }
  
  input:focus+.label .text,
  input:not(input[value=""])+.label .text {
    font-size: 12px;
    transform: translate(0, -150%);
    background-color: white;
    padding-left: 4px;
    padding-right: 4px;
  }
  
  input:focus+.label .text {
    color: #16023E;
  }
`;
