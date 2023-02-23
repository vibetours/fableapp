import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $rootTextContent } from '@lexical/text';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { EditorState, LexicalEditor, $getRoot, $insertNodes } from 'lexical';
import ToolbarPlugin from './plugins/toolbar-plugin';
import ImageUploadPlugin from './plugins/image-upload-plugin';
import Theme from './themes';
import AutoLinkPlugin from './plugins/auto-link-plugin';
import './styles.css';
import { ImageNode } from './nodes/image-node';

function Placeholder() {
  return <div className="editor-placeholder">Enter annotation text</div>;
}

const editorConfig = {
  namespace: 'fable-annotation-rich-text-editor',
  theme: Theme,
  onError(error: Error) {
    throw error;
  },
  nodes: [
    AutoLinkNode,
    LinkNode,
    ImageNode
  ]
};

interface Props {
  defaultValue: string;
  onBlurHandler: (bodyContent: string, displayText: string) => void;
}

interface PluginProps {
  defaultAnnotationValue: string
}

function PopulateEditorWithAnnotationBodyPlugin({ defaultAnnotationValue }: PluginProps) {
  const [editor] = useLexicalComposerContext();

  const convertHTMLtoLexicalNodes = useCallback(() => {
    const parser = new DOMParser();
    const dom = parser.parseFromString(defaultAnnotationValue, 'text/html');
    const nodes = $generateNodesFromDOM(editor, dom);
    $getRoot().select();
    $insertNodes(nodes);
  }, [editor]);

  useEffect(() => {
    editor.update(() => {
      convertHTMLtoLexicalNodes();
    });
  }, []);

  return null;
}

interface AnnotationContent {
  htmlFromNode: string;
  annotationDisplayText: string;
}

export default function AnnotationRichTextEditor({ defaultValue, onBlurHandler }: Props) {
  const annotationContentRef = useRef<AnnotationContent>();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const modalControls = {
    showModal: () => {
      setIsModalOpen(true);
    },

    handleOk: () => {
      setIsModalOpen(false);
    },

    handleCancel: () => {
      setIsModalOpen(false);
    },
  };

  const onChangePluginHandler = (editorState: EditorState, editor: LexicalEditor) => {
    editorState.read(() => {
      const htmlFromNode = $generateHtmlFromNodes(editor);
      const annotationDisplayText = $rootTextContent();
      annotationContentRef.current = { htmlFromNode, annotationDisplayText };
    });
  };

  return (
    <LexicalComposer initialConfig={editorConfig}>
      <div
        className="editor-container"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            onBlurHandler(annotationContentRef.current!.htmlFromNode || '', annotationContentRef.current!.annotationDisplayText || '');
          }
        }}
      >
        <ToolbarPlugin modalControls={modalControls} />
        <div className="editor-inner">
          <RichTextPlugin
            contentEditable={<ContentEditable className="editor-input" />}
            placeholder={<Placeholder />}
            ErrorBoundary={LexicalErrorBoundary}
          />
          <OnChangePlugin onChange={onChangePluginHandler} />
          <AutoFocusPlugin />
          <LinkPlugin />
          <AutoLinkPlugin />
          <ImageUploadPlugin isModalOpen={isModalOpen} modalControls={modalControls} />
          <PopulateEditorWithAnnotationBodyPlugin defaultAnnotationValue={defaultValue} />
        </div>
      </div>
    </LexicalComposer>
  );
}
