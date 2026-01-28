use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

const DEFAULT_REGISTRY_URL: &str =
    "https://gist.githubusercontent.com/volod-vana/05c0a53d61ef7d0fcd37e63567fafa3f/raw/0a7d3706fb8ad482239d9eedf4474861a99bf424/registry.json";

/// Registry manifest from remote
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Registry {
    pub version: String,
    #[serde(rename = "lastUpdated")]
    pub last_updated: String,
    #[serde(rename = "baseUrl")]
    pub base_url: String,
    pub connectors: Vec<RegistryConnector>,
}

/// Connector entry in the registry
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RegistryConnector {
    pub id: String,
    pub company: String,
    pub version: String,
    pub name: String,
    pub description: String,
    pub files: ConnectorFiles,
    pub checksums: ConnectorChecksums,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConnectorFiles {
    pub script: String,
    pub metadata: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConnectorChecksums {
    pub script: String,
    pub metadata: String,
}

/// Information about available connector updates
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConnectorUpdateInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub company: String,
    #[serde(rename = "currentVersion")]
    pub current_version: Option<String>,
    #[serde(rename = "latestVersion")]
    pub latest_version: String,
    #[serde(rename = "hasUpdate")]
    pub has_update: bool,
    #[serde(rename = "isNew")]
    pub is_new: bool,
}

/// Local connector metadata (read from JSON files)
#[derive(Debug, Serialize, Deserialize)]
struct LocalConnectorMetadata {
    id: Option<String>,
    version: Option<String>,
    name: String,
}

/// Get the user connectors directory (~/.databridge/connectors/)
fn get_user_connectors_dir() -> Option<PathBuf> {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .ok()?;
    Some(PathBuf::from(home).join(".databridge").join("connectors"))
}

/// Get the bundled connectors directory
fn get_bundled_connectors_dir(app: &AppHandle) -> PathBuf {
    // First, try the CARGO_MANIFEST_DIR (only available during cargo run)
    if let Ok(manifest_dir) = std::env::var("CARGO_MANIFEST_DIR") {
        let dev_path = PathBuf::from(&manifest_dir)
            .parent()
            .map(|p| p.join("connectors"))
            .unwrap_or_default();
        if dev_path.exists() {
            return dev_path;
        }
    }

    // Try relative to current directory (for when running from project root)
    let cwd_path = std::env::current_dir()
        .unwrap_or_default()
        .join("connectors");
    if cwd_path.exists() {
        return cwd_path;
    }

    // Try relative to executable location (development fallback)
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(project_root) = exe_path
            .parent()
            .and_then(|p| p.parent())
            .and_then(|p| p.parent())
            .and_then(|p| p.parent())
        {
            let dev_path = project_root.join("connectors");
            if dev_path.exists() {
                return dev_path;
            }
        }
    }

    // Try resource path for bundled app (production)
    let resource_dir = app.path().resource_dir().unwrap_or_default();

    let up_path = resource_dir.join("_up_").join("connectors");
    if up_path.exists() {
        return up_path;
    }

    resource_dir.join("connectors")
}

/// Get version of an installed connector by ID
fn get_installed_connector_version(app: &AppHandle, connector_id: &str, company: &str) -> Option<String> {
    // Check user dir first
    if let Some(user_dir) = get_user_connectors_dir() {
        let metadata_path = user_dir
            .join(company.to_lowercase())
            .join(format!("{}.json", connector_id));
        if let Ok(content) = fs::read_to_string(&metadata_path) {
            if let Ok(metadata) = serde_json::from_str::<LocalConnectorMetadata>(&content) {
                return metadata.version;
            }
        }
    }

    // Check bundled dir
    let bundled_dir = get_bundled_connectors_dir(app);
    let metadata_path = bundled_dir
        .join(company.to_lowercase())
        .join(format!("{}.json", connector_id));
    if let Ok(content) = fs::read_to_string(&metadata_path) {
        if let Ok(metadata) = serde_json::from_str::<LocalConnectorMetadata>(&content) {
            return metadata.version;
        }
    }

    None
}

/// Check if a connector is installed (exists in either user or bundled dir)
fn is_connector_installed(app: &AppHandle, connector_id: &str, company: &str) -> bool {
    // Check user dir first
    if let Some(user_dir) = get_user_connectors_dir() {
        let metadata_path = user_dir
            .join(company.to_lowercase())
            .join(format!("{}.json", connector_id));
        if metadata_path.exists() {
            return true;
        }
    }

    // Check bundled dir
    let bundled_dir = get_bundled_connectors_dir(app);
    let metadata_path = bundled_dir
        .join(company.to_lowercase())
        .join(format!("{}.json", connector_id));
    metadata_path.exists()
}

