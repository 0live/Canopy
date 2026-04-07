import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { importDataApi, type FileUploadResponse } from "@/features/data/services/api/importDataApi";

export interface GeoFileUploadState {
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  progress: number;
  result: FileUploadResponse | null;
}

export function useGeoFileUpload() {
  const [progress, setProgress] = useState(0);

  const mutation = useMutation({
    mutationFn: (file: File) => importDataApi.uploadGeoFile(file, setProgress),
  });

  const upload = (file: File) => {
    setProgress(0);
    mutation.mutate(file);
  };

  const reset = () => {
    setProgress(0);
    mutation.reset();
  };

  const state: GeoFileUploadState = {
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    progress,
    result: mutation.data ?? null,
  };

  return { upload, reset, state };
}
