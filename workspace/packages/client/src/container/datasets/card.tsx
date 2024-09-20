import {
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { Button, Popover, Tooltip } from 'antd';
import React from 'react';
import { P_Dataset } from '../../entity-processor';
import * as Tags from './styled';
import * as GTags from '../../common-styled';

interface Props {
  dataset: P_Dataset;
  navigateToDataset: (datasetName: string) => void;
  publish: (datasetName: string) => void;
  delete: (datasetName: string) => void;
}

export default function DatasetCard(props: Props): JSX.Element {
  return (
    <>
      <Tags.CardCon
        to={`/dataset/${props.dataset.name}`}
      >
        <Tags.Thumbnail />
        <Tags.CardDataCon>
          <Tags.DisplayName>
            {props.dataset.name}
          </Tags.DisplayName>

          <Tags.MetaDataCon>
            {props.dataset.displayablePublishedAt && <>Published {props.dataset.displayablePublishedAt}</>}
            {!props.dataset.displayablePublishedAt && <>Not published yet</>}
          </Tags.MetaDataCon>

        </Tags.CardDataCon>

        <Tags.ActionBtnCon>
          <Tooltip title="Edit dataset" overlayStyle={{ fontSize: '0.75rem' }}>
            <Tags.CardCTA
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                props.navigateToDataset(props.dataset.name);
              }}
            >
              <EditOutlined />&nbsp;&nbsp;
              <span style={{
                fontSize: '11px',
                fontWeight: 500
              }}
              >
                Edit
              </span>
            </Tags.CardCTA>
          </Tooltip>
          <Popover
            content={
              <div onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              >
                <GTags.PopoverMenuItem
                  onMouseDown={e => {
                    props.publish(props.dataset.name);
                  }}
                >
                  <UploadOutlined />&nbsp;&nbsp;&nbsp;Publish Dataset
                </GTags.PopoverMenuItem>
                <GTags.PopoverMenuItemDivider color="#ff735050" />
                <GTags.PopoverMenuItem
                  onMouseDown={e => {
                    props.delete(props.dataset.name);
                  }}
                  style={{
                    color: '#ff7350'
                  }}
                >
                  <DeleteOutlined />&nbsp;&nbsp;&nbsp;Delete Dataset
                </GTags.PopoverMenuItem>
              </div>
            }
            trigger="focus"
            placement="right"
          >
            <Button
              id="TG-3"
              style={{ padding: 0, margin: 0 }}
              size="small"
              shape="circle"
              type="text"
              icon={<MoreOutlined />}
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />
          </Popover>
        </Tags.ActionBtnCon>

      </Tags.CardCon>
    </>
  );
}
