import { type AuthSlice, createAuthSlice } from "@/features/auth/store/authStore";
import {
    type NotificationSlice,
    createNotificationSlice,
} from "@/features/userProfile/store/notificationStore";
import { create } from "zustand";

export type SharedState = AuthSlice & NotificationSlice;

export const useAppStore = create<SharedState>()((...a) => ({
  ...createAuthSlice(...a),
  ...createNotificationSlice(...a),
}));
