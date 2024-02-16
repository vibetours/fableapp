import React, { useState } from 'react';
import { Tooltip } from 'antd';
import { CheckOutlined, CopyOutlined } from '@ant-design/icons';
import * as Tags from './styled';

interface IProps {
  copyUrl: string;
  onCopyHandler?: ()=>void;
}

export default function (props: IProps): JSX.Element {
  const [copyButtonClicked, setCopyButtonClicked] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <Tags.CopyHandelerCon>
      <Tooltip
        title={copyButtonClicked ? 'Copied' : 'Copy to clipboard'}
        placement={copyButtonClicked ? 'left' : 'top'}
        open={copyButtonClicked || showTooltip}
      >
        {copyButtonClicked
          ? <CheckOutlined
              className="check-outline"
              onMouseLeave={() => {
                setShowTooltip(false);
              }}
          />
          : <CopyOutlined
              className="copy-outline"
              onClick={() => {
                setCopyButtonClicked(true);
                setTimeout(() => {
                  setCopyButtonClicked(false);
                }, 1500);
                navigator.clipboard.writeText(props.copyUrl);
                props.onCopyHandler && props.onCopyHandler();
              }}
              onMouseEnter={() => {
                setShowTooltip(true);
              }}
              onMouseLeave={() => {
                setShowTooltip(false);
              }}
          />}
      </Tooltip>
    </Tags.CopyHandelerCon>
  );
}
