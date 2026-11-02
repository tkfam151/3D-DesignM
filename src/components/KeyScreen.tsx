import { useState } from "react";
import { verifyKey } from "../lib/claude";

interface Props {
  onSaved: (key: string) => Promise<void>;
  onCancel?: () => void;
  onRemove?: () => Promise<void>;
}

export default function KeyScreen({ onSaved, onCancel, onRemove }: Props) {
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    const problem = await verifyKey(trimmed);
    if (problem) {
      setError(problem);
      setBusy(false);
      return;
    }
    await onSaved(trimmed);
    setBusy(false);
  }

  return (
    <div className="key-screen">
      <form className="key-card" onSubmit={submit}>
        <div className="brand-mark" aria-hidden>
          <svg viewBox="0 0 48 48" width="48" height="48">
            <path d="M24 4 42 14v20L24 44 6 34V14z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
            <path d="M6 14l18 10 18-10M24 24v20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
          </svg>
        </div>
        <h1>Welcome to Shapesmith</h1>
        <p className="muted">
          Describe an object, refine it in conversation, and download it as a 3D model.
          Shapesmith uses your own Claude API key.
        </p>

        <label htmlFor="api-key">Claude API key</label>
        <div className="key-input">
          <input
            id="api-key"
            type={show ? "text" : "password"}
            placeholder="sk-ant-…"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            disabled={busy}
            autoFocus
          />
          <button type="button" className="ghost small" onClick={() => setShow((s) => !s)}>
            {show ? "Hide" : "Show"}
          </button>
        </div>
        {error && <p className="error">{error}</p>}

        <button className="primary" type="submit" disabled={busy || !key.trim()}>
          {busy ? "Checking key…" : "Save key and start"}
        </button>

        <p className="fine">
          Get a key at <strong>console.anthropic.com</strong> → API Keys. Your key is stored
          only on this device in its secure storage and is sent only to Anthropic.
        </p>

        {(onCancel || onRemove) && (
          <div className="row">
            {onRemove && (
              <button type="button" className="ghost danger" onClick={onRemove} disabled={busy}>
                Remove saved key
              </button>
            )}
            {onCancel && (
              <button type="button" className="ghost" onClick={onCancel} disabled={busy}>
                Cancel
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
