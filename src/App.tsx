import { useEffect, useMemo, useRef, useState } from "react";
import type * as THREE from "three";
import KeyScreen from "./components/KeyScreen";
import Viewer from "./components/Viewer";
import { createClient, describeError, runTurn, type History } from "./lib/claude";
import { buildDesign, type Design } from "./lib/design";
import { exportModel, fileNameFor, FORMATS, type ExportFormat } from "./lib/exporters";
import { deleteApiKey, loadApiKey, saveApiKey, saveFile } from "./lib/platform";
import "./styles.css";

interface ChatMessage {
  role: "user" | "assistant" | "error";
  text: string;
}

const STARTERS = [
  "A coffee mug with a hexagon pattern",
  "A minimalist desk phone stand",
  "A low-poly table lamp",
  "A small planter with a drainage hole",
];

export default function App() {
  const [apiKey, setApiKey] = useState<string | null | undefined>(undefined);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadApiKey()
      .then(setApiKey)
      .catch(() => setApiKey(null));
  }, []);

  if (apiKey === undefined) return <div className="splash">Loading…</div>;

  if (!apiKey || showSettings) {
    return (
      <KeyScreen
        onSaved={async (key) => {
          await saveApiKey(key);
          setApiKey(key);
          setShowSettings(false);
        }}
        onCancel={apiKey ? () => setShowSettings(false) : undefined}
        onRemove={
          apiKey
            ? async () => {
                await deleteApiKey();
                setApiKey(null);
                setShowSettings(false);
              }
            : undefined
        }
      />
    );
  }

  return <Studio apiKey={apiKey} onOpenSettings={() => setShowSettings(true)} />;
}

function Studio({ apiKey, onOpenSettings }: { apiKey: string; onOpenSettings: () => void }) {
  const client = useMemo(() => createClient(apiKey), [apiKey]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<History>([]);
  const [design, setDesign] = useState<Design | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>(STARTERS);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const listEnd = useRef<HTMLDivElement>(null);

  const model: THREE.Group | null = useMemo(() => {
    if (!design) return null;
    try {
      return buildDesign(design);
    } catch (err) {
      console.error(err);
      return null;
    }
  }, [design]);

  useEffect(() => {
    listEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, progress]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  async function send(text: string) {
    const prompt = text.trim();
    if (!prompt || busy) return;
    setInput("");
    setBusy(true);
    setProgress("Thinking about your design…");
    setMessages((m) => [...m, { role: "user", text: prompt }]);
    const nextHistory: History = [...history, { role: "user", content: prompt }];
    const controller = new AbortController();
    abort.current = controller;

    try {
      const { response, assistant } = await runTurn(
        client,
        nextHistory,
        (p) => setProgress(lastLines(p)),
        controller.signal,
      );
      setHistory([...nextHistory, assistant]);
      setDesign(response.design);
      setSuggestions(response.suggestions.slice(0, 4));
      setMessages((m) => [...m, { role: "assistant", text: response.reply }]);
    } catch (err) {
      // Leave history unchanged so the user can simply try again.
      const aborted = controller.signal.aborted;
      setMessages((m) => [
        ...m,
        { role: "error", text: aborted ? "Stopped." : describeError(err) },
      ]);
    } finally {
      setBusy(false);
      setProgress("");
      abort.current = null;
    }
  }

  function startOver() {
    abort.current?.abort();
    setMessages([]);
    setHistory([]);
    setDesign(null);
    setSuggestions(STARTERS);
  }

  async function download(format: ExportFormat) {
    setMenuOpen(false);
    if (!model || !design) return;
    try {
      const bytes = await exportModel(model, format);
      const info = FORMATS.find((f) => f.id === format)!;
      const where = await saveFile(fileNameFor(design.name, format), bytes, {
        name: info.label,
        extensions: [format],
      });
      if (where) setNotice(where);
    } catch (err) {
      setNotice(`Couldn't save the file: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return (
    <div className="studio">
      <header className="topbar">
        <div className="brand">
          <svg viewBox="0 0 48 48" width="22" height="22" aria-hidden>
            <path d="M24 4 42 14v20L24 44 6 34V14z M6 14l18 10 18-10M24 24v20" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
          </svg>
          <span>Shapesmith</span>
        </div>
        <div className="title" title={design?.description}>
          {design?.name ?? "New design"}
        </div>
        <div className="actions">
          <button className="ghost" onClick={startOver} disabled={!messages.length}>
            New
          </button>
          <div className="menu-wrap">
            <button className="primary" disabled={!model || busy} onClick={() => setMenuOpen((o) => !o)}>
              Download
            </button>
            {menuOpen && (
              <div className="menu" role="menu">
                {FORMATS.map((f) => (
                  <button key={f.id} role="menuitem" onClick={() => download(f.id)}>
                    <strong>{f.label}</strong>
                    <span>{f.hint}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="ghost icon" onClick={onOpenSettings} aria-label="API key settings" title="API key settings">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
              <path d="M7 14a4 4 0 1 1 3.9-5H21v3h-2v3h-3v-3h-5.1A4 4 0 0 1 7 14zm0-2.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" fill="currentColor" />
            </svg>
          </button>
        </div>
      </header>

      <main className="workspace">
        <section className="stage">
          <Viewer object={model} />
          {!model && !busy && (
            <div className="empty">
              <p>Describe something to make. Your 3D model appears here.</p>
            </div>
          )}
          {busy && (
            <div className="working">
              <span className="spinner" aria-hidden />
              {design ? "Updating the model…" : "Designing…"}
            </div>
          )}
          {model && <div className="hint">Drag to rotate · scroll or pinch to zoom · units: mm</div>}
        </section>

        <section className="chat">
          <div className="messages">
            {messages.length === 0 && (
              <div className="intro">
                <h2>What would you like to make?</h2>
                <p className="muted">
                  Describe an object in plain words. Then ask for changes like “make it taller”
                  or “add a hole for a cable”.
                </p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`bubble ${m.role}`}>
                {m.text}
              </div>
            ))}
            {busy && progress && <div className="bubble progress">{progress}</div>}
            <div ref={listEnd} />
          </div>

          {!busy && suggestions.length > 0 && (
            <div className="chips">
              {suggestions.map((s) => (
                <button key={s} className="chip" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <textarea
              rows={2}
              placeholder={design ? "Ask for a change…" : "Describe a 3D object…"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              disabled={busy}
            />
            {busy ? (
              <button type="button" className="ghost" onClick={() => abort.current?.abort()}>
                Stop
              </button>
            ) : (
              <button type="submit" className="primary" disabled={!input.trim()}>
                Send
              </button>
            )}
          </form>
        </section>
      </main>

      {notice && <div className="toast">{notice}</div>}
    </div>
  );
}

/** Keep the progress bubble short: show the tail of Claude's reasoning summary. */
function lastLines(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > 280 ? "…" + trimmed.slice(-280) : trimmed;
}
