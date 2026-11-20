import { X } from 'lucide-react';
import type { ToastItem } from '../../types-ui';

const TONE_STYLES: Record<ToastItem['tone'], string> = {
  success: 'bg-sage',
  error: 'bg-terracotta',
  info: 'bg-gold',
};

export function Toasts({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none fixed left-1/2 top-20 z-50 flex w-[min(92vw,420px)] -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="glass-pill pointer-events-auto flex w-full animate-toast-in items-center gap-2.5 rounded-full px-3.5 py-2 text-[12px] font-medium text-ink shadow-float"
          role="status"
        >
          <span className={`h-2 w-2 shrink-0 rounded-full ${TONE_STYLES[toast.tone]}`} />
          <span className="flex-1 leading-snug">{toast.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="focus-ring rounded-full p-0.5 text-ink-soft/60 transition hover:text-ink"
            aria-label="Dismiss notification"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