/// Compare two semantic versions, returns true if v2 > v1
fn is_newer_version(v1: &str, v2: &str) -> bool {
    use semver::Version;

    let ver1 = Version::parse(v1).ok();
    let ver2 = Version::parse(v2).ok();

    match (ver1, ver2) {
        (Some(v1), Some(v2)) => v2 > v1,
        _ => false, // If parsing fails, don't consider it an update
    }
}

/// Calculate SHA256 checksum of a file
fn calculate_checksum(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    let result = hasher.finalize();
    format!("sha256:{:x}", result)
}

/// Verify checksum matches expected value
fn verify_checksum(data: &[u8], expected: &str) -> bool {
    let actual = calculate_checksum(data);
    actual == expected
}

/// Cache path for registry
fn get_registry_cache_path() -> Option<PathBuf> {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .ok()?;
    Some(
        PathBuf::from(home)
            .join(".databridge")
            .join("cache")
            .join("registry.json"),
    )
}

/// Load cached registry if available and not stale
fn load_cached_registry() -> Option<Registry> {
    let cache_path = get_registry_cache_path()?;
    if !cache_path.exists() {
        return None;
    }

    // Check if cache is less than 1 hour old
    let metadata = fs::metadata(&cache_path).ok()?;
    let modified = metadata.modified().ok()?;
    let age = std::time::SystemTime::now()
        .duration_since(modified)
        .ok()?;

    if age.as_secs() > 3600 {
        // Cache is stale (> 1 hour)
        return None;
    }

    let content = fs::read_to_string(&cache_path).ok()?;
    serde_json::from_str(&content).ok()
}

/// Save registry to cache
fn save_registry_cache(registry: &Registry) -> Result<(), String> {
    let cache_path = get_registry_cache_path()
        .ok_or("Could not determine cache path")?;

    // Create cache directory if needed
    if let Some(parent) = cache_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create cache directory: {}", e))?;
    }

    let content = serde_json::to_string_pretty(registry)
        .map_err(|e| format!("Failed to serialize registry: {}", e))?;

    fs::write(&cache_path, content)
        .map_err(|e| format!("Failed to write cache: {}", e))?;

    Ok(())
}

/// Fetch registry from remote
async fn fetch_registry(force: bool) -> Result<Registry, String> {
    // Try cache first unless forced
    if !force {
        if let Some(cached) = load_cached_registry() {
            log::info!("Using cached registry");
            return Ok(cached);
        }
    }

    log::info!("Fetching registry from {}", DEFAULT_REGISTRY_URL);

    let response = reqwest::get(DEFAULT_REGISTRY_URL)
        .await
        .map_err(|e| format!("Failed to fetch registry: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Registry fetch failed with status: {}", response.status()));
    }

    let registry: Registry = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse registry: {}", e))?;

    // Cache the registry
    if let Err(e) = save_registry_cache(&registry) {
        log::warn!("Failed to cache registry: {}", e);
    }

    Ok(registry)
}

/// Check for connector updates
/// Returns a list of connectors that have updates or are new
#[tauri::command]
pub async fn check_connector_updates(
    app: AppHandle,
    force: bool,
) -> Result<Vec<ConnectorUpdateInfo>, String> {
    let registry = fetch_registry(force).await?;
    let mut updates = Vec::new();

    for connector in registry.connectors {
        let is_installed = is_connector_installed(&app, &connector.id, &connector.company);
        let current_version = get_installed_connector_version(&app, &connector.id, &connector.company);

        let has_update = if let Some(ref current) = current_version {
            is_newer_version(current, &connector.version)
        } else {
            false
        };

        let is_new = !is_installed;

        // Only include if there's an update or it's new
        if has_update || is_new {
            updates.push(ConnectorUpdateInfo {
                id: connector.id,
                name: connector.name,
                description: connector.description,
                company: connector.company,
                current_version,
                latest_version: connector.version,
                has_update,
                is_new,
            });
        }
    }

    log::info!("Found {} connector updates", updates.len());
    Ok(updates)
}

