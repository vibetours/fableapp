import { Button as AntdButton, Popover, Tooltip } from 'antd';
import './lead-form-component.css';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { mergeRegister } from '@lexical/utils';
import {
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  BaseSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  NodeKey,
} from 'lexical';
import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { HolderOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { DragDropContext, Draggable, DropResult, Droppable } from 'react-beautiful-dnd';
import joinClasses from '../utils/join-classes';
import { $isLeadFormNode, createLeadFormOption } from './lead-form-node';
import type { Option, Options, LeadFormNode } from './lead-form-node';
import Button from '../../button';
import { parseFieldName } from '../../annotation/utils';

const LEAD_FORM_FIELDS = {
  'First name': 'Enter your First Name {[ first_name ]}',
  'Last name': 'Enter your Last Name {[ last_name ]}',
  Country: 'Enter your Country {[ country ]}',
  Industry: 'Enter your Industry {[ industry ]}',
  Company: 'Enter your Company {[ org ]}',
  Mobile: 'Enter your Mobile number {[ mobile ]}',
  'Website URL': 'Enter your Website URL {[ website_url ]}',
};

interface LeadFormOptionProps {
  index: number;
  option: Option;
  options: Options;
  withLeadFormNode: (
    cb: (leadFormNode: LeadFormNode) => void,
    onSelect?: () => void,
  ) => void;
}

function LeadFormOptionComponent({
  option,
  index,
  options,
  withLeadFormNode,
}: LeadFormOptionProps): JSX.Element {
  const text = option.text;

  return (
    <div className="LeadForm__optionContainer">
      <div className="LeadForm__optionInputWrapper">
        <input
          className="LeadForm__optionInput"
          type="text"
          value={text}
          onChange={(e) => {
            const target = e.target;
            const value = target.value;
            const selectionStart = target.selectionStart;
            const selectionEnd = target.selectionEnd;
            withLeadFormNode(
              (node) => {
                node.setOptionText(option, value);
              },
              () => {
                target.selectionStart = selectionStart;
                target.selectionEnd = selectionEnd;
              },
            );
          }}
          placeholder={`Field ${index + 1}`}
        />
      </div>

      <button
        type="button"
        disabled={option.isMandatory || options.length < 2}
        className={joinClasses(
          'LeadForm__optionDelete',
          (option.isMandatory || options.length < 2) && 'LeadForm__optionDeleteDisabled',
        )}
        aria-label="Remove"
        onClick={() => {
          withLeadFormNode((node) => {
            node.deleteOption(option);
          });
        }}
      />
    </div>
  );
}

export default function LeadFormComponent({
  options,
  nodeKey,
}: {
  nodeKey: NodeKey;
    options: Options;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
  const [selection, setSelection] = useState<BaseSelection | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const ref = useRef(null);

  const onDelete = useCallback(
    (payload: KeyboardEvent) => {
      if (isSelected && $isNodeSelection($getSelection())) {
        const event: KeyboardEvent = payload;
        event.preventDefault();
        const node = $getNodeByKey(nodeKey);
        if ($isLeadFormNode(node)) {
          node.remove();
          return true;
        }
      }
      return false;
    },
    [isSelected, nodeKey],
  );

  useEffect(() => mergeRegister(
    editor.registerUpdateListener(({ editorState }) => {
      setSelection(editorState.read(() => $getSelection()));
    }),
    editor.registerCommand<MouseEvent>(
      CLICK_COMMAND,
      (payload) => {
        const event = payload;

        if (event.target === ref.current) {
          if (!event.shiftKey) {
            clearSelection();
          }
          setSelected(!isSelected);
          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      KEY_DELETE_COMMAND,
      onDelete,
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      onDelete,
      COMMAND_PRIORITY_LOW,
    ),
  ), [clearSelection, editor, isSelected, nodeKey, onDelete, setSelected]);

  const withLeadFormNode = (
    cb: (node: LeadFormNode) => void,
    onUpdate?: () => void,
  ): void => {
    editor.update(
      () => {
        const node = $getNodeByKey(nodeKey);
        if ($isLeadFormNode(node)) {
          cb(node);
        }
      },
      { onUpdate },
    );
  };

  const getCustomOption = (): string => {
    let maxCount = 0;
    for (const option of options) {
      const match = option.text.match(/\d+/);
      if (match) maxCount = Math.max(maxCount, parseInt(match[0], 10));
    }

    return `Field ${maxCount + 1} {[field${maxCount + 1}]}`;
  };

  const addOption = (value: string): void => {
    withLeadFormNode((node) => {
      node.addOption(createLeadFormOption(value));
    });
  };

  const rearrangeOption = (r: DropResult): void => {
    if (!r.destination) return;

    withLeadFormNode((node) => {
      node.rearrangeOptions(r.source.index, r.destination!.index);
    });
  };

  const isFocused = $isNodeSelection(selection) && isSelected;

  const presentOptions = options.map(option => parseFieldName(option.text));

  const availableOptions = Object.entries(LEAD_FORM_FIELDS)
    .filter(([key, val]) => {
      const res = !presentOptions.includes(parseFieldName(val));
      return res;
    });

  return (
    <Popover
      content={(
        <div className="lead-form-options-popover">
          {availableOptions.map(([fieldName, fieldVal]) => (
            <div
              key={fieldName}
              onClick={() => {
                addOption(fieldVal);
                setPopoverOpen(false);
              }}
              className="option"
            >
              {fieldName}
            </div>
          ))}

          <div
            onClick={() => {
              addOption(getCustomOption());
              setPopoverOpen(false);
            }}
            className="option"
          >
            Custom field
          </div>
        </div>
    )}
      title={(
        <div>
          <div>
            Choose from the following fields
          </div>
          <div className="sub">All these fields are automatically synced with integrations automatically.</div>
          <div className="sub"> Custom fields are added to additional fields if integrations support it. </div>
        </div>
      )}
      trigger="click"
      open={popoverOpen}
      onOpenChange={(visible) => !visible && setPopoverOpen(visible)}
      arrow={false}
      placement="left"
    >
      <div
        className={`LeadForm__container ${isFocused ? 'focused' : ''}`}
        ref={ref}
      >
        <div className="LeadForm__inner">
          <DragDropContext onDragEnd={rearrangeOption}>
            <Droppable droppableId="droppable">
              {(provided, snapshot) => (
                <div
                  style={{ display: 'flex', alignItems: 'center', flexDirection: 'column' }}
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {options.map((option, index) => (
                    <Draggable key={option.uid} draggableId={option.uid + index} index={index}>
                      {(providedInner, snapshotInner) => (
                        <div
                          key={option.uid}
                          {...providedInner.draggableProps}
                          ref={providedInner.innerRef}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Tooltip
                              placement="left"
                              title={<span>Drag to reorder.</span>}
                              overlayStyle={{ fontSize: '0.75rem' }}
                            >
                              <AntdButton
                                type="text"
                                size="small"
                                icon={<HolderOutlined
                                  style={{ opacity: '0.65', fontSize: '14px' }}
                                />}
                                {...providedInner.dragHandleProps}
                              />
                            </Tooltip>
                            <LeadFormOptionComponent
                              key={option.uid}
                              withLeadFormNode={withLeadFormNode}
                              option={option}
                              index={index}
                              options={options}
                            />
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <div className="LeadForm__footer">
            <Button
              intent="secondary"
              style={{ padding: '0.4rem 1rem', fontSize: '0.9rem', marginLeft: '22px' }}
              onClick={() => setPopoverOpen(true)}
            >
              Add a new field
            </Button>
            <Tooltip title={<LeadFormInfoTooltip options={options} />}>
              <QuestionCircleOutlined />
            </Tooltip>
          </div>
        </div>
      </div>
    </Popover>
  );
}

interface LeadFormTooltipProps {
  options: Options;
}

function LeadFormInfoTooltip(props: LeadFormTooltipProps): JSX.Element {
  const sampleFormData = props.options.map(option => `"${parseFieldName(option.text)}": "..."`);

  return (
    <div className="lead-form-tooltip">
      <p>For the following placeholder</p>

      <p>
        <span className="select">
          Enter your First Name <code>{'{[firstName]}'}</code>
        </span>
      </p>

      <p>
        Once user enters their first name, the value is assigned to <code style={{ fontWeight: 'bold' }}>{'{[firstName]}'}</code> field
      </p>
      <p>
        Example: When user submits the form the data would look like
      </p>

      {'{'}
      <pre style={{ margin: 0 }}>
        {sampleFormData.map(kv => <div key={kv}>  {kv}</div>)}
      </pre>
      {'}'}
    </div>
  );
}
