import styled from 'styled-components';

export const ModalContainer = styled.div`
    
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
    margin-top: 1rem;
    margin-bottom: 0.5rem;
    display: inline-block;
`;

export const InputContainer = styled.input`
  display: block;
  background: #FFFFFF;
  padding: 0.75rem;
  border: 1px solid #7567FF;
  font-weight: 600;
  border-radius: 8px;
  font-size: 1rem;
  line-height: 1.25rem;
  width: calc(100% - 1.5rem - 1px);
`;

export const StyledSelect = styled.select`
  display: block;
  padding: 0.75rem;
  line-height: 1.25rem;
  font-size: 1rem;
  font-weight: 0;
  border-radius: 8px;
  border: 1px solid #7567FF;
  width: 100;
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
