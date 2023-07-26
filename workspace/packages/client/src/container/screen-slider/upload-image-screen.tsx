import React, { useState } from 'react';
import Modal from 'antd/lib/modal';
import api from '@fable/common/dist/api';
import { ApiResp, ReqNewScreen, ReqThumbnailCreation, RespScreen, ScreenType } from '@fable/common/dist/api-contract';
import { captureException } from '@sentry/react';
import { getImgScreenData } from '@fable/common/dist/utils';
import * as Tags from './styled';
import { uploadImageAsBinary } from '../../component/screen-editor/utils/upload-img-to-aws';
import { P_RespScreen } from '../../entity-processor';

type Props = {
    open: boolean;
    closeModal: () => void;
    tourRid: string | undefined;
    handleAddScreen: (screen: P_RespScreen) => void;
    hidePopup: () => void,
};

const GEN_ERR_MSG = 'Something went wrong! Please try again';

export default function UploadImageScreen(props: Props): JSX.Element {
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    setUploading(true);
    setError('');

    const formData = new FormData(event.currentTarget);
    const screenName = formData.get('screenName') as string;
    const screenImgFile = formData.get('screenImg') as File;

    if (!props.tourRid) {
      captureException('No tour found while uploading screen image');
      return;
    }

    try {
      const { data: screen } = await api<ReqNewScreen, ApiResp<RespScreen>>('/newscreen', {
        method: 'POST',
        body: {
          name: screenName,
          type: ScreenType.Img,
          body: JSON.stringify(getImgScreenData()),
          contentType: screenImgFile.type
        },
      });

      if (!screen.uploadUrl) {
        captureException('Data url is not returned by server for image screen');
        setError(GEN_ERR_MSG);
        return;
      }

      await uploadImageAsBinary(screenImgFile, screen.uploadUrl);

      await api<ReqThumbnailCreation, ApiResp<RespScreen>>('/genthumb', {
        method: 'POST',
        body: {
          screenRid: screen.rid
        },
      });

      // TODO screen is of type Screen not P_RespScreen, actions should always be called via action creator
      //      this is antipattern
      props.handleAddScreen(screen as P_RespScreen);

      // TODO[rrl] do this once api endpoint is completed
      setTimeout(() => {
        setUploading(false);
        props.closeModal();
        props.hidePopup();
      }, 1000);
    } catch (err) {
      captureException(err);
      setUploading(false);
      setError('Something went wrong! Please try again');
    }
  };

  return (
    <Modal
      open={props.open}
      title=""
      onCancel={props.closeModal}
      onOk={() => {}}
      style={{ position: 'relative' }}
      footer={null}
      zIndex={9999}
    >
      <Tags.ModalBorderTop>
        <div />
        <div />
        <div />
      </Tags.ModalBorderTop>
      <Tags.ModalContainer>
        <h2>Upload Image Screen</h2>
        <form onSubmit={handleSubmit}>
          <Tags.InputLabel htmlFor="screen-img">Upload screen image</Tags.InputLabel>
          <Tags.InputContainer>
            <input
              id="screen-img"
              type="file"
              accept="image/png, image/jpeg, image/webp"
              name="screenImg"
              required
            />
          </Tags.InputContainer>
          <Tags.InputLabel htmlFor="screen-name">Name your screen</Tags.InputLabel>
          <Tags.InputContainer>
            <input
              id="screen-name"
              placeholder="Untitled"
              type="text"
              name="screenName"
              required
            />
          </Tags.InputContainer>
          <Tags.PrimaryButton type="submit" disabled={uploading}>
            {uploading ? 'Saving' : 'Save'}
          </Tags.PrimaryButton>

          <Tags.ErrorMsg>
            {error}
          </Tags.ErrorMsg>
        </form>
      </Tags.ModalContainer>
    </Modal>
  );
}
