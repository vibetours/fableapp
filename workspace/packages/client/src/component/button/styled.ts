import styled from 'styled-components';

interface ButtonConProps {
  intent: 'primary' | 'secondary';
  size: 'large' | 'medium';
}

export const ButtonCon = styled.button<ButtonConProps>`
  background-color: ${({ intent }) => (intent === 'primary' ? '#7567FF' : '#fff')};
  padding: ${({ size }) => (size === 'medium' ? '0.75rem 2.5rem' : '1.25rem 2.5rem')};
  border: ${({ intent }) => (intent === 'primary' ? 'none' : '1px solid #16023E')};
  color: ${({ intent }) => (intent === 'primary' ? '#fff' : '#16023E')};
  display: flex;
  align-items: center;
  gap: 1.25rem;
  border-radius: ${({ size }) => (size === 'medium' ? '24px' : '60px')};
  font: inherit;
  font-weight: 500;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease-out;
  
  &:hover {
    transform: translate(2px, -2px);
  }

  &:disabled {
    opacity: 0.5;
  }
`;
