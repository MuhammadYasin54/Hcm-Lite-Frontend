export function Brand({ dark = false }) {
  return (
    <div className={`brand-mark${dark ? " brand-mark-dark" : ""}`} aria-label="HCM Lite">
      <span className="brand-symbol" aria-hidden="true">H</span>
      <span>
        HCM Lite
        <small>People, made simpler</small>
      </span>
    </div>
  );
}

export default function AuthLayout({ children }) {
  return (
    <main className="auth-page">
      <aside className="auth-story" aria-label="HCM Lite introduction">
        <Brand />
        <div className="story-copy">
          <div className="eyebrow">Saylani Hackathon · HCM Lite</div>
          <h1>People work,<br />in one place.</h1>
          <p>A clear, secure workspace for your people operations, attendance and everyday team support.</p>
          <div className="story-points">
            <div className="story-point"><span className="story-check">✓</span> One workspace for every role</div>
            <div className="story-point"><span className="story-check">✓</span> Your organization’s data, kept in scope</div>
            <div className="story-point"><span className="story-check">✓</span> Helpful AI, grounded in real records</div>
          </div>
        </div>
        <div className="story-footer">
          <span>Human Capital Management</span>
          <span>Admin · HR · Employee</span>
        </div>
      </aside>
      <section className="auth-main">
        <div className="auth-content">
          <div className="auth-mobile-brand"><Brand dark /></div>
          {children}
        </div>
      </section>
    </main>
  );
}

export function FormField({ id, label, type = "text", value, onChange, placeholder, autoComplete, required = true, disabled = false, error, inputMode, minLength, maxLength }) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}</label>
      <input
        className="field-input"
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        inputMode={inputMode}
        minLength={minLength}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error ? <span className="field-error" id={`${id}-error`}>{error}</span> : null}
    </div>
  );
}

export function SubmitButton({ busy, children }) {
  return (
    <button className="primary-button" type="submit" disabled={busy}>
      {busy ? <><span className="loading-dot" aria-hidden="true" /> Please wait…</> : children}
    </button>
  );
}

const passwordChecks = [
  ["At least 12 characters", (value) => value.length >= 12],
  ["One uppercase letter", (value) => /[A-Z]/.test(value)],
  ["One lowercase letter", (value) => /[a-z]/.test(value)],
  ["One number", (value) => /[0-9]/.test(value)],
  ["One symbol", (value) => /[^A-Za-z0-9]/.test(value)],
];

export function isStrongPassword(value) {
  return passwordChecks.every(([, check]) => check(value));
}

export function PasswordRequirements({ value }) {
  return (
    <ul className="password-requirements" id="password-requirements" aria-label="Password requirements">
      {passwordChecks.map(([label, check]) => {
        const met = check(value);
        return <li className={met ? "password-requirement-met" : ""} key={label}><span aria-hidden="true">{met ? "✓" : "•"}</span>{label}</li>;
      })}
    </ul>
  );
}

export function FormAlert({ message, kind = "error" }) {
  if (!message) return null;
  const kindClass = kind === "success" ? "success-note" : kind === "info" ? "info-note" : "error-note";
  return (
    <div className={kindClass} role={kind === "error" ? "alert" : "status"}>
      <span className="note-icon" aria-hidden="true">{kind === "error" ? "!" : kind === "success" ? "✓" : "i"}</span>
      <span>{message}</span>
    </div>
  );
}
