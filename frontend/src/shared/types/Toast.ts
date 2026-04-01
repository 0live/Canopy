export const ToastType = {
  Success: "Success",
  Info: "Info",
  Critical: "Critical"
} as const;

export type ToastType = typeof ToastType[keyof typeof ToastType];
