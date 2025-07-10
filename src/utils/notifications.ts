import { toast } from "sonner";
import { confirmService } from "@/services/confirm-service";

export const notifications = {
  confirm: async (message: string): Promise<boolean> => {
    // Use the confirm service instead of window.confirm
    return confirmService.confirm({ description: message });
  },

  alert: (message: string): void => {
    // Use toast instead of alert for better UX
    toast.error(message);
  },

  success: (message: string): void => {
    toast.success(message);
  },

  info: (message: string): void => {
    toast.info(message);
  },

  error: (message: string): void => {
    toast.error(message);
  },
};
