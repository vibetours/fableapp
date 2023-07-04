import React from 'react';
import { Modal } from 'antd';
import * as Tags from './styled';

interface Props {
  open: boolean;
  onCancel: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  isUploading: boolean;
  error: string;
}

export default function ImageMaskUploadModal({
  open,
  onCancel,
  onSubmit,
  isUploading,
  error
}: Props): JSX.Element {
  return (
    <Modal
      open={open}
      title=""
      onCancel={onCancel}
      onOk={() => { }}
      style={{ position: 'relative' }}
      footer={null}
    >
      <Tags.ModalBorderTop>
        <div />
        <div />
        <div />
      </Tags.ModalBorderTop>
      <Tags.ModalContainer>
        <h2>Upload Image Mask</h2>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <Tags.InputLabel htmlFor="screen-img">Upload image mask</Tags.InputLabel>
          <Tags.InputContainer
            id="screen-img"
            type="file"
            accept="image/png, image/jpeg, image/webp, image/svg+xml"
            name="maskImg"
            required
          />

          <Tags.InputLabel htmlFor="resolution">Select resolution</Tags.InputLabel>
          <Tags.StyledSelect
            defaultValue="480p"
            name="resolution"
            id="resolution"
          >
            <option value="480">480p</option>
            <option value="720">720p</option>
          </Tags.StyledSelect>

          <Tags.PrimaryButton type="submit" disabled={isUploading}>
            {isUploading ? 'Saving' : 'Save'}
          </Tags.PrimaryButton>

          <Tags.ErrorMsg>
            {error}
          </Tags.ErrorMsg>
        </form>
      </Tags.ModalContainer>
    </Modal>
  );
}
