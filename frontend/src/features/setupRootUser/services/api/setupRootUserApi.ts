import { apiClient } from "@/app/config/apiClient";
import type { User } from "@/features/auth/types";
import type { CompleteRootUserSetupCredentials } from "../../types";

export const setupRootUserApi = {
  completeSetup: async (
    credentials: CompleteRootUserSetupCredentials
  ): Promise<User> => {
    const { data } = await apiClient.post<User>("/setup/complete", credentials);
    return data;
  },
};
