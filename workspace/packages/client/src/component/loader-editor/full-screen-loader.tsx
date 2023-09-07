import React from 'react';
import { ITourLoaderData } from '@fable/common/dist/types';
import { createPortal } from 'react-dom';
import Loader from './loader';
import * as Tags from './styled';

interface Props {
  data: ITourLoaderData,
}

function FullScreenLoader(props: Props): JSX.Element {
  return createPortal(
    <Tags.FullScreenCon bg="white"><Loader data={props.data} /></Tags.FullScreenCon>,
    document.body
  );
}

export default FullScreenLoader;
