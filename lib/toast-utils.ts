import { toast } from 'sonner';

interface ConfirmActionOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export function confirmAction({
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
}: ConfirmActionOptions) {
  toast(title, {
    description,
    duration: Infinity,
    action: {
      label: confirmLabel,
      onClick: async () => {
        try {
          await onConfirm();
        } catch (error) {
          console.error('Error in confirm action:', error);
        }
      },
    },
    cancel: {
      label: cancelLabel,
      onClick: () => {
        if (onCancel) {
          onCancel();
        }
      },
    },
  });
}
