import { useEffect, useRef } from "react";
export function useDialogFocus(active: boolean, onEscape: () => void) {
  const callback = useRef(onEscape);
  callback.current = onEscape;
  useEffect(() => {
    if (!active) return;
    const before = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    if (!dialog) return;
    const selector =
      "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]";
    const first = dialog.querySelector<HTMLElement>(selector);
    first?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        callback.current();
      }
      if (event.key === "Tab") {
        const controls = [
          ...dialog.querySelectorAll<HTMLElement>(selector),
        ].filter((e) => e.offsetParent !== null);
        const first = controls[0],
          last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      before?.focus();
    };
  }, [active]);
}
