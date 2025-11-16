import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface ConfirmOptions {
  title: string;
  description?: string;
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
  onCancel
}: ConfirmOptions) {
  const toastId = toast(
    <div
      className="flex flex-col gap-3 min-w-[300px]"
      style={{ pointerEvents: 'auto' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div>
        <p className="font-semibold text-base text-foreground">{title}</p>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 cursor-pointer"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toast.dismiss(toastId);
            onCancel?.();
          }}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground hover:bg-destructive/90 h-9 px-3 cursor-pointer"
          style={{ pointerEvents: 'auto' }}
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            toast.dismiss(toastId);
            await onConfirm();
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </div>,
    {
      duration: Infinity,
      closeButton: false,
      position: 'top-center',
      unstyled: false,
      style: {
        border: '1px solid hsl(var(--border))',
        backgroundColor: 'hsl(var(--background))',
        pointerEvents: 'auto',
      },
    }
  );
}
