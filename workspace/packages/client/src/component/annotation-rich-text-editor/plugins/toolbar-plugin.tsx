import React, { ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  SELECTION_CHANGE_COMMAND,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  $getSelection,
  $isRangeSelection,
  LexicalEditor,
  RangeSelection,
  NodeSelection,
  GridSelection,
  ElementNode,
  TextNode,
  $isElementNode,
  ElementFormatType,
  LexicalCommand,
  createCommand,
} from 'lexical';
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import {
  $isAtNodeEnd,
  $patchStyleText,
  $getSelectionStyleValueForProperty,
} from '@lexical/selection';
import { mergeRegister } from '@lexical/utils';
import { createPortal } from 'react-dom';
import {
  BoldOutlined,
  ItalicOutlined,
  LinkOutlined,
  PictureOutlined,
  AlignCenterOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  EditOutlined,
  FontSizeOutlined,
  DownOutlined,
  FormOutlined
} from '@ant-design/icons';
import { Dropdown, Select } from 'antd';
import { AnnotationFontSize } from '@fable/common/dist/types';
import { BorderedModal } from '../../../common-styled';
import Input from '../../input';
import Button from '../../button';

const LowPriority = 1;

function positionEditorElement(editor: HTMLDivElement, rect: DOMRect | null) : void {
  if (rect === null) {
    editor.style.opacity = '0';
    editor.style.top = '-1000px';
    editor.style.left = '-1000px';
  } else {
    editor.style.opacity = '1';
    editor.style.top = `${rect.top + rect.height + window.pageYOffset + 10}px`;
    editor.style.left = `${
      rect.left + window.pageXOffset - editor.offsetWidth / 2 + rect.width / 2
    }px`;
  }
}

interface Props {
  editor: LexicalEditor
}

