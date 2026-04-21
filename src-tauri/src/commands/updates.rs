use flate2::read::GzDecoder;
use semver::Version;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sigstore::bundle::verify::{blocking::Verifier, policy};
use std::collections::HashMap;
use std::fs;
use std::io::{Cursor, Read};
use std::path::{Component, Path, PathBuf};
use tar::Archive;
use tauri::{AppHandle, Manager};
use tempfile::tempdir_in;

use super::connector_store::{
    get_active_connector_install, get_connectors_store_dir, get_legacy_user_connectors_dir,
    read_active_connector_manifest, write_active_connector_manifest, ActiveConnectorInstall,
    ActiveConnectorManifest,
};

const DEFAULT_INDEX_URL: &str =
    "https://github.com/vana-com/data-connectors/releases/download/connectors-latest/connector-index.json";
const DEFAULT_SIGSTORE_CERTIFICATE_ISSUER: &str = "https://token.actions.githubusercontent.com";
const DEFAULT_SIGSTORE_CERTIFICATE_IDENTITY: &str =
    "https://github.com/vana-com/data-connectors/.github/workflows/publish-connector-release-index.yml@refs/heads/main";

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SignatureInfo {
    #[serde(rename = "type")]
    pub signature_type: String,
    pub bundle_path: Option<String>,
    pub bundle_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ConnectorIndex {
    pub index_version: String,
    pub generated_at: String,
    pub source_repo: Option<String>,
    pub signature: Option<SignatureInfo>,
    pub connectors: HashMap<String, Vec<IndexedConnector>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct IndexedConnector {
    pub connector_id: String,
    pub company: String,
    pub version: String,
    pub name: String,
    pub description: String,
    pub source_files: ConnectorFiles,
    pub manifest_sha256: String,
    pub script_sha256: String,
    pub artifact_sha256: String,
    pub artifact_url: String,
    pub artifact_signature: Option<SignatureInfo>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConnectorFiles {
    pub script: String,
    pub metadata: String,
}

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

#[derive(Debug, Serialize, Deserialize)]
struct LocalConnectorMetadata {
    id: Option<String>,
    version: Option<String>,
    name: String,
}

struct ArtifactBundle {
    manifest: Vec<u8>,
    script: Vec<u8>,
    readme: Option<Vec<u8>>,
    schema_files: Vec<(PathBuf, Vec<u8>)>,
    asset_files: Vec<(PathBuf, Vec<u8>)>,
}

fn get_user_connectors_dir() -> Option<PathBuf> {
    get_legacy_user_connectors_dir()
}

fn activate_connector_install(install: ActiveConnectorInstall) -> Result<(), String> {
    let mut manifest = read_active_connector_manifest().unwrap_or(ActiveConnectorManifest {
        version: "1.0".to_string(),
        updated_at: chrono::Utc::now().to_rfc3339(),
        connectors: HashMap::new(),
    });
    manifest.updated_at = chrono::Utc::now().to_rfc3339();
    manifest
        .connectors
        .insert(install.connector_id.clone(), install);
    write_active_connector_manifest(&manifest)
}

fn get_bundled_connectors_dir(app: &AppHandle) -> PathBuf {
    if let Ok(manifest_dir) = std::env::var("CARGO_MANIFEST_DIR") {
        let dev_path = PathBuf::from(&manifest_dir)
            .parent()
            .map(|p| p.join("connectors"))
            .unwrap_or_default();
        if dev_path.exists() {
            return dev_path;
        }
    }

    let cwd_path = std::env::current_dir()
        .unwrap_or_default()
        .join("connectors");
    if cwd_path.exists() {
        return cwd_path;
    }

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

    let resource_dir = app.path().resource_dir().unwrap_or_default();
    let up_path = resource_dir.join("_up_").join("connectors");
    if up_path.exists() {
        return up_path;
    }

    resource_dir.join("connectors")
}

fn get_installed_connector_version(
    app: &AppHandle,
    connector_id: &str,
    company: &str,
) -> Option<String> {
    if let Some(install) = get_active_connector_install(connector_id) {
        return Some(install.version);
    }

    if let Some(user_dir) = get_user_connectors_dir() {
        let metadata_path =
            find_installed_metadata_path(&user_dir.join(company.to_lowercase()), connector_id);
        if let Ok(content) = fs::read_to_string(&metadata_path) {
            if let Ok(metadata) = serde_json::from_str::<LocalConnectorMetadata>(&content) {
                return metadata.version;
            }
        }
    }

    let bundled_dir = get_bundled_connectors_dir(app);
    let metadata_path =
        find_installed_metadata_path(&bundled_dir.join(company.to_lowercase()), connector_id);
    if let Ok(content) = fs::read_to_string(&metadata_path) {
        if let Ok(metadata) = serde_json::from_str::<LocalConnectorMetadata>(&content) {
            return metadata.version;
        }
    }

    None
}

fn is_connector_installed(app: &AppHandle, connector_id: &str, company: &str) -> bool {
    if get_active_connector_install(connector_id).is_some() {
        return true;
    }

    if let Some(user_dir) = get_user_connectors_dir() {
        if find_installed_metadata_path(&user_dir.join(company.to_lowercase()), connector_id)
            .exists()
        {
            return true;
        }
    }

    let bundled_dir = get_bundled_connectors_dir(app);
    find_installed_metadata_path(&bundled_dir.join(company.to_lowercase()), connector_id).exists()
}

fn parse_version(version: &str) -> Option<Version> {
    Version::parse(version).ok()
}

fn is_newer_version(current: &str, latest: &str) -> bool {
    match (parse_version(current), parse_version(latest)) {
        (Some(current), Some(latest)) => latest > current,
        _ => false,
    }
}

fn select_latest_connector<'a>(
    entries: &'a [IndexedConnector],
    connector_id: &str,
) -> Result<&'a IndexedConnector, String> {
    entries
        .iter()
        .max_by(|a, b| compare_version_strings(&a.version, &b.version))
        .ok_or_else(|| format!("No published versions found for connector {}", connector_id))
}

fn compare_version_strings(a: &str, b: &str) -> std::cmp::Ordering {
    match (parse_version(a), parse_version(b)) {
        (Some(a), Some(b)) => a.cmp(&b),
        _ => a.cmp(b),
    }
}

fn calculate_checksum(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    let result = hasher.finalize();
    format!("sha256:{:x}", result)
}

fn verify_checksum(data: &[u8], expected: &str) -> bool {
    calculate_checksum(data) == expected
}

fn resolve_bundle_url(subject_url: &str, signature: &SignatureInfo) -> Result<String, String> {
    if signature.signature_type != "sigstoreBundle" {
        return Err(format!(
            "Unsupported signature type {} for {}",
            signature.signature_type, subject_url
        ));
    }

    if let Some(bundle_url) = &signature.bundle_url {
        return Ok(bundle_url.clone());
    }

    if let Some(bundle_path) = &signature.bundle_path {
        let subject = reqwest::Url::parse(subject_url)
            .map_err(|e| format!("Invalid signed artifact URL {}: {}", subject_url, e))?;
        return subject
            .join(bundle_path)
            .map(|url| url.to_string())
            .map_err(|e| format!("Invalid signature bundle path {}: {}", bundle_path, e));
    }

    Ok(format!("{}.sigstore.json", subject_url))
}

fn verify_sigstore_bundle(
    payload: &[u8],
    bundle_bytes: &[u8],
    subject_label: &str,
) -> Result<(), String> {
    let bundle: sigstore::bundle::Bundle = serde_json::from_slice(bundle_bytes)
        .map_err(|e| format!("Failed to parse {} signature bundle: {}", subject_label, e))?;
    let verifier = Verifier::production()
        .map_err(|e| format!("Failed to initialize Sigstore verifier: {}", e))?;
    let policy = policy::Identity::new(
        DEFAULT_SIGSTORE_CERTIFICATE_IDENTITY,
        DEFAULT_SIGSTORE_CERTIFICATE_ISSUER,
    );

    verifier
        .verify(Cursor::new(payload), bundle, &policy, true)
        .map_err(|e| format!("{} signature verification failed: {}", subject_label, e))?;

    Ok(())
}

fn get_index_cache_dir() -> Option<PathBuf> {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .ok()?;
    Some(
        PathBuf::from(home)
            .join(".dataconnect")
            .join("cache"),
    )
}

fn get_index_cache_path() -> Option<PathBuf> {
    Some(get_index_cache_dir()?.join("connector-index.json"))
}

fn get_index_bundle_cache_path() -> Option<PathBuf> {
    Some(get_index_cache_dir()?.join("connector-index.sigstore.json"))
}

fn load_cached_index() -> Option<ConnectorIndex> {
    let cache_path = get_index_cache_path()?;
    let bundle_cache_path = get_index_bundle_cache_path()?;
    if !cache_path.exists() {
        return None;
    }
    if !bundle_cache_path.exists() {
        return None;
    }

    let metadata = fs::metadata(&cache_path).ok()?;
    let modified = metadata.modified().ok()?;
    let age = std::time::SystemTime::now().duration_since(modified).ok()?;
    if age.as_secs() > 3600 {
        return None;
    }

    let index_bytes = fs::read(&cache_path).ok()?;
    let bundle_bytes = fs::read(&bundle_cache_path).ok()?;
    if verify_sigstore_bundle(index_bytes.as_ref(), bundle_bytes.as_ref(), "Cached connector index")
        .is_err()
    {
        return None;
    }

    serde_json::from_slice(index_bytes.as_ref()).ok()
}

fn save_index_cache(index_bytes: &[u8], bundle_bytes: &[u8]) -> Result<(), String> {
    let cache_dir = get_index_cache_dir().ok_or("Could not determine cache path")?;
    fs::create_dir_all(&cache_dir)
        .map_err(|e| format!("Failed to create cache directory: {}", e))?;

    let cache_path = cache_dir.join("connector-index.json");
    let bundle_cache_path = cache_dir.join("connector-index.sigstore.json");
    fs::write(&cache_path, index_bytes).map_err(|e| format!("Failed to write cache: {}", e))?;
    fs::write(&bundle_cache_path, bundle_bytes)
        .map_err(|e| format!("Failed to write signature cache: {}", e))?;
    Ok(())
}

async fn fetch_index(force: bool) -> Result<ConnectorIndex, String> {
    if !force {
        if let Some(cached) = load_cached_index() {
            log::info!("Using cached connector index");
            return Ok(cached);
        }
    }

    log::info!("Fetching connector index from {}", DEFAULT_INDEX_URL);
    let response = reqwest::get(DEFAULT_INDEX_URL)
        .await
        .map_err(|e| format!("Failed to fetch connector index: {}", e))?;
    if !response.status().is_success() {
        return Err(format!(
            "Connector index fetch failed with status: {}",
            response.status()
        ));
    }

    let index_bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read connector index: {}", e))?;
    let index: ConnectorIndex = serde_json::from_slice(index_bytes.as_ref())
        .map_err(|e| format!("Failed to parse connector index: {}", e))?;
    let signature = index
        .signature
        .as_ref()
        .ok_or("Connector index is missing Sigstore bundle metadata")?;
    let bundle_url = resolve_bundle_url(DEFAULT_INDEX_URL, signature)?;
    let bundle_response = reqwest::get(&bundle_url)
        .await
        .map_err(|e| format!("Failed to fetch connector index signature bundle: {}", e))?;
    if !bundle_response.status().is_success() {
        return Err(format!(
            "Connector index signature bundle fetch failed with status: {}",
            bundle_response.status()
        ));
    }
    let bundle_bytes = bundle_response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read connector index signature bundle: {}", e))?;
    verify_sigstore_bundle(
        index_bytes.as_ref(),
        bundle_bytes.as_ref(),
        "Connector index",
    )?;

    if let Err(err) = save_index_cache(index_bytes.as_ref(), bundle_bytes.as_ref()) {
        log::warn!("Failed to cache connector index: {}", err);
    }

    Ok(index)
}

fn normalize_archive_path(path: &Path) -> Result<PathBuf, String> {
    let mut normalized = PathBuf::new();
    for component in path.components() {
        match component {
            Component::Normal(part) => normalized.push(part),
            Component::CurDir => {}
            Component::RootDir | Component::Prefix(_) | Component::ParentDir => {
                return Err(format!(
                    "Artifact entry escapes bundle root: {}",
                    path.display()
                ))
            }
        }
    }
    Ok(normalized)
}

fn find_installed_metadata_path(company_dir: &Path, connector_id: &str) -> PathBuf {
    let target_name = format!("{}.json", connector_id);
    let mut stack = vec![company_dir.to_path_buf()];

    while let Some(dir) = stack.pop() {
        let entries = match fs::read_dir(&dir) {
            Ok(entries) => entries,
            Err(_) => continue,
        };

        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
                continue;
            }
            if path.file_name().and_then(|name| name.to_str()) == Some(target_name.as_str()) {
                return path;
            }
        }
    }

    company_dir.join(target_name)
}

