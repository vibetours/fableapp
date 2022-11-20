import React, { useState } from 'react';
import * as Tags from './styled';
import FableLogo from '../../assets/side_panel/fableLogo.svg';
import iconPen from '../../assets/side_panel/IconPen.svg';
import iconNavItems from '../../assets/side_panel/IconIntegration.svg';
import iconArrowRight from '../../assets/side_panel/IconArrowRight.svg';
import iconSettings from '../../assets/side_panel/IconSettings.svg';
import iconAllProjects from '../../assets/side_panel/IconAllProjects.svg';

export default function SidePanel(): JSX.Element {
	const [showAllProjects, setShowAllProjects] = useState<boolean>(false);

	return (
		<Tags.Con>
			<Tags.ConLogo>
				<Tags.ConLogoImg src={FableLogo} alt={'Fable logo'} />
			</Tags.ConLogo>
			<Tags.ConNav>
				<Tags.ConNavBtn>
          <img src={iconPen} alt={'Illustrations'}/>
					<p>Edit page</p>
				</Tags.ConNavBtn>
				<Tags.ConNavAllProjects
					className={`all-projects-accordion ${showAllProjects && 'active'}`}
          showProjects={showAllProjects}
        >
					<Tags.ConNavAllProjectsBtn
						onClick={() => {
							setShowAllProjects(!showAllProjects);
						}}
					>
            <Tags.RightArrow showProjects={showAllProjects} src={iconArrowRight} alt={'illustration right arrow'} />
            <img src={iconAllProjects} alt={'illustration'} />
						<p>All Projects</p>
					</Tags.ConNavAllProjectsBtn>
					<ul>
						<li>Active projects</li>
						<li>Archived projects</li>
					</ul>
				</Tags.ConNavAllProjects>
				<Tags.ConNavBtn>
        <img src={iconNavItems} alt={'Illustrations'}/>
					<p>Integrations</p>
				</Tags.ConNavBtn>
				<Tags.ConNavBtn>
        <img src={iconNavItems} alt={'Illustrations'}/>
					<p>Analytics</p>
				</Tags.ConNavBtn>
				<Tags.ConNavBtn>
        <img src={iconNavItems} alt={'Illustrations'}/>
					<p>User management</p>
				</Tags.ConNavBtn>
			</Tags.ConNav>
			<Tags.Footer>
				<Tags.FooterItem className="footerItem">
					<Tags.FooterItemProfileIcon
						alt="user profile pic"
						src="	https://joeschmoe.io/api/v1/random"
					/>
					<p>User name</p>
				</Tags.FooterItem>
				<Tags.FooterItem className="footerItem">
					<Tags.FooterItemProfileIcon src={iconSettings} alt={'illustration setting'} />
					<p>Settings</p>
				</Tags.FooterItem>
			</Tags.Footer>
		</Tags.Con>
	);
}
