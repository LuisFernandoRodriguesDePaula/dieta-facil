import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

export default function MealDialog({
  title,
  onClose,
  children,
  busy = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    if (dialog && !dialog.open) {
      if (dialog.showModal) dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    return () => {
      dialog?.close?.();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="meal-dialog"
      aria-labelledby={titleId}
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const controls = Array.from(
          e.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
          ),
        ).filter(
          (el) => el.getClientRects().length > 0 && !el.closest("[inert]"),
        );
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="meal-dialog-heading">
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          aria-label="Fechar painel"
          disabled={busy}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <div className="meal-dialog-content">{children}</div>
    </dialog>
  );
}
