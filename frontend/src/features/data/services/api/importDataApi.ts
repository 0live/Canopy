import { apiClient } from "@/app/config/apiClient";

export interface FileUploadResponse {
  upload_id: string;
  filename: string;
  size: number;
}

export const importDataApi = {
  uploadGeoFile: async (
    file: File,
    onProgress: (percent: number) => void
  ): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await apiClient.post<FileUploadResponse>(
      "/import-data/upload",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (event) => {
          if (event.total) {
            onProgress(Math.round((event.loaded * 100) / event.total));
          }
        },
      }
    );
    return data;
  },
};