function FloatingLinkEditor({ editor }: Props) : ReactElement {
  const editorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mouseDownRef = useRef(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [isEditMode, setEditMode] = useState(false);
  const [lastSelection, setLastSelection] = useState<RangeSelection | GridSelection | NodeSelection | null>(null);

  const updateLinkEditor = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const node = getSelectedNode(selection);
      const parent = node.getParent();
      if ($isLinkNode(parent)) {
        setLinkUrl(parent.getURL());
      } else if ($isLinkNode(node)) {
        setLinkUrl(node.getURL());
      } else {
        setLinkUrl('');
      }
    }
    const editorElem = editorRef.current;
    const nativeSelection = window.getSelection();
    const activeElement = document.activeElement;

    if (editorElem === null) {
      return;
    }

    const rootElement = editor.getRootElement();
    if (
      selection !== null
      && !nativeSelection!.isCollapsed
      && rootElement !== null
      && rootElement.contains(nativeSelection!.anchorNode)
    ) {
      const domRange = nativeSelection!.getRangeAt(0);
      let rect: DOMRect;
      if (nativeSelection!.anchorNode === rootElement) {
        let inner = rootElement;
        while (inner.firstElementChild != null) {
          inner = inner.firstElementChild as HTMLElement;
        }
        rect = inner.getBoundingClientRect();
      } else {
        rect = domRange.getBoundingClientRect();
      }

      if (!mouseDownRef.current) {
        positionEditorElement(editorElem, rect);
      }
      setLastSelection(selection);
    } else if (!activeElement || activeElement.className !== 'link-input') {
      positionEditorElement(editorElem, null);
      setLastSelection(null);
      setEditMode(false);
      setLinkUrl('');
    }
  }, [editor]);

  useEffect(() => mergeRegister(
    editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateLinkEditor();
      });
    }),

    editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updateLinkEditor();
        return true;
      },
      LowPriority
    )
  ), [editor, updateLinkEditor]);

  useEffect(() => {
    editor.getEditorState().read(() => {
      updateLinkEditor();
    });
  }, [editor, updateLinkEditor]);

  useEffect(() => {
    if (isEditMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditMode]);

  return (
    <div ref={editorRef} className="link-editor">
      {isEditMode ? (
        <input
          ref={inputRef}
          className="link-input"
          value={linkUrl}
          onChange={(event) => {
            setLinkUrl(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              if (lastSelection !== null) {
                if (linkUrl !== '') {
                  editor.dispatchCommand(
                    TOGGLE_LINK_COMMAND,
                    { url: linkUrl, rel: 'noopener noreferrer', target: '_blank' }
                  );
                }
                setEditMode(false);
              }
            } else if (event.key === 'Escape') {
              event.preventDefault();
              setEditMode(false);
            }
          }}
        />
      ) : (
        <>
          <div className="link-input">
            <a href={linkUrl} target="_blank" rel="noopener noreferrer">
              {linkUrl}
            </a>
            <EditOutlined
              className="link-edit"
              aria-label="link edit"
              role="button"
              tabIndex={0}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setEditMode(true);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

function getSelectedNode(selection: RangeSelection) : ElementNode | TextNode {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = selection.anchor.getNode();
  const focusNode = selection.focus.getNode();
  if (anchorNode === focusNode) {
    return anchorNode;
  }
  const isBackward = selection.isBackward();
  if (isBackward) {
    return $isAtNodeEnd(focus) ? anchorNode : focusNode;
  }
  return $isAtNodeEnd(anchor) ? focusNode : anchorNode;
}

interface ToolbarPluginProps {
  modalControls: {
    showModal: () => void;
    handleOk: () => void;
    handleCancel: () => void;
  }
}

export const INSERT_POLL_COMMAND: LexicalCommand<string> = createCommand(
  'INSERT_POLL_COMMAND',
);

export default function ToolbarPlugin({ modalControls }: ToolbarPluginProps) : ReactElement {
  const [editor] = useLexicalComposerContext();
  const [activeEditor, setActiveEditor] = useState(editor);
  const toolbarRef = useRef(null);
  const [isLink, setIsLink] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [fontSize, setFontSize] = useState<string>(AnnotationFontSize.normal);
  const [alignment, setAlignment] = useState<ElementFormatType>('left');

  const fontSizeOptions = [
    {
      label: 'Normal',
      key: AnnotationFontSize.normal,
      className: fontSize === AnnotationFontSize.normal ? 'dropdown-menu-item-active' : '',
    },
    {
      label: 'Large',
      key: AnnotationFontSize.large,
      className: fontSize === AnnotationFontSize.large ? 'dropdown-menu-item-active' : '',
    },
    {
      label: 'X-Large',
      key: AnnotationFontSize.huge,
      className: fontSize === AnnotationFontSize.huge ? 'dropdown-menu-item-active' : '',
    },
  ];

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      // Update text format
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));

      // Update links
      const node = getSelectedNode(selection);
      const parent = node.getParent();
      if ($isLinkNode(parent) || $isLinkNode(node)) {
        setIsLink(true);
      } else {
        setIsLink(false);
      }

      const nodeAlignment = ($isElementNode(node) ? node.getFormatType() : parent?.getFormatType()) || 'left';
      setAlignment(nodeAlignment);

      setFontSize(
        $getSelectionStyleValueForProperty(selection, 'font-size', AnnotationFontSize.normal)
      );
    }
  }, [editor]);

  useEffect(() => mergeRegister(
    editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar();
      });
    }),

    editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      (_payload, newEditor) => {
        updateToolbar();
        setActiveEditor(newEditor);
        return false;
      },
      LowPriority
    ),
  ), [editor, updateToolbar]);

  const insertLink = useCallback(() => {
    if (!isLink) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, 'https://');
    } else {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  }, [editor, isLink]);

  const handleDropdownItemClick = useCallback(
    (option: string) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $patchStyleText(selection, {
            'font-size': option,
          });
        }
      });
    },
    [editor],
  );

  return (
    <div className="toolbar" ref={toolbarRef}>
      <button
        type="button"
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
        }}
        className={`toolbar-item spaced ${isBold ? 'active' : ''}`}
        aria-label="Format Bold"
      >
        <BoldOutlined className="format" />
      </button>

      <Dropdown
        menu={{
          onClick: (e) => handleDropdownItemClick(`${e.key}px`),
          items: fontSizeOptions,
        }}
        trigger={['click']}
      >
        <button type="button" className="toolbar-item spaced " onClick={e => e.preventDefault()}>
          <FontSizeOutlined /> <DownOutlined className="down-outline" />
        </button>
      </Dropdown>

      <button
        type="button"
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
        }}
        className={`toolbar-item spaced ${isItalic ? 'active' : ''}`}
        aria-label="Format Italics"
      >
        <ItalicOutlined className="format" />
      </button>

      <button
        type="button"
        onClick={insertLink}
        className={`toolbar-item spaced ${isLink ? 'active' : ''}`}
        aria-label="Insert Link"
      >
        <LinkOutlined className="format" />
      </button>

      {isLink && createPortal(<FloatingLinkEditor editor={editor} />, document.body)}

      <Select
        bordered={false}
        value={alignment}
        onChange={(value) => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, value)}
        options={[
          { value: 'left', label: <AlignLeftOutlined className="format" /> },
          { value: 'center', label: <AlignCenterOutlined className="format" /> },
          { value: 'right', label: <AlignRightOutlined className="format" /> },
        ]}
      />

      <button
        type="button"
        onClick={() => modalControls.showModal()}
        className="toolbar-item spaced"
        aria-label="Image Upload"
      >
        <PictureOutlined className="format" />
      </button>

      <button
        type="button"
        onClick={() => editor.dispatchCommand(INSERT_POLL_COMMAND, '')}
        className="toolbar-item spaced"
        aria-label="Lead Form"
      >
        <FormOutlined className="format" />
      </button>
    </div>
  );
}
