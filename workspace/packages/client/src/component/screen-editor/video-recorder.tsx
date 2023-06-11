import React, { SetStateAction, useEffect, useRef, useState } from 'react';
import Modal from 'antd/lib/modal';
import Button from 'antd/lib/button';
import { IAnnotationConfig } from '@fable/common/dist/types';
import { WarningFilled } from '@ant-design/icons';
import { captureException } from '@sentry/react';
import { uploadVideoToAws } from './utils/upload-video-to-aws';
import { updateAnnotationVideoURLMp4, updateAnnotationVideoURLWebm } from '../annotation/annotation-config-utils';
import { blobToUint8Array } from './utils/blob-to-uint8array';

type Props = {
    closeRecorder: () => void,
    setConfig: (value: SetStateAction<IAnnotationConfig>) => void
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

// videoReducer is local to this video recorder component, that's why it's placed here
const videoReducer = (state: VideoState, action: Action) => {
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

function VideoRecorder(props: Props) {
  const recorderRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream>();
  const recordedPartsRef = useRef<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder>();
  const [state, dispatch] = React.useReducer(videoReducer, initialState);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true,
      video: {
        width: { exact: 480 },
        height: { exact: 360 },
        frameRate: { exact: 12 },
      } })
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

  const startRecording = () => {
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
      const mediaRecorder = mediaRecorderRef.current = new MediaRecorder(streamRef.current);
      mediaRecorder.start(1);
      mediaRecorder.ondataavailable = function (e) {
        recordedPartsRef.current.push(e.data);
      };
    }
  };

  const stopRecording = () => {
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
      type: 'video/webm'
    });
    const url = URL.createObjectURL(blob);
    dispatch({
      type: 'SET_RECORDED_VIDEO_URL',
      payload: {
        url
      }
    });
  };

  const restartRecording = () => {
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

  const saveRecording = async () => {
    dispatch({
      type: 'START_SAVING'
    });

    const webmBlob = new Blob(recordedPartsRef.current, {
      type: 'video/webm'
    });
    const webm = await blobToUint8Array(webmBlob);

    const mp4Blob = new Blob(recordedPartsRef.current, {
      type: 'video/mp4'
    });
    const mp4 = await blobToUint8Array(mp4Blob);

    const webmUrl = await uploadVideoToAws(webm, 'video/webm');
    const mp4Url = await uploadVideoToAws(mp4, 'video/mp4');
    props.setConfig(c => updateAnnotationVideoURLMp4(c, mp4Url));
    props.setConfig(c => updateAnnotationVideoURLWebm(c, webmUrl));
    dispatch({
      type: 'FINISH_SAVING'
    });
    closeRecorder();
  };

  useEffect(() => {
    if (!state.doneRecording) {
        recorderRef.current!.srcObject = streamRef.current!;
    }
  }, [state.doneRecording]);

  const closeRecorder = async () => {
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
      <Modal
        title={<><WarningFilled style={{ color: 'red' }} /> Error</>}
        open={state.isVideoModalOpen}
        onCancel={closeRecorder}
        footer={null}
      >
        <p>Camera and microphone permission is required for this feature!</p>
      </Modal>
    );
  }

  return (
    <Modal
      title="Record video"
      open={state.isVideoModalOpen}
      onOk={closeRecorder}
      onCancel={closeRecorder}
      footer={null}
    >
      <p>Record a video explaining the feature you selected on the screen.</p>
      {
        !state.doneRecording && (
          <>
            <video
              autoPlay
              muted
              ref={recorderRef}
              style={{ height: '225px', margin: 'auto', display: 'block' }}
            />
            {
            state.isVideoReady && (
              <div style={{ margin: '1rem auto', display: 'flex', justifyContent: 'center' }}>
                {
                  state.isRecording
                    ? <Button type="primary" onClick={stopRecording}>Stop Recording</Button>
                    : <Button type="primary" onClick={startRecording}>Start Recording</Button>
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
              <div style={{ margin: '1rem auto', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                <Button type="link" onClick={restartRecording}>Discard</Button>
                <Button type="primary" onClick={saveRecording}>Save</Button>
              </div>
            )
          }
        </>
        )
}
    </Modal>
  );
}

export default VideoRecorder;
