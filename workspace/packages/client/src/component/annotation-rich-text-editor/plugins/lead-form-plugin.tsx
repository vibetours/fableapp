import * as React from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $wrapNodeInElement } from '@lexical/utils';
import {
  $createParagraphNode,
  $insertNodes,
  $isRootOrShadowRoot,
  COMMAND_PRIORITY_EDITOR,
} from 'lexical';
import { useEffect } from 'react';
import {
  $createLeadFormNode,
  createLeadFormOption,
  LeadFormNode,
} from '../nodes/lead-form-node';
import { INSERT_LEAD_FORM_COMMAND } from './toolbar-plugin';

export default function LeadFormPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([LeadFormNode])) {
      throw new Error('LeadFormPlugin: LeadFormNode not registered on editor');
    }

    return editor.registerCommand<string>(
      INSERT_LEAD_FORM_COMMAND,
      (payload) => {
        const leadFormNode = $createLeadFormNode([
          createLeadFormOption('Enter your Email {[email]}', true, 'email'),
        ]);

        $insertNodes([leadFormNode]);

        if ($isRootOrShadowRoot(leadFormNode.getParentOrThrow())) {
          $wrapNodeInElement(leadFormNode, $createParagraphNode).selectEnd();
        }

        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  return null;
}
