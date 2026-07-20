import { apiClient } from "@/app/config/apiClient";
import type { PaginatedResponse } from "@/shared/types/Pagination";
import type {
  AdminUserSummary,
  AtlasSummary,
  CreateUserPayload,
  TeamSummary,
} from "../../types";

export const adminApi = {
  getUsers: async (
    skip: number,
    limit: number
  ): Promise<PaginatedResponse<AdminUserSummary>> => {
    const { data } = await apiClient.get<PaginatedResponse<AdminUserSummary>>(
      "/users",
      { params: { skip, limit } }
    );
    return data;
  },

  createUser: async (
    payload: CreateUserPayload
  ): Promise<AdminUserSummary> => {
    const { data } = await apiClient.post<AdminUserSummary>(
      "/users",
      payload
    );
    return data;
  },

  deleteUser: async (userId: number): Promise<void> => {
    await apiClient.delete(`/users/${userId}`);
  },

  updateUserRoles: async (
    userId: number,
    roles: string[]
  ): Promise<AdminUserSummary> => {
    const { data } = await apiClient.put<AdminUserSummary>(
      `/users/${userId}/roles`,
      { roles }
    );
    return data;
  },

  getTeams: async (
    skip: number,
    limit: number
  ): Promise<PaginatedResponse<TeamSummary>> => {
    const { data } = await apiClient.get<PaginatedResponse<TeamSummary>>(
      "/teams",
      { params: { skip, limit } }
    );
    return data;
  },

  getAtlases: async (
    skip: number,
    limit: number
  ): Promise<PaginatedResponse<AtlasSummary>> => {
    const { data } = await apiClient.get<PaginatedResponse<AtlasSummary>>(
      "/atlases",
      { params: { skip, limit } }
    );
    return data;
  },
};
