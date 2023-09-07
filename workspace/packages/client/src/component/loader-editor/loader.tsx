import React from 'react';
import { Player } from '@lottiefiles/react-lottie-player';
import { ITourLoaderData } from '@fable/common/dist/types';
import * as Tags from './styled';

interface Props {
  data: ITourLoaderData;
}

function Loader(props: Props): JSX.Element {
  const isLoaderPresent = Boolean(props.data.loader.url.trim()) && Boolean(props.data.loader.type.trim());

  const logoWithLoaderAnimationTime = 2000;
  const logoWithLoaderAnimationDelay = 100;
  const loaderHeight = 260;
  const logoHeightWhenWithLoader = 64;

  return (
    <>
      {
        !isLoaderPresent && (
          <Tags.CenteredLoaderLogoDiv>
            <img src={props.data.logo.url} alt="logo" />
            <Tags.LoadingTextAnim>{props.data.loadingText}</Tags.LoadingTextAnim>
          </Tags.CenteredLoaderLogoDiv>
        )
      }
      {
        isLoaderPresent && (
          <>
            <Tags.LogoWithLoaderCon>
              <Tags.PosRelCon>

                <Tags.LogoWithLoader
                  animationTime={logoWithLoaderAnimationTime}
                  animationDelay={logoWithLoaderAnimationDelay}
                  style={{ height: `${logoHeightWhenWithLoader}px` }}
                  loaderHeight={loaderHeight}
                >
                  <img src={props.data.logo.url} alt="logo" />
                </Tags.LogoWithLoader>
                <Tags.Loader
                  className="loader"
                  loaderHeight={loaderHeight}
                  marginTop={logoHeightWhenWithLoader + 10}
                  marginBottom={10}
                  animationDelay={logoWithLoaderAnimationTime + logoWithLoaderAnimationDelay + 100}
                >

                  {props.data.loader.type === 'gif' && <img
                    style={{ height: '100%' }}
                    src={props.data.loader.url}
                    alt="logo"
                    className="gif"
                  />}
                  {props.data.loader.type === 'lottie' && <Player
                    style={{ height: '100%' }}
                    src={props.data.loader.url}
                    autoplay
                    loop
                  />}
                </Tags.Loader>
                <Tags.LoadingTextWithLoader
                  loaderHeight={loaderHeight}
                  animationTime={logoWithLoaderAnimationTime}
                  animationDelay={logoWithLoaderAnimationDelay}
                >{props.data.loadingText}
                </Tags.LoadingTextWithLoader>
              </Tags.PosRelCon>
            </Tags.LogoWithLoaderCon>
          </>
        )
      }
    </>
  );
}

export default Loader;
