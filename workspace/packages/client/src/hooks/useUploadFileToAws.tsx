import React, { useState } from 'react';
import { uploadFileToAws } from '../component/screen-editor/utils/upload-img-to-aws';

const useUploadFileToAws = (): { uploadFile: (file: File) => Promise<string>, loading: boolean } => {
  const [isLoading, setIsLoading] = useState(false);

  const uploadFile = async (file: File): Promise<string> => {
    setIsLoading(true);

    try {
      const uploadUrl = await uploadFileToAws(file);
      setIsLoading(false);
      return uploadUrl;
    } catch (e) {
      setIsLoading(false);
    }

    return '';
  };

  return { uploadFile, loading: isLoading };
};

export default useUploadFileToAws;
