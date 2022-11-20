import React, { useState } from 'react';
import * as Tags from './styled';
import FableLogo from './fableLogo.svg';
import './index.css';
import { FaPen, FaRegStickyNote } from 'react-icons/fa';
import { FiSettings, FiChevronRight } from 'react-icons/fi';

export default function SidePanel(): JSX.Element {
	const [showAllProjects, setShowAllProjects] = useState<boolean>(false);

	return (
		<div className={'container'}>
			<div className={'logo'}>
				<img src={FableLogo} alt={'Fable logo'} />
			</div>
			<div className="nav">
				<div className="navItems">
					<FaPen />
					<p>Edit page</p>
				</div>
				<div
					style={{
						color: 'white',
					}}
					className={`all-projects-accordion ${showAllProjects && 'active'}`}
				>
					<div
						onClick={() => {
							setShowAllProjects(!showAllProjects);
						}}
					>
						<FiChevronRight className="arrow-icon" />
						<FaRegStickyNote />
						<p>All Projects</p>
					</div>
					<ul>
						<li>Active projects</li>
						<li>Archived projects</li>
					</ul>
				</div>
				<div className="navItems">
					<FaPen />
					<p>Integrations</p>
				</div>
				<div className="navItems">
					<FaPen />
					<p>Analytics</p>
				</div>
				<div className="navItems">
					<FaPen />
					<p>User management</p>
				</div>
			</div>
			<div className="footer">
				<div className="footerItem">
					<img
						alt="user profile pic"
						src="	https://joeschmoe.io/api/v1/random"
					/>
					<p>User name</p>
				</div>
				<div className="footerItem">
					<FiSettings />
					<p>Settings</p>
				</div>
			</div>
		</div>
	);
}
