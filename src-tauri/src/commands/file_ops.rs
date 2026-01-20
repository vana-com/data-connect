use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize, Deserialize)]
pub struct FileInfo {
    pub name: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RunData {
    pub company: String,
    pub name: String,
    #[serde(rename = "runID")]
    pub run_id: String,
    pub timestamp: u64,
    pub content: serde_json::Value,
}

/// Get all JSON files from an export path
#[tauri::command]
pub async fn get_run_files(export_path: String) -> Result<Vec<FileInfo>, String> {
    let path = PathBuf::from(&export_path);

    if !path.exists() {
        return Err("Export path does not exist".to_string());
    }

    let mut files = Vec::new();

    fn read_files_recursive(dir: &PathBuf, files: &mut Vec<FileInfo>) {
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    read_files_recursive(&path, files);
                } else if path.extension().map_or(false, |ext| ext == "json") {
                    if let Ok(content) = fs::read_to_string(&path) {
                        files.push(FileInfo {
                            name: path
                                .file_name()
                                .unwrap_or_default()
                                .to_string_lossy()
                                .to_string(),
                            content,
                        });
                    }
                }
            }
        }
    }

    read_files_recursive(&path, &mut files);

    Ok(files)
}

/// Write export data to a JSON file
#[tauri::command]
pub async fn write_export_data(
    app: AppHandle,
    run_id: String,
    platform_id: String,
    company: String,
    data: String, // JSON string from frontend
) -> Result<String, String> {
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    // Parse the JSON string to get the content
    let content: serde_json::Value = serde_json::from_str(&data)
        .map_err(|e| format!("Failed to parse data: {}", e))?;

    // Try to extract name from the content, default to platform_id
    let name = content
        .get("platform")
        .and_then(|v| v.as_str())
        .unwrap_or(&platform_id)
        .to_string();

    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?
        .join("exported_data")
        .join(&company)
        .join(&name)
        .join(&run_id);

    fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Failed to create export directory: {}", e))?;

    let file_path = data_dir.join(format!("{}_{}.json", platform_id, timestamp));

    let export_data = RunData {
        company,
        name,
        run_id,
        timestamp,
        content,
    };

    let json = serde_json::to_string_pretty(&export_data)
        .map_err(|e| format!("Failed to serialize data: {}", e))?;

    fs::write(&file_path, &json).map_err(|e| format!("Failed to write file: {}", e))?;

    log::info!("Export data saved to: {:?}", file_path);

    Ok(file_path.to_string_lossy().to_string())
}

/// Open the platform export folder
#[tauri::command]
pub async fn open_platform_export_folder(
    app: AppHandle,
    company: String,
    name: String,
) -> Result<(), String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?
        .join("exported_data")
        .join(&company)
        .join(&name);

    if !data_dir.exists() {
        return Err("Export folder does not exist".to_string());
    }

    super::download::open_folder(data_dir.to_string_lossy().to_string()).await
}
