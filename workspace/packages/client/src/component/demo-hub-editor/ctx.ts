import { createContext, useContext } from 'react';
import { IDemoHubConfig, OnDemoHubConfigChangeFn, P_RespDemoHub } from '../../types';
import { P_RespTour } from '../../entity-processor';

interface EditorCtxProps {
  data: P_RespDemoHub;
  config: IDemoHubConfig;
  onConfigChange: React.Dispatch<React.SetStateAction<IDemoHubConfig>>;
  tours: P_RespTour[];
  setPreviewUrl: React.Dispatch<React.SetStateAction<string>>;
}

export const EditorCtx = createContext<EditorCtxProps | null >(null);

export const useEditorCtx = (): EditorCtxProps => {
  const context = useContext(EditorCtx);
  if (!context) {
    throw new Error('useEditorCtx must be used within a EditorCtx.Provider');
  }
  return context;
};
