import raiseDeferredError from '@fable/common/dist/deferred-error';
import { ApiResp, PvtAssetType, ResponseStatus, RespUploadUrl } from '@fable/common/dist/api-contract';
import { captureException } from '@sentry/react';
import api from '@fable/common/dist/api';
import { getS3UploadUrl } from './get-aws-signed-url';

export async function uploadFileToAws(image: File): Promise<string> {
  if (!image) {
    return '';
  }
  const awsSignedUrl = await getS3UploadUrl(image.type);
  if (!awsSignedUrl) {
    return '';
  }
  const imageUrl = await uploadImageAsBinary(image, awsSignedUrl);
  return imageUrl;
}

export async function uploadImageDataToAws(base64ImageData: string, type: 'image/png'): Promise<string> {
  const awsSignedUrl = await getS3UploadUrl(type);
  if (!awsSignedUrl) {
    raiseDeferredError(new Error('Failed to get S3 upload URL'));
    return '';
  }

  const imageData = base64ImageData.replace(/^data:image\/\w+;base64,/, '');
  const byteCharacters = atob(imageData);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);

  const res = await fetch(awsSignedUrl, {
    method: 'PUT',
    body: byteArray,
    headers: { 'Content-Type': type },
  });

  if (res.status === 200) {
    const url = new URL(awsSignedUrl);
    return `${url.origin}${url.pathname}`;
  }
  raiseDeferredError(new Error('Failed to upload image to AWS'));
  return '';
}

export const uploadImageAsBinary = async (selectedImage: any, awsSignedUrl: string): Promise<string> => {
  const uploadedImageSrc = awsSignedUrl.split('?')[0];

  const reader = new FileReader();
  reader.readAsArrayBuffer(selectedImage);
  return new Promise((resolve) => {
    reader.addEventListener('load', async () => {
      const binaryData = reader.result;
      const res = await fetch(awsSignedUrl, {
        method: 'PUT',
        body: binaryData,
        headers: { 'Content-Type': selectedImage.type },
      });

      if (res.status === 200) {
        resolve(uploadedImageSrc);
      }
    });
  });
};

export const uploadMarkedImageToAws = async (
  contentType: string,
  anonDemoId: string,
  imageName: string,
  file: File
): Promise<string> => {
  // eslint-disable-next-line max-len
  const data = await api<null, ApiResp<RespUploadUrl>>(`/getpvtuploadlink?te=${btoa(contentType)}&pre=${anonDemoId}&fe=${btoa(imageName)}&t=${PvtAssetType.MarkedImgs}`, {
    auth: true
  });
  if (data.status === ResponseStatus.Failure) {
    captureException('Error in getting S3 upload url');
    return '';
  }

  const s3PresignedUploadUrl = data.data.url;
  const imageUrl = await uploadImageAsBinary(file, s3PresignedUploadUrl);
  return imageUrl;
};
