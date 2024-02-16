import React, { useEffect } from 'react';
import { Tooltip } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import CopyHandler from './copy-handler';
import * as Tags from './styled';

interface IProps {
  url: string;
  showOpenLinkButton?: boolean;
}

export default function (props: IProps): JSX.Element {
  const scrollLeft = (): void => {
    const targetNode = document.getElementsByClassName('url-content');
    const element = targetNode[0];
    if (!element) return;

    element.scrollLeft = element.scrollWidth;
  };

  useEffect(() => {
    scrollLeft();
  }, []);

  return (
    <Tags.URLCon>
      <div className="url-content" style={{ marginRight: props.showOpenLinkButton ? '60px' : '30px' }}>
        <code>
          <span>
            {props.url}
          </span>
        </code>
      </div>
      {props.showOpenLinkButton && (
      <Tooltip title="Open url">
        <div
          className="open-link-con"
          style={{ position: 'absolute', right: '40px' }}
        >
          <ArrowRightOutlined
            onClick={() => {
              window.open(props.url, '_blank');
            }}
            style={{ transform: 'rotate(-45deg)' }}
          />
        </div>
      </Tooltip>
      )}
      <CopyHandler copyUrl={props.url} />
    </Tags.URLCon>
  );
}
