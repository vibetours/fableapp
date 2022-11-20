import styled from "styled-components";

interface IAllProjects{
  showProjects: boolean;
}

export const Con = styled.div`
  height: 100%;
  background-color: #160245;
  color: #d0d0ff;
  border-radius: 0 24px 24px 0;
  padding: 1.8rem 0;
  display: flex;
  flex-direction: column;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 1.2rem;
`;

export const ConLogo = styled.div`
  width: 100%;
  padding-left: 2rem;
`;

export const ConLogoImg = styled.img`
  height: 2.5rem;
`;

export const ConNav = styled.div`
  flex: 1;
  margin-top: 2rem;

  & > *:not(:last-child) {
    margin-bottom: 0.2rem;
  }
`;

export const ConNavBtn = styled.div`
  padding: 0.6rem 2rem;
  border-radius: 0 18px 18px 0;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s ease-out;
  position: relative;

  &:hover {
    background-color: #7567ff;
    color: #fff;
  }

  p {
    margin: 0 0.8rem;
  }

  svg {
    font-size: 1.2rem;
  }
`;

export const ConNavAllProjects = styled.div<IAllProjects>`
  background-color: rgba(118, 103, 255, 0.1);
  border-radius: 18px;
  color: white;

  ul {
    list-style-type: none;
    height: ${(props) => (props.showProjects ? "auto" : "0")};
    padding: ${(props) => (props.showProjects ? "1.2rem 0": "0")};
    margin: 0;
    overflow: hidden;
    transition: all 0.3s ease-out;
  
    li{
      margin-left: 2.8rem;

      &:not(:last-child){
        margin-bottom: 1rem;
      }
    }
  }
`;

export const ConNavAllProjectsBtn = styled.div`
  position: relative;
  border-radius: 0 18px 18px 0;
  background-color: #7567ff;
  padding: 0.6rem 2rem;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s linear;
  position: relative;
  user-select: none;

  p {
    margin: 0 0.8rem;
  }
`;

export const Footer = styled.div`
  border-top: 0.2px solid rgba(255, 255, 255, 0.4);
  padding: 1.6rem 0 0 2rem;
  color: white;

  & > *:not(:last-child) {
    margin-bottom: 0.6rem;
  }
`;

export const FooterItem = styled.div`
  display: flex;
  align-items: center;
  cursor: pointer;

  p {
    margin: 0 0.8rem;
  }
`;

export const FooterItemProfileIcon = styled.img`
  width: 1.1rem;
  border-radius: 50%;
`;

export const RightArrow = styled.img<IAllProjects>`
  position: absolute;
  left: 0.8rem;
  top: 50%;
  transform: ${(props) => (props.showProjects ? 'translateY(-50%) rotate(90deg)' : 'translateY(-50%) rotate(0deg)')};
  transition: all 0.3s ease-out;
`;