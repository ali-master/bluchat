import { useState } from "react";
import type { ReactNode } from "react";
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

interface ConfirmDialogProps {
  title?: string;
  description: string;
  children: ReactNode;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmDialog({
  title = "Confirm Action",
  description,
  children,
  onConfirm,
  confirmText = "Confirm",
  cancelText = "Cancel",
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    onConfirm();
    setOpen(false);
  };

  return (
    <>
      <div onClick={() => setOpen(true)}>{children}</div>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{cancelText}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function useConfirmDialog() {
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    title?: string;
    description: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({
    open: false,
    description: "",
    onConfirm: () => {},
  });

  const confirm = (options: {
    title?: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
  }) => {
    return new Promise<boolean>((resolve) => {
      setDialogState({
        open: true,
        ...options,
        onConfirm: () => {
          resolve(true);
          setDialogState((prev) => ({ ...prev, open: false }));
        },
      });
    });
  };

  const ConfirmDialogComponent = () => (
    <AlertDialog
      open={dialogState.open}
      onOpenChange={(open) => setDialogState((prev) => ({ ...prev, open }))}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {dialogState.title || "Confirm Action"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {dialogState.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => setDialogState((prev) => ({ ...prev, open: false }))}
          >
            {dialogState.cancelText || "Cancel"}
          </AlertDialogCancel>
          <AlertDialogAction onClick={dialogState.onConfirm}>
            {dialogState.confirmText || "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, ConfirmDialogComponent };
}
