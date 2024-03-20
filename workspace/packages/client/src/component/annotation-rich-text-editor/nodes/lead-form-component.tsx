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
import { QuestionCircleOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import joinClasses from '../utils/join-classes';
import { $isLeadFormNode, createLeadFormOption } from './lead-form-node';
import type { Option, Options, LeadFormNode } from './lead-form-node';
import Button from '../../button';
import { parseFieldName } from '../../annotation/utils';

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

  const addOption = (): void => {
    let maxCount = 0;
    for (const option of options) {
      const match = option.text.match(/\d+/);
      if (match) maxCount = Math.max(maxCount, parseInt(match[0], 10));
    }

    withLeadFormNode((node) => {
      node.addOption(createLeadFormOption(`Field ${maxCount + 1} {[field${maxCount + 1}]}`));
    });
  };

  const isFocused = $isNodeSelection(selection) && isSelected;

  return (
    <div
      className={`LeadForm__container ${isFocused ? 'focused' : ''}`}
      ref={ref}
    >
      <div className="LeadForm__inner">
        {options.map((option, index) => {
          const key = option.uid;
          return (
            <LeadFormOptionComponent
              key={key}
              withLeadFormNode={withLeadFormNode}
              option={option}
              index={index}
              options={options}
            />
          );
        })}
        <div className="LeadForm__footer">
          <Button intent="secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }} onClick={addOption}>
            Add a new field
          </Button>

          <Tooltip title={<LeadFormInfoTooltip options={options} />}>
            <QuestionCircleOutlined />
          </Tooltip>
        </div>
      </div>
    </div>
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