fn relative_path_under_company(path: &str, company: &str) -> Result<PathBuf, String> {
    let normalized = normalize_archive_path(Path::new(path))?;
    let mut components = normalized.components();
    let first = components
        .next()
        .and_then(|component| match component {
            Component::Normal(part) => part.to_str(),
            _ => None,
        })
        .ok_or_else(|| format!("Invalid connector source path: {}", path))?;

    if first.to_lowercase() != company.to_lowercase() {
        return Err(format!(
            "Connector source path {} does not live under company {}",
            path, company
        ));
    }

    let rest: PathBuf = components.map(|component| component.as_os_str()).collect();
    if rest.as_os_str().is_empty() {
        return Err(format!(
            "Connector source path {} is missing a relative file path",
            path
        ));
    }

    Ok(rest)
}

fn connector_root_relative_path(connector: &IndexedConnector) -> Result<PathBuf, String> {
    let metadata_relative =
        relative_path_under_company(&connector.source_files.metadata, &connector.company)?;
    Ok(metadata_relative
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_default())
}

fn connector_path_within_root(path: &str, connector: &IndexedConnector) -> Result<PathBuf, String> {
    let relative = relative_path_under_company(path, &connector.company)?;
    let root_relative = connector_root_relative_path(connector)?;
    if root_relative.as_os_str().is_empty() {
        return Ok(relative);
    }

    relative
        .strip_prefix(&root_relative)
        .map(Path::to_path_buf)
        .map_err(|_| {
            format!(
                "Connector source path {} is not contained within root {}",
                path,
                root_relative.display()
            )
        })
}

