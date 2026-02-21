use crate::processors;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::Write;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DownloadProgress {
    pub run_id: String,
    pub filename: String,
    pub percent: f64,
    pub bytes_downloaded: u64,
    pub total_bytes: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExportComplete {
    pub company: String,
    pub name: String,
    pub run_id: String,
    pub export_path: String,
    pub export_size: u64,
}

/// Download a file from a URL and process it
#[tauri::command]
pub async fn handle_download(
    app: AppHandle,
    run_id: String,
    url: String,
    platform_id: String,
    company: String,
    name: String,
) -> Result<ExportComplete, String> {
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();

    // Create the export directory
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?
        .join("exported_data")
        .join(&company)
        .join(&name)
        .join(format!("{}-{}", platform_id, timestamp));

    fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Failed to create export directory: {}", e))?;

    // Download the file
    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to download: {}", e))?;

    let total_size = response.content_length();
    let filename = get_filename_from_response(&response, &url);

    let file_path = data_dir.join(&filename);
    let mut file =
        File::create(&file_path).map_err(|e| format!("Failed to create file: {}", e))?;

    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Failed to read chunk: {}", e))?;
        file.write_all(&chunk)
            .map_err(|e| format!("Failed to write chunk: {}", e))?;

        downloaded += chunk.len() as u64;

        let percent = total_size.map_or(0.0, |total| (downloaded as f64 / total as f64) * 100.0);

        // Emit progress
        let _ = app.emit(
            "download-progress",
            DownloadProgress {
                run_id: run_id.clone(),
                filename: filename.clone(),
                percent,
                bytes_downloaded: downloaded,
                total_bytes: total_size,
            },
        );
    }

    drop(file);

    // Process the downloaded file
    let extract_path = data_dir.join("extracted");
    fs::create_dir_all(&extract_path)
        .map_err(|e| format!("Failed to create extract directory: {}", e))?;

    // Extract if it's a ZIP file
    if filename.to_lowercase().ends_with(".zip") {
        processors::zip::extract_zip(&file_path, &extract_path)?;

        // Check for nested ZIP files and extract them
        for entry in walkdir::WalkDir::new(&extract_path).max_depth(1) {
            if let Ok(entry) = entry {
                if entry.path().extension().map_or(false, |ext| ext == "zip") {
                    processors::zip::extract_zip(entry.path(), &extract_path)?;
                    fs::remove_file(entry.path()).ok();
                }
            }
        }

        // Delete the original ZIP
        fs::remove_file(&file_path).ok();

        // Process based on platform
        if url.contains("proddatamgmtqueue.blob.core.windows.net")
            || url.contains("chatgpt.com/backend-api/content")
        {
            processors::chatgpt::parse_conversations(&extract_path, &platform_id, timestamp)?;
        }
    }

    // Calculate total folder size
    let export_size = get_folder_size(&data_dir);

    let result = ExportComplete {
        company: company.clone(),
        name: name.clone(),
        run_id: run_id.clone(),
        export_path: extract_path.to_string_lossy().to_string(),
        export_size,
    };

    // Emit export complete on the rust-specific channel to avoid payload-shape
    // collisions with connector-runtime "export-complete" events.
    let _ = app.emit("export-complete-rust", result.clone());

    Ok(result)
}

/// Get filename from response headers or URL
fn get_filename_from_response(response: &reqwest::Response, url: &str) -> String {
    // Try Content-Disposition header first
    if let Some(cd) = response.headers().get("content-disposition") {
        if let Ok(cd_str) = cd.to_str() {
            if let Some(start) = cd_str.find("filename=") {
                let name = &cd_str[start + 9..];
                let name = name.trim_matches('"').trim_matches('\'');
                if !name.is_empty() {
                    return name.to_string();
                }
            }
        }
    }

    // Fall back to URL path
    url.split('/')
        .last()
        .and_then(|s| s.split('?').next())
        .unwrap_or("download.zip")
        .to_string()
}

/// Calculate the total size of a folder
fn get_folder_size(path: &PathBuf) -> u64 {
    let mut size = 0;

    for entry in walkdir::WalkDir::new(path) {
        if let Ok(entry) = entry {
            if entry.file_type().is_file() {
                size += entry.metadata().map(|m| m.len()).unwrap_or(0);
            }
        }
    }

    size
}

/// Open a folder in the system file manager
#[tauri::command]
pub async fn open_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    Ok(())
}
