import api from '@fable/common/dist/api';
import { ApiResp, RespUploadUrl, ResponseStatus } from '@fable/common/dist/api-contract';

export async function uploadImgToAws(image: File): Promise<string> {
  if (!image) {
    return '';
  }
  const awsSignedUrl = await getImageUploadUrl(image.type);
  if (!awsSignedUrl) {
    return '';
  }
  try {
    const imageUrl = await uploadImageAsBinary(image, awsSignedUrl);
    return imageUrl;
  } catch (e) {
    console.error('image could not be uploaded');
    return '';
  }
}

const getImageUploadUrl = async (type: string): Promise<string> => {
  const res = await api<null, ApiResp<RespUploadUrl>>(`/getuploadlink?te=${btoa(type)}`, {
    auth: true,
  });
  return res.status === ResponseStatus.Failure ? '' : res.data.url;
};

const uploadImageAsBinary = async (selectedImage: any, awsSignedUrl: string): Promise<string> => {
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
