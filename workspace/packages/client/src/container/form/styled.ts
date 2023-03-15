import styled from 'styled-components';
import formBgFrame from '../../assets/form/bg-frame.svg';

export const FormContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-image: url(${formBgFrame});
  background-repeat: no-repeat;
  background-size: cover;
`;
