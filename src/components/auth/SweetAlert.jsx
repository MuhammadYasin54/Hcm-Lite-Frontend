"use client";

export default function SweetAlert({ icon = "success", title, text, confirmText = "Continue", cancelText, onConfirm, onCancel }) {
  if (!title) return null;
  return (
    <div className="sweet-alert-backdrop" role="presentation">
      <section className="sweet-alert-dialog" role="alertdialog" aria-modal="true" aria-labelledby="sweet-alert-title" aria-describedby="sweet-alert-text">
        <div className={`sweet-alert-icon sweet-alert-${icon}`} aria-hidden="true">{icon === "success" ? "✓" : "!"}</div>
        <h2 id="sweet-alert-title">{title}</h2>
        <p id="sweet-alert-text">{text}</p>
        <div className="sweet-alert-actions">
          {cancelText ? <button type="button" className="sweet-alert-cancel" onClick={onCancel}>{cancelText}</button> : null}
          <button type="button" className="sweet-alert-confirm" onClick={onConfirm}>{confirmText}</button>
        </div>
      </section>
    </div>
  );
}
