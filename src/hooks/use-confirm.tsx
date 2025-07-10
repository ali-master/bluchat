import { useState } from "react";
import {
  AlertDialogTitle,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogDescription,
  AlertDialogContent,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialog,
} from "@/components/ui/alert-dialog";

interface ConfirmState {
  open: boolean;
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  resolve?: (value: boolean) => void;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    description: "",
  });

  const confirm = (options: {
    title?: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        open: true,
        ...options,
        resolve,
      });
    });
  };

  const handleConfirm = () => {
    state.resolve?.(true);
    setState((prev) => ({ ...prev, open: false }));
  };

  const handleCancel = () => {
    state.resolve?.(false);
    setState((prev) => ({ ...prev, open: false }));
  };

  const ConfirmDialog = () => (
    <AlertDialog open={state.open} onOpenChange={handleCancel}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state.title || "Confirm Action"}</AlertDialogTitle>
          <AlertDialogDescription>{state.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {state.cancelText || "Cancel"}
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            {state.confirmText || "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, ConfirmDialog };
}