fn unpack_artifact_bundle(bytes: &[u8]) -> Result<ArtifactBundle, String> {
    let mut archive = Archive::new(GzDecoder::new(Cursor::new(bytes)));
    let mut manifest = None;
    let mut script = None;
    let mut readme = None;
    let mut schema_files = Vec::new();
    let mut asset_files = Vec::new();

    for entry_result in archive
        .entries()
        .map_err(|e| format!("Failed to read artifact entries: {}", e))?
    {
        let mut entry =
            entry_result.map_err(|e| format!("Failed to read artifact entry: {}", e))?;
        if !entry.header().entry_type().is_file() {
            continue;
        }

        let path = entry
            .path()
            .map_err(|e| format!("Failed to read artifact entry path: {}", e))?;
        let relative_path = normalize_archive_path(&path)?;
        let mut content = Vec::new();
        entry.read_to_end(&mut content).map_err(|e| {
            format!(
                "Failed to read artifact entry {}: {}",
                relative_path.display(),
                e
            )
        })?;

        match relative_path.as_path() {
            path if path == Path::new("manifest.json") => manifest = Some(content),
            path if path == Path::new("script.js") => script = Some(content),
            path if path == Path::new("README.md") => readme = Some(content),
            path if path.starts_with("schemas") => schema_files.push((relative_path, content)),
            _ => asset_files.push((relative_path, content)),
        }
    }

    Ok(ArtifactBundle {
        manifest: manifest.ok_or("Artifact missing manifest.json")?,
        script: script.ok_or("Artifact missing script.js")?,
        readme,
        schema_files,
        asset_files,
    })
}

