use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use dirs::home_dir;

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
    name: Option<String>, // Optional display name from frontend
    data: String, // JSON string from frontend
) -> Result<String, String> {
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    // Parse the JSON string to get the content
    let content: serde_json::Value = serde_json::from_str(&data)
        .map_err(|e| format!("Failed to parse data: {}", e))?;

    // Use provided name, or try to extract from content, or default to platform_id
    let name = name.unwrap_or_else(|| {
        content
            .get("platform")
            .and_then(|v| v.as_str())
            .unwrap_or(&platform_id)
            .to_string()
    });

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

/// Saved run info for loading history
#[derive(Debug, Serialize, Deserialize)]
pub struct SavedRun {
    pub id: String,
    #[serde(rename = "platformId")]
    pub platform_id: String,
    pub filename: String,
    pub company: String,
    pub name: String,
    #[serde(rename = "startDate")]
    pub start_date: String,
    #[serde(rename = "endDate")]
    pub end_date: Option<String>,
    pub status: String,
    #[serde(rename = "exportPath")]
    pub export_path: Option<String>,
    #[serde(rename = "itemsExported")]
    pub items_exported: Option<i64>,
    #[serde(rename = "itemLabel")]
    pub item_label: Option<String>,
}

/// Load all runs from the exported_data directory
#[tauri::command]
pub async fn load_runs(app: AppHandle) -> Result<Vec<SavedRun>, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?
        .join("exported_data");

    if !data_dir.exists() {
        return Ok(Vec::new());
    }

    let mut runs = Vec::new();

    // Walk through company directories
    for company_entry in fs::read_dir(&data_dir).map_err(|e| e.to_string())?.flatten() {
        if !company_entry.path().is_dir() {
            continue;
        }
        let company = company_entry.file_name().to_string_lossy().to_string();

        // Walk through platform directories
        for platform_entry in fs::read_dir(company_entry.path()).map_err(|e| e.to_string())?.flatten() {
            if !platform_entry.path().is_dir() {
                continue;
            }
            let platform_name = platform_entry.file_name().to_string_lossy().to_string();

            // Walk through run directories
            for run_entry in fs::read_dir(platform_entry.path()).map_err(|e| e.to_string())?.flatten() {
                if !run_entry.path().is_dir() {
                    continue;
                }
                let run_id = run_entry.file_name().to_string_lossy().to_string();
                let run_path = run_entry.path();

                // Find JSON files in the run directory
                let mut latest_json: Option<(PathBuf, u64)> = None;
                for file_entry in fs::read_dir(&run_path).map_err(|e| e.to_string())?.flatten() {
                    let path = file_entry.path();
                    if path.extension().map_or(false, |ext| ext == "json") {
                        // Extract timestamp from filename (format: platformId_timestamp.json)
                        let filename = path.file_stem().unwrap_or_default().to_string_lossy();
                        if let Some(ts_str) = filename.split('_').last() {
                            if let Ok(ts) = ts_str.parse::<u64>() {
                                if latest_json.as_ref().map_or(true, |(_, prev_ts)| ts > *prev_ts) {
                                    latest_json = Some((path.clone(), ts));
                                }
                            }
                        }
                    }
                }

                if let Some((json_path, timestamp)) = latest_json {
                    // Read the JSON file to get more details
                    if let Ok(content) = fs::read_to_string(&json_path) {
                        if let Ok(data) = serde_json::from_str::<serde_json::Value>(&content) {
                            // Extract items count and label from the content
                            // Handle both direct content and nested content.data structures
                            let content = data.get("content");
                            let content_data = content.and_then(|c| c.get("data"));

                            // Try exportSummary at content.exportSummary or content.data.exportSummary
                            let export_summary = content.and_then(|c| c.get("exportSummary"))
                                .or_else(|| content_data.and_then(|d| d.get("exportSummary")));

                            let items_exported = export_summary
                                .and_then(|s| s.get("count").and_then(|v| v.as_i64()))
                                .or_else(|| {
                                    // Try content level first, then content.data level
                                    let sources = [content, content_data];
                                    for src in sources.iter().flatten() {
                                        let count = src.get("totalConversations").and_then(|v| v.as_i64())
                                            .or_else(|| src.get("totalPosts").and_then(|v| v.as_i64()))
                                            .or_else(|| src.get("conversations").and_then(|v| v.as_array()).map(|a| a.len() as i64))
                                            .or_else(|| src.get("posts").and_then(|v| v.as_array()).map(|a| a.len() as i64))
                                            .or_else(|| src.get("memories").and_then(|v| v.as_array()).map(|a| a.len() as i64))
                                            .or_else(|| src.get("media_count").and_then(|v| v.as_i64()));
                                        if count.is_some() {
                                            return count;
                                        }
                                    }
                                    None
                                });

                            // Determine label based on platform/content type
                            let item_label = export_summary
                                .and_then(|s| s.get("label").and_then(|v| v.as_str()).map(|s| s.to_string()))
                                .or_else(|| {
                                    // Infer label from content type - check both levels
                                    let sources = [content, content_data];
                                    for src in sources.iter().flatten() {
                                        if src.get("posts").is_some() || src.get("media_count").is_some() {
                                            return Some("posts".to_string());
                                        } else if src.get("conversations").is_some() {
                                            return Some("conversations".to_string());
                                        } else if src.get("memories").is_some() {
                                            return Some("memories".to_string());
                                        }
                                    }
                                    None
                                });

                            // Extract display name from JSON, fallback to directory name
                            let display_name = data
                                .get("name")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string())
                                .unwrap_or_else(|| platform_name.clone());

                            // Convert timestamp to ISO date string
                            let start_date = chrono::DateTime::from_timestamp(timestamp as i64, 0)
                                .map(|dt| dt.format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string())
                                .unwrap_or_else(|| chrono::Utc::now().to_rfc3339());

                            runs.push(SavedRun {
                                id: run_id.clone(),
                                platform_id: platform_name.clone(),
                                filename: platform_name.clone(),
                                company: company.clone(),
                                name: display_name,
                                start_date: start_date.clone(),
                                end_date: Some(start_date),
                                status: "success".to_string(),
                                export_path: Some(run_path.to_string_lossy().to_string()),
                                items_exported,
                                item_label,
                            });
                        }
                    }
                }
            }
        }
    }

    // Sort by timestamp (most recent first)
    runs.sort_by(|a, b| b.start_date.cmp(&a.start_date));

    log::info!("Loaded {} runs from disk", runs.len());
    Ok(runs)
}

