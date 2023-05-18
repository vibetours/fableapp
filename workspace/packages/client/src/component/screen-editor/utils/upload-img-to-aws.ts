import { getS3UploadUrl } from './get-aws-signed-url';

export async function uploadImgToAws(image: File): Promise<string> {
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
