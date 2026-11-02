//! Native side of Shapesmith: secure storage for the user's Claude API key and
//! file saving. Everything else (chat, 3D rendering, export) lives in the web UI.

use std::path::PathBuf;

use tauri::Manager;

#[cfg(not(target_os = "android"))]
mod secret {
    const SERVICE: &str = "com.shapesmith.app";
    const ACCOUNT: &str = "anthropic-api-key";

    fn entry() -> Result<keyring::Entry, String> {
        keyring::Entry::new(SERVICE, ACCOUNT).map_err(|e| e.to_string())
    }

    pub fn get(_app: &tauri::AppHandle) -> Result<Option<String>, String> {
        match entry()?.get_password() {
            Ok(key) => Ok(Some(key)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    pub fn set(_app: &tauri::AppHandle, key: &str) -> Result<(), String> {
        entry()?.set_password(key).map_err(|e| e.to_string())
    }

    pub fn delete(_app: &tauri::AppHandle) -> Result<(), String> {
        match entry()?.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(e.to_string()),
        }
    }
}

/// Android: the key is written to the app's private data directory, which only
/// this app can read (Android sandboxes each app's internal storage).
#[cfg(target_os = "android")]
mod secret {
    use tauri::Manager;

    fn path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
        let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        Ok(dir.join("api_key"))
    }

    pub fn get(app: &tauri::AppHandle) -> Result<Option<String>, String> {
        match std::fs::read_to_string(path(app)?) {
            Ok(key) => Ok(Some(key)),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    pub fn set(app: &tauri::AppHandle, key: &str) -> Result<(), String> {
        std::fs::write(path(app)?, key).map_err(|e| e.to_string())
    }

    pub fn delete(app: &tauri::AppHandle) -> Result<(), String> {
        match std::fs::remove_file(path(app)?) {
            Ok(()) => Ok(()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(e) => Err(e.to_string()),
        }
    }
}

#[tauri::command]
fn get_api_key(app: tauri::AppHandle) -> Result<Option<String>, String> {
    secret::get(&app)
}

#[tauri::command]
fn set_api_key(app: tauri::AppHandle, key: String) -> Result<(), String> {
    secret::set(&app, key.trim())
}

#[tauri::command]
fn delete_api_key(app: tauri::AppHandle) -> Result<(), String> {
    secret::delete(&app)
}

/// Fallback save used when no native "Save as" dialog is available (mobile):
/// writes into the app's Documents folder and returns the full path.
/// On iOS this folder is visible in the Files app under "On My iPhone > Shapesmith".
#[tauri::command]
fn save_to_documents(app: tauri::AppHandle, file_name: String, bytes: Vec<u8>) -> Result<String, String> {
    let safe: String = file_name
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '.' || c == '-' || c == '_' { c } else { '_' })
        .collect();
    let dir: PathBuf = app
        .path()
        .document_dir()
        .or_else(|_| app.path().app_data_dir())
        .map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join(safe);
    std::fs::write(&path, bytes).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().into_owned())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            get_api_key,
            set_api_key,
            delete_api_key,
            save_to_documents
        ])
        .run(tauri::generate_context!())
        .expect("error while running Shapesmith");
}