fn write_bytes(path: &Path, bytes: &[u8]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory {:?}: {}", parent, e))?;
    }
    fs::write(path, bytes).map_err(|e| format!("Failed to write {:?}: {}", path, e))
}

fn write_artifact_bundle(
    install_root: &Path,
    connector: &IndexedConnector,
    bundle: ArtifactBundle,
) -> Result<(), String> {
    let metadata_relative =
        connector_path_within_root(&connector.source_files.metadata, connector)?;
    let script_relative = connector_path_within_root(&connector.source_files.script, connector)?;

    write_bytes(&install_root.join(metadata_relative), &bundle.manifest)?;
    write_bytes(&install_root.join(script_relative), &bundle.script)?;

    if let Some(readme) = bundle.readme {
        write_bytes(&install_root.join("README.md"), &readme)?;
    }

    for (relative_path, bytes) in bundle.schema_files {
        write_bytes(&install_root.join(relative_path), &bytes)?;
    }

    for (relative_path, bytes) in bundle.asset_files {
        write_bytes(&install_root.join(relative_path), &bytes)?;
    }

    Ok(())
}

fn latest_connectors(index: &ConnectorIndex) -> Result<Vec<&IndexedConnector>, String> {
    let mut latest = Vec::new();
    for (connector_id, entries) in &index.connectors {
        latest.push(select_latest_connector(entries, connector_id)?);
    }
    latest.sort_by(|a, b| a.connector_id.cmp(&b.connector_id));
    Ok(latest)
}

