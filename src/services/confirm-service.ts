type ConfirmFunction = (options: {
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
}) => Promise<boolean>;

class ConfirmService {
  private confirmFn: ConfirmFunction | null = null;

  setConfirmFunction(fn: ConfirmFunction) {
    this.confirmFn = fn;
  }

  async confirm(options: {
    title?: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
  }): Promise<boolean> {
    if (!this.confirmFn) {
      // Fallback to window.confirm if service not initialized
      // eslint-disable-next-line no-alert
      return window.confirm(options.description);
    }
    return this.confirmFn(options);
  }
}

export const confirmService = new ConfirmService();
