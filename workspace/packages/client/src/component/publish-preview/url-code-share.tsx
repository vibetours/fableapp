import React from 'react';
import { Tooltip, message } from 'antd';
import { CopyOutlined } from '@ant-design/icons';

interface IProps {
  url: string;
}

export default function (props: IProps): JSX.Element {
  const [messageApi, contextHolder] = message.useMessage();

  const success = (): void => {
    messageApi.open({
      type: 'success',
      content: 'Copied to clipboard',
    });
  };

  return (
    <div className="url-con">
      <div>
        <code>
          <span>
            {props.url}
          </span>
        </code>
      </div>

      <Tooltip title="Copy to clipboard">
        <CopyOutlined
          className="copy-outline"
          onClick={() => {
            success();
            navigator.clipboard.writeText(props.url);
          }}
        />
      </Tooltip>
    </div>
  );
}