#[tauri::command]
pub async fn check_connector_updates(
    app: AppHandle,
    force: bool,
) -> Result<Vec<ConnectorUpdateInfo>, String> {
    let index = fetch_index(force).await?;
    let mut updates = Vec::new();

    for connector in latest_connectors(&index)? {
        let is_installed =
            is_connector_installed(&app, &connector.connector_id, &connector.company);
        let current_version =
            get_installed_connector_version(&app, &connector.connector_id, &connector.company);
        let has_update = if let Some(ref current) = current_version {
            is_newer_version(current, &connector.version)
        } else {
            false
        };
        let is_new = !is_installed;

        if has_update || is_new {
            updates.push(ConnectorUpdateInfo {
                id: connector.connector_id.clone(),
                name: connector.name.clone(),
                description: connector.description.clone(),
                company: connector.company.clone(),
                current_version,
                latest_version: connector.version.clone(),
                has_update,
                is_new,
            });
        }
    }

    log::info!("Found {} connector updates", updates.len());
    Ok(updates)
}

#[tauri::command]
pub async fn download_connector(_app: AppHandle, id: String) -> Result<(), String> {
    log::info!("=== Starting connector download: {} ===", id);
    let index = fetch_index(false).await?;
    let entries = index
        .connectors
        .get(&id)
        .ok_or_else(|| format!("Connector {} not found in connector index", id))?;
    let connector = select_latest_connector(entries, &id)?;

    log::info!(
        "Found connector in index: {} v{} (company: {})",
        connector.connector_id,
        connector.version,
        connector.company
    );

    let response = reqwest::get(&connector.artifact_url)
        .await
        .map_err(|e| format!("Failed to download connector artifact: {}", e))?;
    if !response.status().is_success() {
        return Err(format!(
            "Connector artifact download failed with status: {}",
            response.status()
        ));
    }

    let artifact_bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read connector artifact: {}", e))?;
    let artifact_signature = connector
        .artifact_signature
        .as_ref()
        .ok_or_else(|| format!("Connector {} is missing Sigstore bundle metadata", id))?;
    let artifact_bundle_url = resolve_bundle_url(&connector.artifact_url, artifact_signature)?;
    let artifact_bundle_response = reqwest::get(&artifact_bundle_url)
        .await
        .map_err(|e| format!("Failed to fetch connector signature bundle: {}", e))?;
    if !artifact_bundle_response.status().is_success() {
        return Err(format!(
            "Connector signature bundle fetch failed with status: {}",
            artifact_bundle_response.status()
        ));
    }
    let artifact_bundle_bytes = artifact_bundle_response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read connector signature bundle: {}", e))?;
    verify_sigstore_bundle(
        artifact_bytes.as_ref(),
        artifact_bundle_bytes.as_ref(),
        &format!("Connector artifact {}@{}", connector.connector_id, connector.version),
    )?;
    if !verify_checksum(artifact_bytes.as_ref(), &connector.artifact_sha256) {
        return Err(format!(
            "Connector artifact checksum verification failed. Expected: {}, Got: {}",
            connector.artifact_sha256,
            calculate_checksum(artifact_bytes.as_ref())
        ));
    }

    let bundle = unpack_artifact_bundle(artifact_bytes.as_ref())?;
    let metadata_checksum = calculate_checksum(&bundle.manifest);
    let script_checksum = calculate_checksum(&bundle.script);
    if metadata_checksum != connector.manifest_sha256 {
        return Err(format!(
            "Connector manifest checksum verification failed. Expected: {}, Got: {}",
            connector.manifest_sha256, metadata_checksum
        ));
    }
    if script_checksum != connector.script_sha256 {
        return Err(format!(
            "Connector script checksum verification failed. Expected: {}, Got: {}",
            connector.script_sha256, script_checksum
        ));
    }

    let manifest: LocalConnectorMetadata = serde_json::from_slice(&bundle.manifest)
        .map_err(|e| format!("Failed to parse artifact manifest: {}", e))?;
    if manifest.id.as_deref() != Some(connector.connector_id.as_str()) {
        return Err(format!(
            "Connector artifact id mismatch. Expected {}, got {:?}",
            connector.connector_id, manifest.id
        ));
    }
    if manifest.version.as_deref() != Some(connector.version.as_str()) {
        return Err(format!(
            "Connector artifact version mismatch. Expected {}, got {:?}",
            connector.version, manifest.version
        ));
    }

    let store_dir =
        get_connectors_store_dir().ok_or("Could not determine connectors store directory")?;
    let connector_store_dir = store_dir.join(&connector.connector_id);
    fs::create_dir_all(&connector_store_dir)
        .map_err(|e| format!("Failed to create connector store directory: {}", e))?;

    let install_root = connector_store_dir.join(&connector.version);
    let metadata_relative =
        connector_path_within_root(&connector.source_files.metadata, connector)?;
    let script_relative =
        connector_path_within_root(&connector.source_files.script, connector)?;

    if !install_root.exists() {
        let temp_dir = tempdir_in(&connector_store_dir)
            .map_err(|e| format!("Failed to create connector staging directory: {}", e))?;
        write_artifact_bundle(temp_dir.path(), connector, bundle)?;

        log::info!(
            "Installing connector artifact for {} to {:?} (manifest {}, script {})",
            connector.connector_id,
            install_root,
            metadata_checksum,
            script_checksum
        );

        let staged_root = temp_dir.keep();
        fs::rename(&staged_root, &install_root).map_err(|e| {
            format!(
                "Failed to promote staged connector artifact into {:?}: {}",
                install_root, e
            )
        })?;
    } else {
        log::info!(
            "Connector {} v{} already present in store, activating existing install",
            connector.connector_id,
            connector.version
        );
    }

    activate_connector_install(ActiveConnectorInstall {
        connector_id: connector.connector_id.clone(),
        company: connector.company.clone(),
        version: connector.version.clone(),
        root_path: install_root.to_string_lossy().to_string(),
        metadata_relative_path: metadata_relative.to_string_lossy().to_string(),
        script_relative_path: script_relative.to_string_lossy().to_string(),
    })?;

    log::info!(
        "=== Successfully installed connector: {} ===",
        connector.connector_id
    );
    Ok(())
}

