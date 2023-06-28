import api from '@fable/common/dist/api';
import { /* RespMediaProcessingInfo, ReqMediaProcess, */ ApiResp, ResponseStatus } from '@fable/common/dist/api-contract';
import { getS3UploadUrl } from './get-aws-signed-url';

export async function uploadVideoToAws(videoBuffer: Uint8Array, type: 'video/webm' | 'video/mp4'): Promise<string> {
  const awsSignedUrl = await getS3UploadUrl(type);
  if (!awsSignedUrl) {
    return '';
  }
  const imageUrl = await uploadImageAsBinary(videoBuffer, type, awsSignedUrl);
  return imageUrl;
}

const uploadImageAsBinary = async (videoBuffer: Uint8Array, type: string, awsSignedUrl: string): Promise<string> => {
  const uploadedImageSrc = awsSignedUrl.split('?')[0];

  const res = await fetch(awsSignedUrl, {
    method: 'PUT',
    body: videoBuffer,
    headers: { 'Content-Type': type },
  });

  return uploadedImageSrc;
};

// export async function transcodeMedia(uri: string): Promise<[err: string, transcodedFilePath: string]> {
//   const data = await api<ReqMediaProcess, ApiResp<RespMediaProcessingInfo>>('/procmed', {
//     auth: true,
//     body: {
//       path: uri,
//     }
//   });
//   if (data.status === ResponseStatus.Failure || data.data.failureReason) {
//     return ["Couldn't transcode video", ''];
//   }
//   return ['', data.data.transcodedFilePath];
// }
