import React, { useEffect, useState } from 'react';
import { $wrapNodeInElement, mergeRegister } from '@lexical/utils';
import {
  LexicalCommand,
  $createParagraphNode,
  createCommand,
  $insertNodes,
  $isRootOrShadowRoot,
  COMMAND_PRIORITY_EDITOR
} from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import Modal from 'antd/lib/modal';
import { $createImageNode, ImagePayload } from '../nodes/image-node';
import { uploadImgToAws } from '../../screen-editor/utils/upload-img-to-aws';

export type InsertImagePayload = Readonly<ImagePayload>;

export const INSERT_IMAGE_COMMAND: LexicalCommand<InsertImagePayload> = createCommand('INSERT_IMAGE_COMMAND');

interface ImageUploadPluginProps {
  isModalOpen: boolean;
  modalControls: {
    showModal: () => void;
    handleOk: () => void;
    handleCancel: () => void;
  }
}

export default function ImageUploadPlugin({ isModalOpen, modalControls }: ImageUploadPluginProps): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [imgUrl, setImgUrl] = useState<string>('');

  useEffect(() => mergeRegister(
    editor.registerCommand<InsertImagePayload>(
      INSERT_IMAGE_COMMAND,
      (payload) => {
        const imageNode = $createImageNode(payload);
        $insertNodes([imageNode]);
        if ($isRootOrShadowRoot(imageNode.getParentOrThrow())) {
          $wrapNodeInElement(imageNode, $createParagraphNode).selectEnd();
        }

        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    )
  ), [editor]);

  modalControls.handleOk = () => {
    editor.dispatchCommand(INSERT_IMAGE_COMMAND, { altText: '', src: imgUrl } as InsertImagePayload);
    modalControls.handleCancel();
  };

  const handleSelectedImageChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const selectedImage = e.target.files![0];
    if (!selectedImage) {
      return;
    }
    const imageUrl = await uploadImgToAws(selectedImage);
    setImgUrl(imageUrl);
  };

  return (
    <Modal
      title="Insert Image"
      open={isModalOpen}
      onOk={modalControls.handleOk}
      onCancel={modalControls.handleCancel}
    >
      <input
        onChange={handleSelectedImageChange}
        type="file"
        accept="image/png, image/gif, image/jpeg, image/webp, image/svg+xml"
      />
    </Modal>
  );
}