#[tauri::command]
pub fn get_registry_url() -> String {
    DEFAULT_INDEX_URL.to_string()
}

#[tauri::command]
pub async fn get_installed_connectors(app: AppHandle) -> Result<HashMap<String, String>, String> {
    let mut versions = HashMap::new();

    if let Some(active_manifest) = read_active_connector_manifest() {
        for (connector_id, install) in active_manifest.connectors {
            versions.insert(connector_id, install.version);
        }
    }

    if let Some(user_dir) = get_user_connectors_dir() {
        if user_dir.exists() {
            scan_connectors_dir(&user_dir, &mut versions);
        }
    }

    let bundled_dir = get_bundled_connectors_dir(&app);
    if bundled_dir.exists() {
        scan_connectors_dir_no_overwrite(&bundled_dir, &mut versions);
    }

    Ok(versions)
}

fn scan_connectors_dir(dir: &PathBuf, versions: &mut HashMap<String, String>) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                if let Ok(files) = fs::read_dir(&path) {
                    for file in files.flatten() {
                        let file_path = file.path();
                        if file_path.extension().map_or(false, |e| e == "json") {
                            if let Ok(content) = fs::read_to_string(&file_path) {
                                if let Ok(metadata) =
                                    serde_json::from_str::<LocalConnectorMetadata>(&content)
                                {
                                    if let (Some(id), Some(version)) =
                                        (metadata.id, metadata.version)
                                    {
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
                                if let Ok(metadata) =
                                    serde_json::from_str::<LocalConnectorMetadata>(&content)
                                {
                                    if let (Some(id), Some(version)) =
                                        (metadata.id, metadata.version)
                                    {
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

#[cfg(test)]
mod tests {
    use super::{
        calculate_checksum, connector_path_within_root, connector_root_relative_path,
        verify_checksum, verify_sigstore_bundle, ConnectorFiles, IndexedConnector,
    };

    fn nested_connector() -> IndexedConnector {
        IndexedConnector {
            connector_id: "goodreads-playwright".to_string(),
            company: "amazon".to_string(),
            version: "1.0.0".to_string(),
            name: "Goodreads".to_string(),
            description: "Test".to_string(),
            source_files: ConnectorFiles {
                metadata: "amazon/goodreads/goodreads-playwright.json".to_string(),
                script: "amazon/goodreads/goodreads-playwright.js".to_string(),
            },
            manifest_sha256: "sha256:test".to_string(),
            script_sha256: "sha256:test".to_string(),
            artifact_sha256: "sha256:test".to_string(),
            artifact_url: "https://example.com/goodreads.tgz".to_string(),
            artifact_signature: None,
        }
    }

    #[test]
    fn derives_connector_root_relative_to_company() {
        let connector = nested_connector();
        let root = connector_root_relative_path(&connector).expect("root");
        assert_eq!(root.to_string_lossy(), "goodreads");
    }

    #[test]
    fn preserves_paths_relative_to_connector_root() {
        let connector = nested_connector();
        let metadata = connector_path_within_root(&connector.source_files.metadata, &connector)
            .expect("metadata path");
        let script = connector_path_within_root(&connector.source_files.script, &connector)
            .expect("script path");

        assert_eq!(metadata.to_string_lossy(), "goodreads-playwright.json");
        assert_eq!(script.to_string_lossy(), "goodreads-playwright.js");
    }

    #[test]
    fn verify_checksum_rejects_tampered_payload() {
        let original = b"connector artifact contents";
        let expected = calculate_checksum(original);

        assert!(verify_checksum(original, &expected));

        let mut tampered = original.to_vec();
        tampered[0] ^= 0x01;
        assert!(
            !verify_checksum(&tampered, &expected),
            "tampered payload must not match the original checksum"
        );
    }

    #[test]
    fn verify_checksum_rejects_mismatched_expected() {
        let payload = b"connector index bytes";
        let wrong = "sha256:0000000000000000000000000000000000000000000000000000000000000000";

        assert!(
            !verify_checksum(payload, wrong),
            "mismatched checksum must be rejected"
        );
    }

    #[test]
    fn verify_sigstore_bundle_rejects_malformed_bundle() {
        let payload = b"connector-index bytes";
        let malformed_bundle = b"not a sigstore bundle";

        let result = verify_sigstore_bundle(payload, malformed_bundle, "tampered bundle");

        assert!(
            result.is_err(),
            "malformed signature bundle must be rejected before reaching verification"
        );
        let err = result.unwrap_err();
        assert!(
            err.contains("signature bundle"),
            "error message should name the signature bundle, got: {}",
            err
        );
    }
}
