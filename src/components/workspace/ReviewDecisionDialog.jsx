"use client";

export default function ReviewDecisionDialog({ request, comment, onCommentChange, onClose, onDecision, busy, error }) {
  if (!request) return null;
  const isLeave = request.reviewKind === "leave-hr";
  const employee = request.employeeName || "Employee request";
  const dateRange = [request.startDate, request.endDate].filter(Boolean).join(" - ") || request.date || "";

  return (
    <div className="review-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section className="review-dialog" role="dialog" aria-modal="true" aria-labelledby="review-dialog-title">
        <div className="review-dialog-heading">
          <span className="review-dialog-icon" aria-hidden="true">✓</span>
          <button type="button" className="review-dialog-close" onClick={onClose} disabled={busy} aria-label="Close review dialog">×</button>
          <span className="review-dialog-kicker">REQUEST REVIEW</span>
          <h2 id="review-dialog-title">{isLeave ? "Review leave request" : "Review attendance correction"}</h2>
          <p>Write a short comment, then choose Approve or Reject.</p>
        </div>
        <div className="review-request-summary">
          <div><span>EMPLOYEE</span><strong>{employee}</strong></div>
          {request.type ? <div><span>LEAVE TYPE</span><strong>{request.type}</strong></div> : null}
          {dateRange ? <div><span>DATES</span><strong>{dateRange}</strong></div> : null}
          {request.days !== undefined ? <div><span>DURATION</span><strong>{request.days} {Number(request.days) === 1 ? "day" : "days"}</strong></div> : null}
          {request.reason ? <div className="review-request-reason"><span>EMPLOYEE REASON</span><strong>{request.reason}</strong></div> : null}
        </div>
        <label className="review-comment-label" htmlFor="review-decision-comment">Review comment <span>Required</span></label>
        <textarea id="review-decision-comment" value={comment} onChange={(event) => onCommentChange(event.target.value)} placeholder="Add a brief reason or note for the employee…" rows={3} disabled={busy} autoFocus required aria-required="true" />
        {error ? <p className="review-dialog-error" role="alert">{error}</p> : null}
        <div className="review-dialog-actions">
          <button type="button" className="review-dialog-cancel" onClick={onClose} disabled={busy}>Cancel</button>
          <span className="review-dialog-action-spacer" />
          <button type="button" className="review-dialog-reject" onClick={() => onDecision("rejected")} disabled={busy}>{busy ? "Saving…" : "Reject"}</button>
          <button type="button" className="review-dialog-approve" onClick={() => onDecision("approved")} disabled={busy}>{busy ? "Saving…" : "Approve"}</button>
        </div>
      </section>
    </div>
  );
}
