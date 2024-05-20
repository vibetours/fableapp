import React, { ReactElement, SetStateAction, useEffect, useRef, Dispatch } from 'react';
import { Tabs, Spin } from 'antd';
import { IAnnotationConfig, VideoAnnotationPositions } from '@fable/common/dist/types';
import { WarningFilled } from '@ant-design/icons';
import { captureException } from '@sentry/react';
import { MediaType } from '@fable/common/dist/api-contract';
import Button from '../button';
import { uploadVideoToAws, transcodeMedia } from './utils/upload-video-to-aws';
import {
  updateAnnotationBoxSize,
  updateAnnotationPositioning,
  updateAnnotationVideoURLHLS,
  updateAnnotationVideoURLMp4,
  updateAnnotationVideoURLWebm,
} from '../annotation/annotation-config-utils';
import { blobToUint8Array } from './utils/blob-to-uint8array';
import { P_RespTour } from '../../entity-processor';
import * as Tags from './styled';
import * as GTags from '../../common-styled';
import FileInput from '../file-input';
import { uploadFileToAws } from './utils/upload-img-to-aws';
import { FeatureForPlan } from '../../plans';
import { isFeatureAvailable } from '../../utils';
import Upgrade from '../upgrade';

type Props = {
  tour: P_RespTour,
  closeRecorder: () => void,
  setConfig: Dispatch<SetStateAction<IAnnotationConfig>>
}

type VideoState = {
  isVideoModalOpen: boolean;
  isRecording: boolean;
  doneRecording: boolean;
  recordedVideoURL: string;
  saving: boolean;
  permissionGiven: boolean;
  isVideoReady: boolean;
};

type Action = {
  type: string;
  payload?: {
    [key: string]: any;
  };
};

const initialState: VideoState = {
  isVideoModalOpen: true,
  isRecording: false,
  doneRecording: false,
  recordedVideoURL: '',
  saving: false,
  permissionGiven: true,
  isVideoReady: false,
};

const CODEC_OPTIONS = { mimeType: 'video/webm;codecs=h264' };

// videoReducer is local to this video recorder component, that's why it's placed here
const videoReducer = (state: VideoState, action: Action): VideoState => {
  switch (action.type) {
    case 'OPEN_VIDEO_MODAL':
      return {
        ...state,
        isVideoModalOpen: true,
      };
    case 'CLOSE_VIDEO_MODAL':
      return {
        ...state,
        isVideoModalOpen: false,
      };
    case 'SET_IS_RECORDING':
      return {
        ...state,
        isRecording: action.payload!.isRecording,
      };
    case 'SET_DONE_RECORDING':
      return {
        ...state,
        doneRecording: action.payload!.doneRecording,
      };
    case 'SET_RECORDED_VIDEO_URL':
      return {
        ...state,
        recordedVideoURL: action.payload!.url,
      };
    case 'START_SAVING':
      return {
        ...state,
        saving: true,
      };
    case 'FINISH_SAVING':
      return {
        ...state,
        saving: false,
      };
    case 'SET_PERMISSION_GIVEN':
      return {
        ...state,
        permissionGiven: action.payload!.given,
      };
    case 'SET_IS_VIDEO_READY':
      return {
        ...state,
        isVideoReady: action.payload!.isVideoReady,
      };
    default:
      return state;
  }
};

