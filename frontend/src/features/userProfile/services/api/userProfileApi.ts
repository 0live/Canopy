import { apiClient } from "@/app/config/apiClient";
import type { User } from "@/features/auth/types";
import type { UserUpdatePayload } from "../../types";

export const userProfileApi = {
  updateProfile: async (userId: number, payload: UserUpdatePayload): Promise<User> => {
    const { data } = await apiClient.patch<User>(`/users/${userId}`, payload);
    return data;
  },
};
