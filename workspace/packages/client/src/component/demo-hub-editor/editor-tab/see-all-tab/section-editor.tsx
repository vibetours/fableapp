import { DeleteOutlined, EditOutlined, HolderOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import React, { useState } from 'react';
import { DraggableProvided } from 'react-beautiful-dnd';
import { IDemoHubConfigSeeAllPageSection, IDemoHubConfigDemo, SimpleStyle } from '../../../../types';
import Input from '../../../input';
import { useEditorCtx } from '../../ctx';
import TextArea from '../../../text-area';
import * as GTags from '../../../../common-styled';
import SimpleStyleEditor from '../../simple-styles-editor';
import { getTourByRid, stringToSlug } from '../../utils';
import CaretOutlined from '../../../icons/caret-outlined';
import { buttonSecStyle } from '../../../screen-editor/annotation-creator-panel';
import { InputText } from '../../../screen-editor/styled';
import { showDeleteConfirm } from '../../delete-confirm';
import FableLogo from '../../../../assets/fable-rounded-icon.svg';

interface Props {
  section: IDemoHubConfigSeeAllPageSection;
  providedInner: DraggableProvided;
}

export default function SectionEditor(props: Props): JSX.Element {
  const { onConfigChange, tours } = useEditorCtx();
  const [showEditor, setShowEditor] = useState(false);

  const updateCtaSimpleStyle = <K extends keyof SimpleStyle>(key: K, value: SimpleStyle[K]): void => {
    updateSectionProp('simpleStyle', { ...props.section.simpleStyle, [key]: value });
  };

  const updateSectionProp = <K extends keyof IDemoHubConfigSeeAllPageSection>(
    key: K,
    value: IDemoHubConfigSeeAllPageSection[K]
  ): void => {
    onConfigChange(c => {
      const sectionToBeUpdatedIdx = c.see_all_page.sections.findIndex(section => section.id === props.section.id);
      c.see_all_page.sections.splice(sectionToBeUpdatedIdx, 1, { ...props.section, [key]: value });

      return {
        ...c,
        see_all_page: {
          ...c.see_all_page,
          sections: [...c.see_all_page.sections],
        },
      };
    });
  };

  // this functionality is extracted into a separate method of its own to
  // avoid making 2 rapid called to onConfigChange
  const updateSectionTitle = (title: string): void => {
    onConfigChange(c => {
      // TODO confirm slug fn with akash
      const slug = stringToSlug(title);
      const sectionToBeUpdatedIdx = c.see_all_page.sections.findIndex(section => section.id === props.section.id);
      c.see_all_page.sections.splice(sectionToBeUpdatedIdx, 1, { ...props.section, title, slug });

      return {
        ...c,
        see_all_page: {
          ...c.see_all_page,
          sections: [...c.see_all_page.sections],
        },
      };
    });
  };

  const deleteDemoFromSection = (rid: string): void => {
    const demoToBeDeletedIdx = props.section.demos.findIndex(demo => demo.rid === rid);
    props.section.demos.splice(demoToBeDeletedIdx, 1,);
    updateSectionProp('demos', [...props.section.demos]);
  };

  const deleteSection = (sectionId: string): void => {
    onConfigChange(c => {
      const sectionToBeDeletedIdx = c.see_all_page.sections.findIndex(section => section.id === sectionId);
      c.see_all_page.sections.splice(sectionToBeDeletedIdx, 1);

      return {
        ...c,
        see_all_page: {
          ...c.see_all_page,
          sections: [...c.see_all_page.sections],
        },
      };
    });
  };

  return (
    <div className={`grooveable ${showEditor ? 'opened' : 'closed'}`}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '0.5rem',
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
          key={props.section.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flex: 1,
          }}
        >
          <div>
            {props.section.title}
          </div>

          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
            }}
          >
            <Tooltip title="Delete button" overlayStyle={{ fontSize: '0.75rem' }}>
              <Button
                icon={<DeleteOutlined />}
                type="text"
                size="small"
                style={buttonSecStyle}
                onClick={() => {
                  showDeleteConfirm(
                    () => deleteSection(props.section.id),
                    'Are you sure you want to delete this section?',
                  );
                }}
              />
            </Tooltip>

            <Tooltip title="Edit button properties" overlayStyle={{ fontSize: '0.75rem' }}>
              <Button
                icon={<EditOutlined />}
                type="text"
                size="small"
                style={{
                  ...buttonSecStyle,
                  color: showEditor ? '#7567ff' : 'unset'
                }}
                onClick={() => setShowEditor(prevState => !prevState)}
              />
            </Tooltip>
          </div>
        </div>
      </div>

      {showEditor && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            margin: '8x 12px 0',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}
          >
            <div
              className="typ-sm"
              style={{
                display: 'flex',
                justifyContent: 'space-between'
              }}
            >
              <span>Title</span>
              <span
                className="typ-sm"
                style={{
                  marginLeft: '0.5rem',
                  fontSize: '0.7rem'
                }}
              >
                Slug is {' '}
                <span
                  style={{
                    backgroundColor: '#e4e4e4',
                    borderRadius: '4px',
                    padding: '0 4px',
                  }}
                >
                  {props.section.slug}
                </span>
              </span>
            </div>
            <InputText
              value={props.section.title}
              onChange={(e) => {
                updateSectionTitle(e.target.value);
              }}
              type="text"
              style={{ height: '44px', width: '100%' }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}
          >
            <div className="typ-sm">Description</div>
            <InputText
              value={props.section.desc}
              onChange={e => updateSectionProp('desc', e.target.value)}
              type="text"
              style={{ height: '44px', width: '100%' }}
            />
          </div>

          <SimpleStyleEditor
            simpleStyle={props.section.simpleStyle}
            simpleStyleUpdateFn={updateCtaSimpleStyle}
          />
          <div>
            <div className="typ-sm">Select demo to add in the section</div>
            <GTags.FableSelect
              showSearch
              suffixIcon={<CaretOutlined dir="down" />}
              bordered={false}
              size="large"
              options={Object.values(tours)
                .filter(tour => !props.section.demos.find(demo => demo.rid === tour.rid))
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

                updateSectionProp('demos', [...props.section.demos, newDemo]);
              }}
              className="typ-ip"
              value=""
            />
          </div>
          <div>
            <div style={{ fontWeight: '500' }}>
              Selected demos:
            </div>
            {props.section.demos.length ? (
              <div
                style={{
                  overflowY: 'auto',
                  maxHeight: '200px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                {props.section.demos.map(demo => (
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
                      <GTags.OurLink
                        href={`/preview/demo/${demo.rid}`}
                        target="_blank"
                        style={{
                          display: 'inline-block',
                          margin: 0
                        }}
                      >
                        {demo.name}
                      </GTags.OurLink>
                    </div>
                    <Tooltip title="Edit button properties" overlayStyle={{ fontSize: '0.75rem' }}>
                      <Button
                        icon={<DeleteOutlined />}
                        type="text"
                        size="small"
                        style={buttonSecStyle}
                        onClick={() => {
                          showDeleteConfirm(
                            () => deleteDemoFromSection(demo.rid),
                            'Are you sure you want to delete this demo from the section?',
                          );
                        }}
                      />
                    </Tooltip>
                  </div>
                ))}
              </div>
            ) : (
              <div className="typ-sm">
                There are no demos in this section. Use the above drop down to select demo for this section.
              </div>
            )}

          </div>

        </div>
      )}
    </div>
  );
}
