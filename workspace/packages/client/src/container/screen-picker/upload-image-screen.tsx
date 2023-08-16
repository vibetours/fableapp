import React, { useState } from 'react';
import api from '@fable/common/dist/api';
import { ApiResp, ReqNewScreen, ReqThumbnailCreation, RespScreen, ScreenType } from '@fable/common/dist/api-contract';
import { captureException } from '@sentry/react';
import { getImgScreenData } from '@fable/common/dist/utils';
import * as Tags from './styled';
import { uploadImageAsBinary } from '../../component/screen-editor/utils/upload-img-to-aws';
import Button from '../../component/button';
import Input from '../../component/input';
import * as GTags from '../../common-styled';
import FileInput from '../../component/file-input';

type Props = {
    open: boolean;
    closeModal: () => void;
    tourRid: string | undefined;
    uploadImgScreenAndAddToTour: (screenName: string, screenImgFile: File) => void;
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
    const screenName = formData.get('screen-name') as string;
    const screenImgFile = formData.get('screen-img') as File;

    if (!props.tourRid) {
      captureException('No tour found while uploading screen image');
      return;
    }

    props.uploadImgScreenAndAddToTour(screenName, screenImgFile);

    // TODO[rrl] do this once api endpoint is completed
    setTimeout(() => {
      setUploading(false);
      props.closeModal();
    }, 2000);
  };

  return (
    <GTags.BorderedModal
      open={props.open}
      title=""
      onCancel={props.closeModal}
      onOk={() => {}}
      style={{ height: '10px' }}
      footer={null}
      zIndex={9999}
    >
      <Tags.ModalContainer>
        <h2>Upload Image Screen</h2>
        <form onSubmit={handleSubmit}>
          <Tags.FlexColCon>
            <FileInput
              id="screen-image"
              accept="image/png, image/jpeg, image/webp"
              name="screen-img"
              required
            />
            <Input
              id="screen-name"
              label="Name your screen"
              name="screen-name"
              required
            />
          </Tags.FlexColCon>

          <Button
            type="submit"
            disabled={uploading}
            style={{
              width: '100%',
              marginTop: '1rem'
            }}
          >
            {uploading ? 'Saving' : 'Save'}
          </Button>
          <Tags.ErrorMsg>
            {error}
          </Tags.ErrorMsg>
        </form>
      </Tags.ModalContainer>
    </GTags.BorderedModal>
  );
}
