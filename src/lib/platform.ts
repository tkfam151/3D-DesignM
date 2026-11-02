/**
 * Platform helpers: API key storage and file saving.
 * Inside the Tauri app these go through native code (Keychain / Credential Manager /
 * Android private storage, native Save dialog). In a plain browser (`npm run dev`)
 * they fall back to localStorage and a normal download.
 */
import { invoke, isTauri } from "@tauri-apps/api/core";

const LOCAL_KEY = "shapesmith.apiKey";

export async function loadApiKey(): Promise<string | null> {
  if (isTauri()) return (await invoke<string | null>("get_api_key")) ?? null;
  try {
    return localStorage.getItem(LOCAL_KEY);
  } catch {
    return null;
  }
}

export async function saveApiKey(key: string): Promise<void> {
  if (isTauri()) return invoke("set_api_key", { key });
  try {
    localStorage.setItem(LOCAL_KEY, key);
  } catch {
    /* storage unavailable: key lives only for this session */
  }
}

export async function deleteApiKey(): Promise<void> {
  if (isTauri()) return invoke("delete_api_key");
  try {
    localStorage.removeItem(LOCAL_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Saves a file. Returns a human-readable description of where it went,
 * or null if the user cancelled.
 */
export async function saveFile(
  fileName: string,
  bytes: Uint8Array,
  filter: { name: string; extensions: string[] },
): Promise<string | null> {
  if (!isTauri()) {
    const blob = new Blob([bytes as BlobPart], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return `Downloaded ${fileName}`;
  }

  const { save } = await import("@tauri-apps/plugin-dialog");
  const { writeFile } = await import("@tauri-apps/plugin-fs");
  try {
    const path = await save({ defaultPath: fileName, filters: [filter] });
    if (!path) return null;
    await writeFile(path, bytes);
    return `Saved to ${path}`;
  } catch (err) {
    // Some mobile systems have no Save dialog: write to the app's Documents folder instead.
    console.warn("Save dialog unavailable, saving to Documents", err);
    const path = await invoke<string>("save_to_documents", {
      fileName,
      bytes: Array.from(bytes),
    });
    return `Saved to ${path}`;
  }
}