function VideoRecorder(props: Props): ReactElement {
  const recorderRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream>();
  const recordedPartsRef = useRef<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder>();
  const [state, dispatch] = React.useReducer(videoReducer, initialState);

  const TabList = [
    {
      tabName: 'Record',
      component: () => RecordVideoTab({
        state,
        recorderRef,
        stopRecording,
        startRecording,
        restartRecording,
        saveRecording
      })
    },
    {
      tabName: 'Upload',
      component: () => UploadVideoTab({
        state,
        handleUploadVideoFormOnSubmit
      })
    }

  ];

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({
      audio: true,
      video: {
        width: { exact: 640 },
        height: { exact: 480 },
        frameRate: { ideal: 12 },
      }
    })
      .then(stream => {
        streamRef.current = stream;
        recorderRef.current!.srcObject = stream;
        dispatch({
          type: 'SET_PERMISSION_GIVEN',
          payload: {
            given: true
          }
        });
        dispatch({
          type: 'SET_IS_VIDEO_READY',
          payload: {
            isVideoReady: true
          }
        });
      }).catch(err => {
        if (err.message === 'Permission denied') {
          captureException('Camera & mic permission denied while recording video annotation');
          dispatch({
            type: 'SET_PERMISSION_GIVEN',
            payload: {
              given: false
            }
          });
          dispatch({
            type: 'SET_IS_VIDEO_READY',
            payload: {
              isVideoReady: false
            }
          });
        }
      });
  }, []);

  const startRecording = (): void => {
    dispatch({
      type: 'SET_DONE_RECORDING',
      payload: {
        doneRecording: false
      }
    });

    dispatch({
      type: 'SET_IS_RECORDING',
      payload: {
        isRecording: true
      }
    });

    if (streamRef.current) {
      const mediaRecorder = mediaRecorderRef.current = new MediaRecorder(streamRef.current, CODEC_OPTIONS);
      mediaRecorder.start(1);
      mediaRecorder.ondataavailable = function (e) {
        recordedPartsRef.current.push(e.data);
      };
    }
  };

  const stopRecording = (): void => {
    dispatch({
      type: 'SET_DONE_RECORDING',
      payload: {
        doneRecording: true
      }
    });

    dispatch({
      type: 'SET_IS_RECORDING',
      payload: {
        isRecording: false
      }
    });

    mediaRecorderRef.current!.stop();
    const blob = new Blob(recordedPartsRef.current, {
      type: CODEC_OPTIONS.mimeType
    });
    const url = URL.createObjectURL(blob);
    dispatch({
      type: 'SET_RECORDED_VIDEO_URL',
      payload: {
        url
      }
    });
  };

  const restartRecording = (): void => {
    recordedPartsRef.current = [];
    dispatch({
      type: 'SET_IS_RECORDING',
      payload: {
        isRecording: false
      }
    });

    dispatch({
      type: 'SET_DONE_RECORDING',
      payload: {
        doneRecording: false
      }
    });

    dispatch({
      type: 'SET_RECORDED_VIDEO_URL',
      payload: {
        url: ''
      }
    });
  };

  const transcodeMediaHandler = async (url: string): Promise<void> => {
    const [err, stream1, stream2] = await transcodeMedia(url, props.tour.rid);
    if (err || stream1.failureReason || stream2.failureReason) {
      throw new Error('Transcoding failed');
    }

    [stream1, stream2].forEach(stream => {
      if (stream1.mediaType === MediaType.VIDEO_HLS) {
        props.setConfig(c => updateAnnotationVideoURLHLS(c, stream1.processedFilePath));
      }
      if (stream1.mediaType === MediaType.VIDEO_MP4) {
        props.setConfig(c => updateAnnotationVideoURLMp4(c, stream1.processedFilePath));
      }
    });

    props.setConfig(c => updateAnnotationVideoURLWebm(c, url));

    props.setConfig(c => {
      if (c.type === 'cover') {
        return updateAnnotationPositioning(c, VideoAnnotationPositions.Center);
      }
      return updateAnnotationPositioning(c, VideoAnnotationPositions.BottomRight);
    });

    props.setConfig(c => updateAnnotationBoxSize(c, 'medium'));

    dispatch({
      type: 'FINISH_SAVING'
    });

    closeRecorder();
  };

  const saveRecording = async (): Promise<void> => {
    dispatch({
      type: 'START_SAVING'
    });

    const webmBlob = new Blob(recordedPartsRef.current, {
      type: CODEC_OPTIONS.mimeType
    });
    const webm = await blobToUint8Array(webmBlob);

    const webmUrl = await uploadVideoToAws(webm, 'video/webm');

    await transcodeMediaHandler(webmUrl);
  };

  const handleUploadVideoFormOnSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    dispatch({
      type: 'START_SAVING'
    });

    const formData = new FormData(event.currentTarget);
    const videoAnnotationFile = formData.get('video-ann') as File;

    const videoUrl = await uploadFileToAws(videoAnnotationFile);

    await transcodeMediaHandler(videoUrl);
  };

  useEffect(() => {
    if (!state.doneRecording) {
      recorderRef.current!.srcObject = streamRef.current!;
    }
  }, [state.doneRecording]);

  const closeRecorder = async (): Promise<void> => {
    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });
    dispatch({
      type: 'CLOSE_VIDEO_MODAL'
    });
    setTimeout(() => props.closeRecorder(), 1000);
  };

  if (!state.permissionGiven) {
    return (
      <GTags.BorderedModal
        style={{ height: '10px' }}
        title={<><WarningFilled style={{ color: 'red' }} /> Error</>}
        open={state.isVideoModalOpen}
        onCancel={closeRecorder}
        footer={null}
      >
        <p>Camera and microphone permission is required for this feature!</p>
      </GTags.BorderedModal>
    );
  }

  return (
    <GTags.BorderedModal
      style={{ height: '10px' }}
      title="Record / Upload Video"
      open={state.isVideoModalOpen}
      onOk={closeRecorder}
      onCancel={closeRecorder}
      footer={null}
    >
      <Tabs
        type="card"
        size="small"
        items={TabList.map((tab, i) => {
          const id = String(i + 1);
          return {
            label: tab.tabName,
            key: id,
            children: <>{tab.component()}</>,
          };
        })}
      />
    </GTags.BorderedModal>
  );
}

