import React, { useEffect, useState } from 'react';
import { DraggableProvided } from 'react-beautiful-dnd';
import { Button, Tooltip } from 'antd';
import { DeleteOutlined, EditOutlined, HolderOutlined } from '@ant-design/icons';
import { IDemoHubConfigDemo, SelectEntryOption } from '../../../../types';
import Input from '../../../input';
import TextArea from '../../../text-area';
import * as GTags from '../../../../common-styled';
import { useEditorCtx } from '../../ctx';
import { getTourByRid } from '../../utils';
import CaretOutlined from '../../../icons/caret-outlined';
import * as Tags from '../../styled';
import { InputText } from '../../../screen-editor/styled';
import { showDeleteConfirm } from '../../delete-confirm';
import FableLogo from '../../../../assets/fable-rounded-icon.svg';

interface Props {
  option: SelectEntryOption;
  providedInner: DraggableProvided;
  updateOptionTitle: (title: string) => void;
  updateOptionDesc: (desc: string) => void;
  addDemoInEntryOption: (demo: IDemoHubConfigDemo) => void;
  deleteDemoInEntryOption: (demoRid: string) => void;
  deleteEntryOption: () => void;
}

export default function OptionEditor(props: Props): JSX.Element {
  const [showEditor, setShowEditor] = useState(false);
  const { tours } = useEditorCtx();

  return (
    <div className={`grooveable ${showEditor ? 'opened' : 'closed'}`}>
      <div
        key={props.option.id}
        {...props.providedInner.draggableProps}
        ref={props.providedInner.innerRef}
        style={{ margin: '0.5rem 0' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Tooltip
            placement="left"
            title={<span>Drag to reorder.</span>}
            overlayStyle={{ fontSize: '0.75rem' }}
          >
            <Button
              type="text"
              size="small"
              icon={<HolderOutlined
                style={{
                  opacity: '0.65',
                  fontSize: '14px',
                }}
              />}
              {...props.providedInner.dragHandleProps}
            />
          </Tooltip>
          <div
            key={props.option.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flex: 1,
            }}
          >
            <div style={{
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              maxWidth: '160px'
            }}
            >
              {props.option.title}
            </div>
            <div>
              <Button
                style={{
                  border: 'none',
                  boxShadow: 'unset'
                }}
                shape="circle"
                icon={<DeleteOutlined />}
                onClick={() => {
                  showDeleteConfirm(
                    () => {
                      props.deleteEntryOption();
                    },
                    'Are you sure you want to delete this option?',
                  );
                }}
              />
              <Button
                style={{
                  border: 'none',
                  boxShadow: 'unset',
                  color: showEditor ? '#7567ff' : 'unset'
                }}
                shape="circle"
                icon={<EditOutlined />}
                onClick={() => setShowEditor(prevState => !prevState)}
              />
            </div>
          </div>
        </div>
      </div>

      {showEditor && (
        <>
          <div
            style={{
              padding: '0.5rem 0.5rem 0'
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >

              <Tags.InputTextCon>
                <div className="typ-sm">Title</div>
                <InputText
                  type="text"
                  value={props.option.title}
                  onChange={(e) => props.updateOptionTitle(e.target.value)}
                  style={{ height: '44px', width: '100%' }}
                />
              </Tags.InputTextCon>

              <Tags.InputTextCon>
                <div className="typ-sm">Description</div>
                <TextArea
                  label=""
                  value={props.option.desc}
                  onChange={(e) => props.updateOptionDesc(e.target.value)}
                />
              </Tags.InputTextCon>
            </div>
            <div>
              <p
                className="typ-sm"
                style={{
                  margin: '0.25rem 0'
                }}
              >Select demos to show when your buyers choose this option
              </p>
              <GTags.FableSelect
                showSearch
                suffixIcon={<CaretOutlined dir="down" />}
                bordered={false}
                size="large"
                options={Object.values(tours)
                  .filter(tour => !props.option.demos.find(demo => demo.rid === tour.rid))
                  .map(tour => ({
                    value: tour.rid,
                    label: tour.displayName,
                  }))}
                onSelect={(val) => {
                  const tour = getTourByRid(tours, val as string)!;

                  const newDemo: IDemoHubConfigDemo = {
                    name: tour.displayName,
                    thumbnail: tour.thumbnailUri.href,
                    rid: tour.rid,
                    desc: tour.description,
                  };

                  props.addDemoInEntryOption(newDemo);
                }}
                className="typ-ip"
                value=""
              />
            </div>
            <div
              style={{ margin: '0.75rem 0', }}
            >
              <div
                className="typ-reg"
                style={{
                  fontWeight: 500
                }}
              >
                Selected demos:
              </div>
              {props.option.demos.length ? (
                <div
                  style={{
                    overflowY: 'auto',
                    maxHeight: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {props.option.demos.map(demo => (
                    <div
                      key={demo.rid}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        alignItems: 'center'
                      }}
                      >
                        <img src={FableLogo} height={16} alt="Fable logo" />
                        <div>
                          {demo.name}
                        </div>
                      </div>
                      <Button
                        style={{
                          border: 'none',
                          boxShadow: 'unset'
                        }}
                        shape="circle"
                        icon={<DeleteOutlined />}
                        onClick={() => {
                          showDeleteConfirm(
                            () => props.deleteDemoInEntryOption(demo.rid),
                            'Are you sure you want to delete this demo from the option?',
                          );
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="typ-sm">
                  There are no demos for this option. Please use the above dropdown to select which demos to show when your buyer select this option.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
