import styled from 'styled-components';

export const CardCon = styled.div`
  border: 1px solid #EFEFEF;
  width: 13.4rem;
  border-radius: 4px;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

export const Thumbnail = styled.img`
  width: 100%;
  height: 7rem;
  border-radius: 4px;
  object-fit: cover;
`;

export const TitleCon = styled.div`
  display: flex;
  gap: 0.5rem;  
  width: 100%;
`;

export const CardTitle = styled.h3`
  font-weight: 500;
  font-size: 1rem;
  line-height: 20px;
  color: #16023E;
  margin: 0;
  flex: 1;
`;

export const LinkCon = styled.div`
  display: flex;
  gap: 0.5rem;
`;

export const Link = styled.a`
  font-weight: 400;
  font-size: 0.75rem;
  line-height: 16px;
  color: #16023E;
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const Avatar = styled.img`
  width: 1rem;
  height: 1rem;
`;

export const TimestampCon = styled.div`
  display: flex;
  width: 100%;
  justify-content: space-between;
`;

export const Timestamp = styled.div`
  font-weight: 400;
  font-size: 0.75rem;
  line-height: 16px;
  color: #16023E;
`;