/// Load detailed export data for a specific run (conversations, posts, etc.)
#[tauri::command]
pub async fn load_run_export_data(_run_id: String, export_path: String) -> Result<serde_json::Value, String> {
    let run_path = PathBuf::from(&export_path);

    if !run_path.exists() {
        return Err("Run path does not exist".to_string());
    }

    // Find the latest JSON file in the run directory
    let mut latest_json: Option<PathBuf> = None;
    let mut latest_timestamp: Option<u64> = None;

    if let Ok(entries) = fs::read_dir(&run_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map_or(false, |ext| ext == "json") {
                // Extract timestamp from filename (format: platformId_timestamp.json)
                let filename = path.file_stem().unwrap_or_default().to_string_lossy();
                if let Some(ts_str) = filename.split('_').last() {
                    if let Ok(ts) = ts_str.parse::<u64>() {
                        if latest_timestamp.is_none() || ts > latest_timestamp.unwrap() {
                            latest_json = Some(path);
                            latest_timestamp = Some(ts);
                        }
                    }
                }
            }
        }
    }

    if let Some(json_path) = latest_json {
        if let Ok(content) = fs::read_to_string(&json_path) {
            if let Ok(data) = serde_json::from_str::<serde_json::Value>(&content) {
                // Extract the content field which contains the actual export data
                if let Some(content) = data.get("content") {
                    return Ok(content.clone());
                }
                // If no content field, return the whole data
                return Ok(data);
            }
        }
    }

    Err("Failed to load export data".to_string())
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

/// App configuration structure
#[derive(Debug, Serialize, Deserialize)]
pub struct AppConfig {
    #[serde(rename = "storageProvider")]
    pub storage_provider: Option<String>,
    #[serde(rename = "serverMode")]
    pub server_mode: Option<String>,
    #[serde(rename = "selfHostedUrl")]
    pub self_hosted_url: Option<String>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            storage_provider: Some("local".to_string()),
            server_mode: Some("cloud".to_string()),
            self_hosted_url: None,
        }
    }
}

/// Get the path to the DataBridge config file (~/.databridge/config.json)
fn get_config_path() -> Result<PathBuf, String> {
    let home = home_dir().ok_or("Failed to get home directory")?;
    let config_dir = home.join(".databridge");
    Ok(config_dir.join("config.json"))
}

/// Get app configuration from ~/.databridge/config.json
#[tauri::command]
pub async fn get_app_config() -> Result<AppConfig, String> {
    let config_path = get_config_path()?;

    if !config_path.exists() {
        // Return default config if file doesn't exist
        return Ok(AppConfig::default());
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse config file: {}", e))
}

/// Set app configuration to ~/.databridge/config.json
#[tauri::command]
pub async fn set_app_config(config: AppConfig) -> Result<(), String> {
    let config_path = get_config_path()?;

    // Ensure the .databridge directory exists
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    let json = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&config_path, json)
        .map_err(|e| format!("Failed to write config file: {}", e))?;

    log::info!("App config saved to: {:?}", config_path);
    Ok(())
}
