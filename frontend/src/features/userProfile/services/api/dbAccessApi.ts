import { apiClient } from "@/app/config/apiClient";
import type { DatabaseAccessStatus, DatabaseActivateResponse } from "../../types";



export const dbAccessApi = {
  getStatus: async (): Promise<DatabaseAccessStatus> => {
    const { data } = await apiClient.get<DatabaseAccessStatus>("/database-access/status");
    return data;
  },

  activate: async (password: string): Promise<DatabaseActivateResponse> => {
    const { data } = await apiClient.post<DatabaseActivateResponse>(
      "/database-access/activate",
      { password }
    );
    return data;
  },

  updatePassword: async (password: string): Promise<{ message: string }> => {
    const { data } = await apiClient.patch<{ message: string }>(
      "/database-access/password",
      { password }
    );
    return data;
  },
};
