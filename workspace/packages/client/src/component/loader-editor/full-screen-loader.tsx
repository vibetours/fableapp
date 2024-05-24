import React, { useEffect, useState } from 'react';
import { ITourLoaderData } from '@fable/common/dist/types';
import { createPortal } from 'react-dom';
import { TourSettings } from '@fable/common/dist/api-contract';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import Loader from './loader';
import * as Tags from './styled';

interface Props {
  data: ITourLoaderData,
  vpd?: TourSettings;
  isResponsive: boolean;
}

function FullScreenLoader(props: Props): JSX.Element {
  const [width, setWidth] = useState<null | number>(null);
  const [height, setHeight] = useState<null | number>(null);

  useEffect(() => {
    if (!props.isResponsive && props.vpd) {
      try {
        const loaderCon = document.getElementById('fable-loadercon');
        const parent = loaderCon!.parentElement;
        const origFrameViewPort = parent!.getBoundingClientRect();

        const scaleX = origFrameViewPort.width / props.vpd.vpdWidth;
        const scaleY = origFrameViewPort.height / props.vpd.vpdHeight;
        const scale = Math.min(scaleX, scaleY);

        setWidth(scale * props.vpd.vpdWidth);
        setHeight(scale * props.vpd.vpdHeight);
      } catch (err) {
        raiseDeferredError(err as Error);
      }
    }
  }, [props.vpd, props.isResponsive]);

  return createPortal(
    <Tags.FullScreenCon bg="white" width={width} height={height} id="fable-loader-con">
      <Loader data={props.data} />
    </Tags.FullScreenCon>,
    document.body
  );
}

export default FullScreenLoader;
