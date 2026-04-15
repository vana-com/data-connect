use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct ActiveConnectorManifest {
    pub version: String,
    pub updated_at: String,
    pub connectors: HashMap<String, ActiveConnectorInstall>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ActiveConnectorInstall {
    pub connector_id: String,
    pub company: String,
    pub version: String,
    pub root_path: String,
    pub metadata_relative_path: String,
    pub script_relative_path: String,
}

pub fn get_dataconnect_dir() -> Option<PathBuf> {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .ok()?;
    Some(PathBuf::from(home).join(".dataconnect"))
}

pub fn get_legacy_user_connectors_dir() -> Option<PathBuf> {
    Some(get_dataconnect_dir()?.join("connectors"))
}

pub fn get_connectors_store_dir() -> Option<PathBuf> {
    Some(get_dataconnect_dir()?.join("connectors-store"))
}

pub fn get_active_manifest_path() -> Option<PathBuf> {
    Some(get_dataconnect_dir()?.join("connectors-active.json"))
}

pub fn read_active_connector_manifest() -> Option<ActiveConnectorManifest> {
    let manifest_path = get_active_manifest_path()?;
    if !manifest_path.exists() {
        return None;
    }

    let content = fs::read_to_string(manifest_path).ok()?;
    serde_json::from_str(&content).ok()
}

pub fn write_active_connector_manifest(manifest: &ActiveConnectorManifest) -> Result<(), String> {
    let manifest_path = get_active_manifest_path().ok_or("Could not determine active manifest path")?;
    if let Some(parent) = manifest_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create connector manifest directory: {}", e))?;
    }

    let temp_path = manifest_path.with_extension("json.tmp");
    let content = serde_json::to_string_pretty(manifest)
        .map_err(|e| format!("Failed to serialize active connector manifest: {}", e))?;

    fs::write(&temp_path, content)
        .map_err(|e| format!("Failed to write active connector manifest: {}", e))?;
    fs::rename(&temp_path, &manifest_path)
        .map_err(|e| format!("Failed to activate connector manifest: {}", e))?;

    Ok(())
}

pub fn get_active_connector_install(connector_id: &str) -> Option<ActiveConnectorInstall> {
    let manifest = read_active_connector_manifest()?;
    manifest.connectors.get(connector_id).cloned()
}
