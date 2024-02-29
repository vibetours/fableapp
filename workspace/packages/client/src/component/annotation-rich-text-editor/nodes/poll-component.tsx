import './poll-node.css';
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
import joinClasses from '../utils/join-classes';
import { $isPollNode, createPollOption } from './poll-node';
import type { Option, Options, PollNode } from './poll-node';
import Button from '../../button';

interface PollOptionProps {
  index: number;
  option: Option;
  options: Options;
  withPollNode: (
    cb: (pollNode: PollNode) => void,
    onSelect?: () => void,
  ) => void;
}

function PollOptionComponent({
  option,
  index,
  options,
  withPollNode,
}: PollOptionProps): JSX.Element {
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
            withPollNode(
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
          withPollNode((node) => {
            node.deleteOption(option);
          });
        }}
      />
    </div>
  );
}

export default function PollComponent({
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
        if ($isPollNode(node)) {
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

  const withPollNode = (
    cb: (node: PollNode) => void,
    onUpdate?: () => void,
  ): void => {
    editor.update(
      () => {
        const node = $getNodeByKey(nodeKey);
        if ($isPollNode(node)) {
          cb(node);
        }
      },
      { onUpdate },
    );
  };

  const addOption = (): void => {
    withPollNode((node) => {
      node.addOption(createPollOption('Field {[field]}'));
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
            <PollOptionComponent
              key={key}
              withPollNode={withPollNode}
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
        </div>
      </div>
    </div>
  );
}
