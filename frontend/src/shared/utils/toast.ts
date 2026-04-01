import { toast } from "sonner";
import { ToastType } from "@/shared/types/Toast";

export function showToast(message: string, type: ToastType): void {
  switch (type) {
    case ToastType.Success:
      toast.success(message, {
        className: "!bg-primary !text-primary-foreground !border-primary",
      });
      break;
    case ToastType.Info:
      toast.info(message, {
        className: "!bg-warning !text-warning-foreground !border-warning",
      });
      break;
    case ToastType.Critical:
      toast.error(message, {
        className: "!bg-destructive !text-destructive-foreground !border-destructive",
      });
      break;
  }
}
