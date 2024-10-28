import styled from 'styled-components';

export const VoiceControlCon = styled.div`
  position: absolute;
  padding: 0.5rem 1rem;
  display: flex;
  gap: 0.5rem;
  border-radius: 14px;
  background: #7568ff;
  border: 1px solid #fafafa;
  transition: filter 0.5s cubic-bezier(0.42, 0, 0.07, 1.03);
  filter: saturate(0.1) opacity(0.5);

  &:hover {
    filter: saturate(1) opacity(1);
  }

  .voice-control-icon{
    font-size: 1.5rem;
    color: #fafafa;
    cursor: pointer;
  }
`;
