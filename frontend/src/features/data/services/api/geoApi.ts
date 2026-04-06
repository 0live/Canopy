import { apiClient } from "@/app/config/apiClient";

export const geoApi = {
  detectEpsg: async (wkt: string): Promise<string | null> => {
    const { data } = await apiClient.post<{ epsg: string | null }>("/geo/detect-epsg", { wkt });
    return data.epsg;
  },
};
