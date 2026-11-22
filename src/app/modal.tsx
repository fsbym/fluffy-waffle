"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** 通用弹窗：原生 <dialog>，Esc 和点击「取消」都会关闭。表单样式统一在这里。 */
export default function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog ref={ref} className={`modal ${wide ? "wide" : ""}`} onClose={onClose} aria-label={title}>
      <div className="head">
        <h2>{title}</h2>
        <button type="button" className="x" onClick={onClose} aria-label="关闭">×</button>
      </div>
      <div className="body">{children}</div>
      <style jsx>{`
        .modal { width: min(480px, calc(100vw - 28px)); max-height: calc(100dvh - 28px); margin: auto; padding: 0; border: 0; border-radius: 18px; background: #fff; color: var(--ink); box-shadow: 0 24px 60px rgba(var(--shadow), .25); }
        .modal.wide { width: min(760px, calc(100vw - 28px)); }
        .modal::backdrop { background: rgba(var(--shadow), .45); }
        .head { position: sticky; top: 0; z-index: 1; display: flex; justify-content: space-between; align-items: center; padding: 18px 22px 10px; background: #fff; }
        h2 { margin: 0; font-size: 18px; }
        .x { width: 32px; height: 32px; border: 0; border-radius: 8px; background: var(--surface-2); color: var(--ink-2); font-size: 20px; cursor: pointer; }
        .body { padding: 4px 22px 22px; }
        .modal :global(form), .modal :global(.stack) { display: flex; flex-direction: column; gap: 12px; }
        .modal :global(.hint) { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.5; }
        .modal :global(label) { display: flex; flex-direction: column; gap: 5px; color: var(--ink-2); font-size: 12px; }
        .modal :global(input:not([type=file]):not([type=radio])), .modal :global(select), .modal :global(textarea) { padding: 9px 11px; border: 1px solid var(--line); border-radius: 10px; background: var(--bg); color: var(--ink); font-size: 14px; }
        .modal :global(input:focus), .modal :global(select:focus), .modal :global(textarea:focus) { outline: 2px solid var(--brand); border-color: var(--brand); }
        .modal :global(.choices) { display: flex; flex-wrap: wrap; gap: 8px; }
        .modal :global(.choices label) { flex-direction: row; align-items: center; gap: 6px; padding: 8px 12px; border: 1px solid var(--line); border-radius: 10px; color: var(--ink); font-size: 13px; cursor: pointer; }
        .modal :global(.choices label:has(input:checked)) { border-color: var(--brand); background: var(--accent-soft); }
        .modal :global(.row) { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .modal :global(.error) { margin: 0; padding: 9px 11px; border-radius: 10px; background: var(--brand-soft); color: var(--brand-text); font-size: 13px; }
        .modal :global(.success) { margin: 0; padding: 12px; border-radius: 10px; background: var(--accent); color: var(--ink); font-size: 14px; line-height: 1.6; }
        .modal :global(.actions) { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
        .modal :global(.actions button), .modal :global(button.btn) { height: 38px; padding: 0 16px; border: 1px solid var(--line); border-radius: 10px; background: #fff; color: var(--ink-2); font-size: 13px; cursor: pointer; }
        .modal :global(button.primary) { border-color: var(--brand); background: var(--brand); color: #fff; font-weight: 700; }
        .modal :global(button:disabled) { opacity: .6; cursor: default; }
        @media (max-width: 480px) { .modal :global(.row) { grid-template-columns: 1fr; } }
      `}</style>
    </dialog>
  );
}
