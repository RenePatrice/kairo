import { Toast } from '@kairo/ui';
import { useUi } from '../store';
/** Toast « Annuler » (5 s) de l'app, placé par l'appelant. */
export function AppToast({ className }: { className: string }) {
  const toast = useUi((s) => s.toast);
  const clearToast = useUi((s) => s.clearToast);
  return (
    <Toast
      message={toast?.message ?? null}
      key={toast?.id}
      onUndo={toast?.action ? () => void toast.action?.() : undefined}
      undoLabel={toast?.actionLabel}
      onClose={clearToast}
      className={`pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4 [&>*]:pointer-events-auto ${className}`}
    />
  );
}