/// Download and install a connector
#[tauri::command]
pub async fn download_connector(_app: AppHandle, id: String) -> Result<(), String> {
    // Fetch registry to get connector info
    let registry = fetch_registry(false).await?;

    let connector = registry
        .connectors
        .iter()
        .find(|c| c.id == id)
        .ok_or_else(|| format!("Connector {} not found in registry", id))?;

    log::info!("Downloading connector: {} v{}", connector.id, connector.version);

    // Get user connectors directory
    let user_dir = get_user_connectors_dir()
        .ok_or("Could not determine user connectors directory")?;

    // Create company subdirectory
    let company_dir = user_dir.join(connector.company.to_lowercase());
    fs::create_dir_all(&company_dir)
        .map_err(|e| format!("Failed to create connector directory: {}", e))?;

    // Download script file
    let script_url = format!("{}/{}", registry.base_url, connector.files.script);
    log::info!("Downloading script from: {}", script_url);

    let script_response = reqwest::get(&script_url)
        .await
        .map_err(|e| format!("Failed to download script: {}", e))?;

    if !script_response.status().is_success() {
        return Err(format!("Script download failed with status: {}", script_response.status()));
    }

    let script_bytes = script_response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read script: {}", e))?;

    // Verify script checksum
    if !verify_checksum(&script_bytes, &connector.checksums.script) {
        return Err("Script checksum verification failed".to_string());
    }
    log::info!("Script checksum verified");

    // Download metadata file
    let metadata_url = format!("{}/{}", registry.base_url, connector.files.metadata);
    log::info!("Downloading metadata from: {}", metadata_url);

    let metadata_response = reqwest::get(&metadata_url)
        .await
        .map_err(|e| format!("Failed to download metadata: {}", e))?;

    if !metadata_response.status().is_success() {
        return Err(format!("Metadata download failed with status: {}", metadata_response.status()));
    }

    let metadata_bytes = metadata_response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read metadata: {}", e))?;

    // Verify metadata checksum
    if !verify_checksum(&metadata_bytes, &connector.checksums.metadata) {
        return Err("Metadata checksum verification failed".to_string());
    }
    log::info!("Metadata checksum verified");

    // Extract filename from path
    let script_filename = connector
        .files
        .script
        .split('/')
        .last()
        .ok_or("Invalid script path")?;
    let metadata_filename = connector
        .files
        .metadata
        .split('/')
        .last()
        .ok_or("Invalid metadata path")?;

    // Write files
    let script_path = company_dir.join(script_filename);
    let metadata_path = company_dir.join(metadata_filename);

    fs::write(&script_path, &script_bytes)
        .map_err(|e| format!("Failed to write script: {}", e))?;
    log::info!("Wrote script to: {:?}", script_path);

    fs::write(&metadata_path, &metadata_bytes)
        .map_err(|e| format!("Failed to write metadata: {}", e))?;
    log::info!("Wrote metadata to: {:?}", metadata_path);

    log::info!("Successfully installed connector: {}", id);
    Ok(())
}

/// Get the registry URL (for debugging/display purposes)
#[tauri::command]
pub fn get_registry_url() -> String {
    DEFAULT_REGISTRY_URL.to_string()
}

/// Get all installed connector versions
#[tauri::command]
pub async fn get_installed_connectors(app: AppHandle) -> Result<HashMap<String, String>, String> {
    let mut versions = HashMap::new();

    // Check user directory
    if let Some(user_dir) = get_user_connectors_dir() {
        if user_dir.exists() {
            scan_connectors_dir(&user_dir, &mut versions);
        }
    }

    // Check bundled directory (don't overwrite user versions)
    let bundled_dir = get_bundled_connectors_dir(&app);
    if bundled_dir.exists() {
        scan_connectors_dir_no_overwrite(&bundled_dir, &mut versions);
    }

    Ok(versions)
}

/// Scan a connectors directory and extract versions
fn scan_connectors_dir(dir: &PathBuf, versions: &mut HashMap<String, String>) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                // This is a company directory
                if let Ok(files) = fs::read_dir(&path) {
                    for file in files.flatten() {
                        let file_path = file.path();
                        if file_path.extension().map_or(false, |e| e == "json") {
                            if let Ok(content) = fs::read_to_string(&file_path) {
                                if let Ok(metadata) = serde_json::from_str::<LocalConnectorMetadata>(&content) {
                                    if let (Some(id), Some(version)) = (metadata.id, metadata.version) {
                                        versions.insert(id, version);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/// Scan connectors directory but don't overwrite existing entries
fn scan_connectors_dir_no_overwrite(dir: &PathBuf, versions: &mut HashMap<String, String>) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                if let Ok(files) = fs::read_dir(&path) {
                    for file in files.flatten() {
                        let file_path = file.path();
                        if file_path.extension().map_or(false, |e| e == "json") {
                            if let Ok(content) = fs::read_to_string(&file_path) {
                                if let Ok(metadata) = serde_json::from_str::<LocalConnectorMetadata>(&content) {
                                    if let (Some(id), Some(version)) = (metadata.id, metadata.version) {
                                        // Only insert if not already present
                                        versions.entry(id).or_insert(version);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
