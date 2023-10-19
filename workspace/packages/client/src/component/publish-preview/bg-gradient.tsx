import React from 'react';
import Bg1 from '../../assets/publish-preview/bg-1.png';
import Bg2 from '../../assets/publish-preview/bg-2.png';
import Bg3 from '../../assets/publish-preview/bg-3.png';
import Bg4 from '../../assets/publish-preview/bg-4.png';
import Bg5 from '../../assets/publish-preview/bg-5.png';
import Bg6 from '../../assets/publish-preview/bg-6.png';
import Bg7 from '../../assets/publish-preview/bg-7.png';
import Bg8 from '../../assets/publish-preview/bg-8.png';
import Bg9 from '../../assets/publish-preview/bg-9.png';
import Bg10 from '../../assets/publish-preview/bg-10.png';

import * as Tags from './styled';

const backgroundImports = [Bg1, Bg2, Bg3, Bg4, Bg5, Bg6, Bg7, Bg8, Bg9, Bg10];
const randomBgUrl = backgroundImports[Math.floor(Math.random() * backgroundImports.length)];

export default function BackgroundGradient(): JSX.Element {
  return (
    <Tags.BackgroundGradientImg src={randomBgUrl} alt="" />
  );
}