interface RecordVideoTabProps {
  state: VideoState;
  recorderRef: React.RefObject<HTMLVideoElement>;
  stopRecording: () => void;
  startRecording: () => void;
  restartRecording: () => void;
  saveRecording: () => Promise<void>;
}

function RecordVideoTab({
  state,
  recorderRef,
  stopRecording,
  startRecording,
  restartRecording,
  saveRecording
}: RecordVideoTabProps): JSX.Element {
  return (
    <>
      <p>Record a video explaining the feature you selected on the screen.</p>
      {
        !state.doneRecording && (
          <>
            <video
              autoPlay
              muted
              ref={recorderRef}
              style={{ height: '225px', margin: 'auto', display: 'block', borderRadius: '12px' }}
            />
            {
              state.isVideoReady && (
                <div style={{ margin: '1rem auto', marginBottom: '0', display: 'flex', justifyContent: 'center' }}>
                  {
                    state.isRecording
                      ? <Button onClick={stopRecording}>Stop Recording</Button>
                      : <Button onClick={startRecording}>Start Recording</Button>
                  }
                </div>
              )
            }
          </>
        )
      }
      {
        state.doneRecording && (
          <>
            <video
              autoPlay
              controls
              src={state.recordedVideoURL}
              style={{ height: '225px', margin: 'auto', display: 'block' }}
            />
            {
              state.saving && (
                <div style={{ margin: '1rem auto' }}>
                  <div style={{ textAlign: 'center' }}>Saving</div>
                </div>
              )
            }
            {
              !state.saving && (
                <Tags.ActionBtnCon>
                  <Button intent="secondary" onClick={restartRecording}>Discard</Button>
                  <Button onClick={saveRecording}>Save</Button>
                </Tags.ActionBtnCon>
              )
            }
          </>
        )
      }
    </>
  );
}

interface UploadVideoTabProps {
  state: VideoState;
  handleUploadVideoFormOnSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

function UploadVideoTab({
  state,
  handleUploadVideoFormOnSubmit,
}: UploadVideoTabProps): JSX.Element {
  return (
    <form onSubmit={handleUploadVideoFormOnSubmit}>
      <FileInput
        id="video-annotation"
        accept=".mp4"
        name="video-ann"
        required
      />
      <Button
        type="submit"
        disabled={state.saving}
        style={{
          width: '100%',
          marginTop: '1rem'
        }}
      >
        {state.saving ? 'Uploading' : 'Upload'}
      </Button>
    </form>
  );
}

export default VideoRecorder;
