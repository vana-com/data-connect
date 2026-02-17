use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

// Chromium download constants
const CHROMIUM_REVISION: &str = "1200";
const CHROMIUM_CDN_MIRRORS: &[&str] = &[
    "https://cdn.playwright.dev",
    "https://playwright.download.prss.microsoft.com/dbazure/download/playwright",
];

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConnectorMetadata {
    pub id: Option<String>,
    pub name: String,
    pub company: Option<String>,
    pub description: String,
    #[serde(rename = "connectURL")]
    pub connect_url: String,
    #[serde(rename = "connectSelector")]
    pub connect_selector: String,
    #[serde(rename = "exportFrequency")]
    pub export_frequency: Option<String>,
    pub vectorize_config: Option<serde_json::Value>,
    /// Runtime type: "vanilla" (default) or "network-capture" (uses network interception)
    pub runtime: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Platform {
    pub id: String,
    pub company: String,
    pub name: String,
    pub filename: String,
    pub description: String,
    #[serde(rename = "isUpdated")]
    pub is_updated: bool,
    #[serde(rename = "logoURL")]
    pub logo_url: String,
    #[serde(rename = "needsConnection")]
    pub needs_connection: bool,
    #[serde(rename = "connectURL")]
    pub connect_url: Option<String>,
    #[serde(rename = "connectSelector")]
    pub connect_selector: Option<String>,
    #[serde(rename = "exportFrequency")]
    pub export_frequency: Option<String>,
    pub vectorize_config: Option<serde_json::Value>,
    /// Runtime type: "vanilla" (default) or "network-capture" (uses network interception)
    pub runtime: Option<String>,
}

/// Get the user connectors directory (~/.dataconnect/connectors/)
fn get_user_connectors_dir() -> Option<PathBuf> {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .ok()?;
    let path = PathBuf::from(home).join(".dataconnect").join("connectors");
    if path.exists() {
        log::info!("Found user connectors at: {:?}", path);
        Some(path)
    } else {
        None
    }
}

/// Get the bundled connectors directory path
fn get_connectors_dir(app: &AppHandle) -> PathBuf {
    // In development, look in the project root directory
    // The project root is 3 levels up from src-tauri/target/debug/

    // First, try the CARGO_MANIFEST_DIR (only available during cargo run)
    if let Ok(manifest_dir) = std::env::var("CARGO_MANIFEST_DIR") {
        let dev_path = PathBuf::from(&manifest_dir)
            .parent()
            .map(|p| p.join("connectors"))
            .unwrap_or_default();
        if dev_path.exists() {
            log::info!("Found bundled connectors at: {:?}", dev_path);
            return dev_path;
        }
    }

    // Try relative to current directory (for when running from project root)
    let cwd_path = std::env::current_dir()
        .unwrap_or_default()
        .join("connectors");
    if cwd_path.exists() {
        log::info!("Found bundled connectors at: {:?}", cwd_path);
        return cwd_path;
    }

    // Try relative to executable location (development fallback)
    if let Ok(exe_path) = std::env::current_exe() {
        // In dev: exe is at src-tauri/target/debug/dataconnect
        // Project root is 4 levels up
        if let Some(project_root) = exe_path
            .parent()  // target/debug
            .and_then(|p| p.parent())  // target
            .and_then(|p| p.parent())  // src-tauri
            .and_then(|p| p.parent())  // project root
        {
            let dev_path = project_root.join("connectors");
            if dev_path.exists() {
                log::info!("Found bundled connectors at: {:?}", dev_path);
                return dev_path;
            }
        }
    }

    // Try resource path for bundled app (production)
    // Tauri converts "../connectors" to "_up_/connectors" in resources
    let resource_dir = app.path()
        .resource_dir()
        .unwrap_or_default();

    // Check for _up_/connectors first (from "../connectors" resource path)
    let up_path = resource_dir.join("_up_").join("connectors");
    if up_path.exists() {
        log::info!("Found bundled connectors at: {:?}", up_path);
        return up_path;
    }

    // Fallback to direct connectors path
    let resource_path = resource_dir.join("connectors");
    log::info!("Using resource bundled connectors path: {:?}", resource_path);
    resource_path
}

/// Debug connector paths - helps diagnose why connectors aren't found
#[tauri::command]
pub async fn debug_connector_paths(app: AppHandle) -> Result<serde_json::Value, String> {
    let resource_dir = app.path().resource_dir().unwrap_or_default();
    let connectors_dir = get_connectors_dir(&app);
    let user_dir = get_user_connectors_dir();

    // Check various paths
    let mut paths_to_check = vec![
        ("resource_dir", resource_dir.clone()),
        ("resource_dir/connectors", resource_dir.join("connectors")),
        ("resource_dir/_up_/connectors", resource_dir.join("_up_").join("connectors")),
        ("connectors_dir (bundled)", connectors_dir.clone()),
    ];

    // Add user directory if available
    if let Some(ref user_path) = user_dir {
        paths_to_check.push(("user_connectors_dir", user_path.clone()));
    }

    let mut results = serde_json::Map::new();

    for (name, path) in paths_to_check {
        let exists = path.exists();
        let contents = if exists && path.is_dir() {
            std::fs::read_dir(&path)
                .map(|entries| {
                    entries
                        .filter_map(|e| e.ok())
                        .map(|e| e.file_name().to_string_lossy().to_string())
                        .collect::<Vec<_>>()
                })
                .unwrap_or_default()
        } else {
            vec![]
        };

        results.insert(name.to_string(), serde_json::json!({
            "path": path.to_string_lossy(),
            "exists": exists,
            "contents": contents
        }));
    }

    Ok(serde_json::Value::Object(results))
}

/// Load platforms from a single directory
fn load_platforms_from_dir(dir: &PathBuf) -> Vec<Platform> {
    let mut platforms = Vec::new();

    if !dir.exists() {
        log::warn!("Connectors directory not found: {:?}", dir);
        return platforms;
    }

    // Walk through the connectors directory
    for entry in walkdir::WalkDir::new(dir)
        .min_depth(2)
        .max_depth(2)
    {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        let path = entry.path();

        // Look for JSON metadata files
        if path.extension().map_or(false, |ext| ext == "json") {
            let filename = path.file_stem().unwrap_or_default().to_string_lossy();

            // Skip type definition files and schema files
            if filename == "connector" {
                continue;
            }

            let parent_name = path
                .parent()
                .and_then(|p| p.file_name())
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();
            if parent_name == "schemas" || parent_name == "types" {
                continue;
            }

            // Read and parse the metadata
            match fs::read_to_string(path) {
                Ok(content) => {
                    match serde_json::from_str::<ConnectorMetadata>(&content) {
                        Ok(metadata) => {
                            // Get company from parent directory
                            let company = path
                                .parent()
                                .and_then(|p| p.file_name())
                                .map(|n| n.to_string_lossy().to_string())
                                .unwrap_or_else(|| "Unknown".to_string());

                            platforms.push(Platform {
                                id: metadata
                                    .id
                                    .unwrap_or_else(|| format!("{}-001", filename)),
                                company: metadata.company.unwrap_or(company),
                                name: metadata.name.clone(),
                                filename: filename.to_string(),
                                description: metadata.description,
                                is_updated: false,
                                logo_url: filename.to_string(),
                                needs_connection: true,
                                connect_url: Some(metadata.connect_url),
                                connect_selector: Some(metadata.connect_selector),
                                export_frequency: metadata.export_frequency,
                                vectorize_config: metadata.vectorize_config,
                                runtime: metadata.runtime,
                            });
                        }
                        Err(e) => {
                            log::error!("Failed to parse metadata {:?}: {}", path, e);
                        }
                    }
                }
                Err(e) => {
                    log::error!("Failed to read metadata {:?}: {}", path, e);
                }
            }
        }
    }

    platforms
}

/// Load all platform connectors from both user and bundled connectors directories
/// User connectors take precedence over bundled ones
#[tauri::command]
pub async fn get_platforms(app: AppHandle) -> Result<Vec<Platform>, String> {
    let mut platforms = Vec::new();
    let mut seen_ids = std::collections::HashSet::new();

    // First, load from bundled directory
    let bundled_dir = get_connectors_dir(&app);
    log::info!("Loading bundled connectors from: {:?}", bundled_dir);
    for platform in load_platforms_from_dir(&bundled_dir) {
        seen_ids.insert(platform.id.clone());
        platforms.push(platform);
    }

    // Then, load from user directory (overrides bundled)
    if let Some(user_dir) = get_user_connectors_dir() {
        log::info!("Loading user connectors from: {:?}", user_dir);
        for platform in load_platforms_from_dir(&user_dir) {
            if seen_ids.contains(&platform.id) {
                // Remove the bundled version
                platforms.retain(|p| p.id != platform.id);
            }
            seen_ids.insert(platform.id.clone());
            platforms.push(platform);
        }
    }

    log::info!("Loaded {} total platforms", platforms.len());
    Ok(platforms)
}

/// Active connector windows
static CONNECTOR_WINDOWS: std::sync::LazyLock<
    std::sync::Mutex<HashMap<String, String>>,
> = std::sync::LazyLock::new(|| std::sync::Mutex::new(HashMap::new()));

/// Load connector script from the connectors directory
/// Checks user directory first, then bundled directory
fn load_connector_script(app: &AppHandle, company: &str, filename: &str) -> Option<String> {
    let company_lower = company.to_lowercase();

    // First check user directory
    if let Some(user_dir) = get_user_connectors_dir() {
        let js_path = user_dir.join(&company_lower).join(format!("{}.js", filename));
        log::info!("Looking for connector script in user dir: {:?}", js_path);

        if js_path.exists() {
            match fs::read_to_string(&js_path) {
                Ok(content) => {
                    log::info!("Loaded connector script from user dir: {:?}", js_path);
                    return Some(content);
                }
                Err(e) => {
                    log::error!("Failed to read connector script {:?}: {}", js_path, e);
                }
            }
        }
    }

    // Fall back to bundled directory
    let connectors_dir = get_connectors_dir(app);
    let js_path = connectors_dir.join(&company_lower).join(format!("{}.js", filename));
    let ts_path = connectors_dir.join(&company_lower).join(format!("{}.ts", filename));

    log::info!("Looking for connector script in bundled dir: {:?}", js_path);

    if js_path.exists() {
        match fs::read_to_string(&js_path) {
            Ok(content) => {
                log::info!("Loaded connector script from bundled dir: {:?}", js_path);
                return Some(content);
            }
            Err(e) => {
                log::error!("Failed to read connector script {:?}: {}", js_path, e);
            }
        }
    } else if ts_path.exists() {
        // TypeScript file exists but we can't run it directly
        log::warn!("Found TypeScript connector at {:?}, but JS version is required", ts_path);
    } else {
        log::warn!("No connector script found for {}/{}", company, filename);
    }

    None
}

/// Load a library script from the connectors/lib directory
/// Used for optional features like network capture
fn load_library_script(app: &AppHandle, script_name: &str) -> Option<String> {
    let connectors_dir = get_connectors_dir(app);
    let lib_path = connectors_dir.join("lib").join(script_name);

    log::info!("Looking for library script at: {:?}", lib_path);

    if lib_path.exists() {
        match fs::read_to_string(&lib_path) {
            Ok(content) => {
                log::info!("Loaded library script: {:?}", lib_path);
                return Some(content);
            }
            Err(e) => {
                log::error!("Failed to read library script {:?}: {}", lib_path, e);
            }
        }
    } else {
        log::warn!("Library script not found: {:?}", lib_path);
    }

    None
}

/// Active Playwright processes by runId
static PLAYWRIGHT_PROCESSES: std::sync::LazyLock<
    std::sync::Mutex<HashMap<String, std::process::Child>>,
> = std::sync::LazyLock::new(|| std::sync::Mutex::new(HashMap::new()));

/// Kill all active Playwright processes on app exit (sync, best-effort).
/// Uses process group kills so spawned Chrome children are also reaped.
pub fn cleanup_playwright_processes() {
    if let Ok(mut guard) = PLAYWRIGHT_PROCESSES.lock() {
        if guard.is_empty() {
            return;
        }
        log::info!("Cleaning up {} Playwright process(es) on app exit...", guard.len());
        for (run_id, mut child) in guard.drain() {
            #[cfg(unix)]
            {
                use crate::commands::server::kill_process_group;
                kill_process_group(child.id(), libc::SIGTERM);
            }
            // Brief wait then force kill
            let mut exited = false;
            for _ in 0..10 {
                if let Ok(Some(_)) = child.try_wait() {
                    exited = true;
                    break;
                }
                std::thread::sleep(std::time::Duration::from_millis(100));
            }
            if !exited {
                #[cfg(unix)]
                {
                    use crate::commands::server::kill_process_group;
                    kill_process_group(child.id(), libc::SIGKILL);
                }
                #[cfg(not(unix))]
                {
                    let _ = child.kill();
                }
                let _ = child.wait();
            }
            log::info!("Playwright process for run {} cleaned up", run_id);
        }
    }
}

/// Get the path to the bundled Playwright runner binary (production) or None (dev)
fn get_bundled_playwright_runner(app: &AppHandle) -> Option<(PathBuf, Option<PathBuf>)> {
    // In production, the binary is in the resources directory
    let resource_dir = app.path().resource_dir().ok()?;

    #[cfg(target_os = "macos")]
    let binary_name = "playwright-runner";
    #[cfg(target_os = "windows")]
    let binary_name = "playwright-runner.exe";
    #[cfg(target_os = "linux")]
    let binary_name = "playwright-runner";

    log::info!("=== Looking for Playwright runner ===");
    log::info!("Resource directory: {:?}", resource_dir);
    log::info!("Binary name: {}", binary_name);

    // List contents of resource directory for debugging
    if let Ok(entries) = std::fs::read_dir(&resource_dir) {
        let contents: Vec<_> = entries
            .filter_map(|e| e.ok())
            .map(|e| e.file_name().to_string_lossy().to_string())
            .collect();
        log::info!("Resource dir contents: {:?}", contents);
    }

    // Try playwright-runner/dist path (matches tauri.conf.json resources config)
    let dist_path = resource_dir.join("playwright-runner").join("dist");
    let dist_binary = dist_path.join(binary_name);
    let dist_browsers = dist_path.join("browsers");

    log::info!("Checking path 1: {:?} (exists: {})", dist_binary, dist_binary.exists());
    if dist_path.exists() {
        if let Ok(entries) = std::fs::read_dir(&dist_path) {
            let contents: Vec<_> = entries
                .filter_map(|e| e.ok())
                .map(|e| e.file_name().to_string_lossy().to_string())
                .collect();
            log::info!("  dist path contents: {:?}", contents);
        }
    }

    if dist_binary.exists() {
        log::info!("Found bundled Playwright runner at {:?}", dist_binary);
        let browsers = if dist_browsers.exists() {
            Some(dist_browsers)
        } else {
            None
        };
        return Some((dist_binary, browsers));
    }

    // Try binaries/ path (alternative CI builds layout)
    let binary_path = resource_dir.join("binaries").join(binary_name);
    let browsers_path = resource_dir.join("binaries").join("browsers");

    log::info!("Checking path 2: {:?} (exists: {})", binary_path, binary_path.exists());

    if binary_path.exists() {
        log::info!("Found bundled Playwright runner at {:?}", binary_path);
        let browsers = if browsers_path.exists() {
            Some(browsers_path)
        } else {
            None
        };
        return Some((binary_path, browsers));
    }

    // Try _up_/playwright-runner/dist path (local builds with "../playwright-runner/dist" resource)
    let up_path = resource_dir.join("_up_").join("playwright-runner").join("dist");
    let up_binary = up_path.join(binary_name);
    let up_browsers = up_path.join("browsers");

    log::info!("Checking path 3: {:?} (exists: {})", up_binary, up_binary.exists());
    if up_path.exists() {
        if let Ok(entries) = std::fs::read_dir(&up_path) {
            let contents: Vec<_> = entries
                .filter_map(|e| e.ok())
                .map(|e| e.file_name().to_string_lossy().to_string())
                .collect();
            log::info!("  _up_ path contents: {:?}", contents);
        }
    }

    if up_binary.exists() {
        log::info!("Found bundled Playwright runner at {:?}", up_binary);
        let browsers = if up_browsers.exists() {
            Some(up_browsers)
        } else {
            None
        };
        return Some((up_binary, browsers));
    }

    log::error!("=== Playwright runner NOT FOUND in any location ===");
    None
}

/// Start a connector run using Playwright sidecar
async fn start_playwright_run(
    app: AppHandle,
    run_id: String,
    platform_id: String,
    filename: String,
    company: String,
    name: String,
    connect_url: String,
    simulate_no_chrome: Option<bool>,
) -> Result<(), String> {
    use std::io::{BufRead, BufReader, Write};
    use std::process::{Command, Stdio};

    log::info!("Starting Playwright run for {} (platform: {}, company: {}, filename: {})",
        run_id, platform_id, company, filename);

    // Check if browser is available before starting
    let browser_status = check_browser_available(simulate_no_chrome).await?;
    if !browser_status.available {
        log::info!("No browser available, downloading Chromium...");
        let _ = app.emit("connector-log", serde_json::json!({
            "runId": run_id,
            "message": "No browser found. Downloading Chromium (~170MB)...",
            "timestamp": chrono_timestamp()
        }));

        // Download using Rust (with progress events)
        download_chromium_rust(app.clone()).await?;

        log::info!("Chromium download complete, continuing with connector");
        let _ = app.emit("connector-log", serde_json::json!({
            "runId": run_id,
            "message": "Browser download complete. Starting connector...",
            "timestamp": chrono_timestamp()
        }));
    }

    // Find the connector script (check user dir first, then bundled)
    let company_lower = company.to_lowercase();
    let connector_path = if let Some(user_dir) = get_user_connectors_dir() {
        let user_path = user_dir.join(&company_lower).join(format!("{}.js", filename));
        if user_path.exists() {
            log::info!("Found connector in user directory: {:?}", user_path);
            user_path
        } else {
            let bundled_dir = get_connectors_dir(&app);
            let bundled_path = bundled_dir.join(&company_lower).join(format!("{}.js", filename));
            log::info!("Looking for connector in bundled directory: {:?}", bundled_path);
            bundled_path
        }
    } else {
        let connectors_dir = get_connectors_dir(&app);
        connectors_dir.join(&company_lower).join(format!("{}.js", filename))
    };

    if !connector_path.exists() {
        let err = format!("Connector script not found: {:?}", connector_path);
        log::error!("{}", err);
        // Emit error to UI
        let _ = app.emit("connector-log", serde_json::json!({
            "runId": run_id,
            "message": format!("Error: {}", err),
            "timestamp": chrono_timestamp()
        }));
        return Err(err);
    }

    log::info!("Connector script found at: {:?}, looking for Playwright runner...", connector_path);

    // In debug mode, always use node directly (avoids macOS code signing issues with copied binaries)
    // In release mode, use the bundled binary
    #[cfg(debug_assertions)]
    let use_bundled_binary = false;
    #[cfg(not(debug_assertions))]
    let use_bundled_binary = true;

    let mut child = if use_bundled_binary {
        if let Some((binary_path, browsers_path)) = get_bundled_playwright_runner(&app) {
            log::info!("Found bundled Playwright runner at: {:?}", binary_path);

            // Production mode: use bundled binary
            let mut cmd = Command::new(&binary_path);
            cmd.stdin(Stdio::piped())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped());

            // Create a new process group so we can kill all children (Chrome) at once
            #[cfg(unix)]
            {
                use std::os::unix::process::CommandExt;
                cmd.process_group(0);
            }

            // Set browser path if bundled
            if let Some(ref browsers) = browsers_path {
                log::info!("Setting PLAYWRIGHT_BROWSERS_PATH to: {:?}", browsers);
                cmd.env("PLAYWRIGHT_BROWSERS_PATH", browsers);
            }

            // Set simulate no chrome flag for testing
            if simulate_no_chrome.unwrap_or(false) {
                log::info!("Setting DATACONNECT_SIMULATE_NO_CHROME=1");
                cmd.env("DATACONNECT_SIMULATE_NO_CHROME", "1");
            }

            log::info!("Spawning Playwright runner...");
            match cmd.spawn() {
                Ok(child) => child,
                Err(e) => {
                    let err = format!("Failed to spawn bundled Playwright runner: {}", e);
                    log::error!("{}", err);
                    let _ = app.emit("connector-log", serde_json::json!({
                        "runId": run_id,
                        "message": format!("Error: {}", err),
                        "timestamp": chrono_timestamp()
                    }));
                    return Err(err);
                }
            }
        } else {
            return Err("Bundled Playwright runner not found".to_string());
        }
    } else {
        // Dev mode: use node index.cjs directly (avoids code signing issues)
        log::info!("Dev mode: using node index.cjs directly");
        let connectors_dir = get_connectors_dir(&app);
        let runner_dir = connectors_dir.parent()
            .and_then(|p| Some(p.join("playwright-runner")))
            .ok_or("Could not find playwright-runner directory")?;

        if !runner_dir.exists() {
            return Err(format!("Playwright runner not found: {:?}. Run 'npm install' in playwright-runner directory.", runner_dir));
        }

        let mut cmd = Command::new("node");
        cmd.arg("index.cjs")
            .current_dir(&runner_dir)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        #[cfg(unix)]
        {
            use std::os::unix::process::CommandExt;
            cmd.process_group(0);
        }

        // Set simulate no chrome flag for testing
        if simulate_no_chrome.unwrap_or(false) {
            log::info!("Setting DATACONNECT_SIMULATE_NO_CHROME=1 (dev mode)");
            cmd.env("DATACONNECT_SIMULATE_NO_CHROME", "1");
        }

        cmd.spawn()
            .map_err(|e| format!("Failed to spawn Playwright runner: {}", e))?
    };

    log::info!("Playwright runner spawned successfully");

    // Get handles to stdin/stdout
    let stdin = child.stdin.take().ok_or("Failed to get stdin")?;
    let stdout = child.stdout.take().ok_or("Failed to get stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to get stderr")?;

    // Store process for cleanup
    PLAYWRIGHT_PROCESSES.lock().unwrap().insert(run_id.clone(), child);

    // Emit that the run has started
    app.emit("run-started", serde_json::json!({
        "runId": run_id,
        "platformId": platform_id,
        "company": company,
        "name": name,
        "runtime": "playwright"
    })).map_err(|e| format!("Failed to emit event: {}", e))?;

    // Spawn thread to read stderr (for debug logs)
    let run_id_for_stderr = run_id.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines().flatten() {
            log::info!("[Playwright:{}] {}", run_id_for_stderr, line);
        }
    });

    // Spawn thread to read stdout and forward events
    let app_clone = app.clone();
    let run_id_for_stdout = run_id.clone();
    let platform_id_clone = platform_id.clone();
    let company_clone = company.clone();
    let name_clone = name.clone();

    // Build the run command JSON before moving stdin
    let run_cmd = serde_json::json!({
        "type": "run",
        "runId": run_id,
        "connectorPath": connector_path.to_string_lossy(),
        "url": connect_url,
        "headless": true
    });

    std::thread::spawn(move || {
        // Move stdin into this thread to keep it alive
        let mut stdin = stdin;

        // Send the run command
        if let Err(e) = writeln!(stdin, "{}", run_cmd.to_string()) {
            log::error!("Failed to send run command: {}", e);
        }
        // Flush stdin to ensure command is sent immediately
        let _ = stdin.flush();

        // Now read stdout in the same thread to keep stdin alive
        let reader = BufReader::new(stdout);
        for line in reader.lines().flatten() {
            if let Ok(msg) = serde_json::from_str::<serde_json::Value>(&line) {
                let msg_type = msg.get("type").and_then(|v| v.as_str()).unwrap_or("");

                match msg_type {
                    "ready" => {
                        log::info!("Playwright runner ready for {}", run_id_for_stdout);
                    }
                    "log" => {
                        if let Some(message) = msg.get("message").and_then(|v| v.as_str()) {
                            let _ = app_clone.emit("connector-log", serde_json::json!({
                                "runId": run_id_for_stdout,
                                "message": message,
                                "timestamp": chrono_timestamp()
                            }));
                        }
                    }
                    "status" => {
                        if let Some(status_str) = msg.get("status").and_then(|v| v.as_str()) {
                            // Simple string status (e.g., "RUNNING", "COMPLETE")
                            let _ = app_clone.emit("connector-status", serde_json::json!({
                                "runId": run_id_for_stdout,
                                "status": { "type": status_str },
                                "timestamp": chrono_timestamp()
                            }));
                        } else if let Some(status_obj) = msg.get("status") {
                            // Structured status object (e.g., { type: "COLLECTING", message, phase, count })
                            let _ = app_clone.emit("connector-status", serde_json::json!({
                                "runId": run_id_for_stdout,
                                "status": status_obj,
                                "timestamp": chrono_timestamp()
                            }));
                        }
                    }
                    "result" => {
                        if let Some(data) = msg.get("data") {
                            let _ = app_clone.emit("export-complete", serde_json::json!({
                                "runId": run_id_for_stdout,
                                "platformId": platform_id_clone,
                                "company": company_clone,
                                "name": name_clone,
                                "data": data,
                                "timestamp": chrono_timestamp()
                            }));
                        }
                    }
                    "error" => {
                        if let Some(message) = msg.get("message").and_then(|v| v.as_str()) {
                            let _ = app_clone.emit("connector-log", serde_json::json!({
                                "runId": run_id_for_stdout,
                                "message": format!("Error: {}", message),
                                "timestamp": chrono_timestamp()
                            }));
                        }
                    }
                    "data" => {
                        // Forward connector data events to frontend
                        let key = msg.get("key").and_then(|v| v.as_str()).unwrap_or("");
                        let value = msg.get("value");
                        let _ = app_clone.emit("connector-data", serde_json::json!({
                            "runId": run_id_for_stdout,
                            "key": key,
                            "value": value,
                            "timestamp": chrono_timestamp()
                        }));
                    }
                    _ => {}
                }
            }
        }

        // Process ended, cleanup and notify UI
        PLAYWRIGHT_PROCESSES.lock().unwrap().remove(&run_id_for_stdout);
        log::info!("Playwright runner ended for {}", run_id_for_stdout);

        // Emit stopped status so UI updates (in case process exited without COMPLETE/ERROR)
        let _ = app_clone.emit("connector-status", serde_json::json!({
            "runId": run_id_for_stdout,
            "status": { "type": "STOPPED", "message": "Process ended" },
            "timestamp": chrono_timestamp()
        }));
    });

    Ok(())
}

/// Start a connector run by creating a webview window
#[tauri::command]
pub async fn start_connector_run(
    app: AppHandle,
    run_id: String,
    platform_id: String,
    filename: String,
    company: String,
    name: String,
    connect_url: String,
    runtime: Option<String>,
    simulate_no_chrome: Option<bool>,
) -> Result<(), String> {
    // Check if this is a Playwright runtime connector
    if runtime.as_deref() == Some("playwright") {
        return start_playwright_run(
            app, run_id, platform_id, filename, company, name, connect_url, simulate_no_chrome
        ).await;
    }

    let window_label = format!("connector-{}", run_id);
    let use_network_capture = runtime.as_deref() == Some("network-capture");

    // Load the connector script
    let connector_script = load_connector_script(&app, &company, &filename)
        .unwrap_or_else(|| {
            log::warn!("No connector script found, using empty script");
            String::new()
        });

    // Load optional library scripts for network-capture runtime
    // These provide network interception capabilities
    let network_capture_script = if use_network_capture {
        load_library_script(&app, "network-capture.js").unwrap_or_default()
    } else {
        String::new()
    };

    let page_api_script = if use_network_capture {
        load_library_script(&app, "page-api.js").unwrap_or_default()
    } else {
        String::new()
    };

    if use_network_capture {
        log::info!("Using network-capture runtime for run {}", run_id);
    }

    // Build the connector API injection script
    let api_script = format!(
        r#"
        // DataConnect Connector API
        const __RUN_ID__ = "{}";
        const __PLATFORM_ID__ = "{}";
        const __FILENAME__ = "{}";
        const __COMPANY__ = "{}";
        const __NAME__ = "{}";

        // Define log function first so other functions can reference it
        const __dataconnectLog = function(...args) {{
            const stringArgs = args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            );
            console.log('[DataConnect]', ...stringArgs);
            if (window.__TAURI__ && window.__TAURI__.event) {{
                window.__TAURI__.event.emit('connector-log', {{
                    runId: __RUN_ID__,
                    message: stringArgs.join(' '),
                    timestamp: Date.now()
                }});
            }}
        }};

        window.__DATACONNECT_API__ = {{
            log: __dataconnectLog,
            waitForElement: function(selector, elementName, multipleElements = false, timeout = 10000) {{
                if (!multipleElements) {{
                    __dataconnectLog('Waiting for ' + elementName);
                }}
                return new Promise((resolve) => {{
                    const startTime = Date.now();
                    const checkElement = () => {{
                        const element = multipleElements
                            ? document.querySelectorAll(selector)
                            : document.querySelector(selector);
                        if (element && (multipleElements ? element.length > 0 : true)) {{
                            if (!multipleElements) {{
                                __dataconnectLog('Found ' + elementName);
                            }}
                            resolve(element);
                        }} else if (Date.now() - startTime >= timeout) {{
                            __dataconnectLog('Timeout waiting for ' + elementName);
                            resolve(null);
                        }} else {{
                            setTimeout(checkElement, 100);
                        }}
                    }};
                    checkElement();
                }});
            }},
            wait: function(seconds) {{
                return new Promise(resolve => setTimeout(resolve, seconds * 1000));
            }},
            sendStatus: function(status) {{
                __dataconnectLog('Status: ' + (typeof status === 'string' ? status : JSON.stringify(status)));
                if (window.__TAURI__ && window.__TAURI__.event) {{
                    window.__TAURI__.event.emit('connector-status', {{
                        runId: __RUN_ID__,
                        status: status,
                        timestamp: Date.now()
                    }});
                }}
            }},
            navigate: function(url) {{
                __dataconnectLog('Navigating to: ' + url);
                window.location.assign(url);
            }},
            getRunId: function() {{ return __RUN_ID__; }},
            getMetadata: function() {{
                return {{
                    id: __PLATFORM_ID__,
                    name: __NAME__,
                    company: __COMPANY__
                }};
            }}
        }};

        window.__DATACONNECT_RUN_ID__ = __RUN_ID__;
        window.__DATACONNECT_PLATFORM_ID__ = __PLATFORM_ID__;
        window.__DATACONNECT_FILENAME__ = __FILENAME__;
        window.__DATACONNECT_COMPANY__ = __COMPANY__;
        window.__DATACONNECT_NAME__ = __NAME__;

        console.log('[DataConnect] API initialized for run:', __RUN_ID__);
        "#,
        run_id, platform_id, filename, company, name
    );

    // Combine the API script with the connector script
    // The connector script runs after page loads and stores results in window.__DATACONNECT_RESULT__
    // For playwright runtime, we also inject network capture and page API scripts
    let full_script = format!(
        r#"
        {}

        // Network capture library (network-capture runtime only)
        {}

        // Page API library (network-capture runtime only)
        {}

        // Run connector script after page loads
        if (document.readyState === 'loading') {{
            document.addEventListener('DOMContentLoaded', function() {{
                setTimeout(function() {{
                    try {{
                        {}
                    }} catch (e) {{
                        console.error('[DataConnect] Connector error:', e);
                        window.__DATACONNECT_STATUS__ = {{ type: 'ERROR', message: e.message }};
                        window.__DATACONNECT_RESULT__ = {{ error: e.message }};
                    }}
                }}, 2000);
            }});
        }} else {{
            setTimeout(function() {{
                try {{
                    {}
                }} catch (e) {{
                    console.error('[DataConnect] Connector error:', e);
                    window.__DATACONNECT_STATUS__ = {{ type: 'ERROR', message: e.message }};
                    window.__DATACONNECT_RESULT__ = {{ error: e.message }};
                }}
            }}, 2000);
        }}
        "#,
        api_script, network_capture_script, page_api_script, connector_script, connector_script
    );

    // Create the webview window
    let webview = WebviewWindowBuilder::new(&app, &window_label, WebviewUrl::External(connect_url.parse().map_err(|e| format!("Invalid URL: {}", e))?))
        .title(format!("DataConnect - {}", name))
        .inner_size(1024.0, 768.0)
        .initialization_script(&full_script)
        .build()
        .map_err(|e| format!("Failed to create window: {}", e))?;

    // Store the window reference
    CONNECTOR_WINDOWS
        .lock()
        .unwrap()
        .insert(run_id.clone(), window_label.clone());

    // Emit that the run has started
    app.emit("run-started", serde_json::json!({
        "runId": run_id,
        "platformId": platform_id,
        "company": company,
        "name": name
    }))
    .map_err(|e| format!("Failed to emit event: {}", e))?;

    // Start polling for results in a background task
    let app_clone = app.clone();
    let run_id_clone = run_id.clone();
    let platform_id_clone = platform_id.clone();
    let company_clone = company.clone();
    let name_clone = name.clone();

    tokio::spawn(async move {
        poll_connector_result(
            app_clone,
            webview,
            run_id_clone,
            platform_id_clone,
            company_clone,
            name_clone,
        ).await;
    });

    Ok(())
}

/// Poll the webview for connector results using URL hash as communication channel
async fn poll_connector_result(
    app: AppHandle,
    webview: tauri::WebviewWindow,
    run_id: String,
    platform_id: String,
    company: String,
    name: String,
) {
    let mut last_status_hash = String::new();
    let max_polls = 300; // Poll for up to 5 minutes
    let mut poll_count = 0;

    log::info!("Starting polling for run {}", run_id);

    loop {
        poll_count += 1;
        if poll_count > max_polls {
            log::warn!("Polling timeout for run {}", run_id);
            let _ = app.emit("connector-status", serde_json::json!({
                "runId": run_id,
                "status": { "type": "ERROR", "message": "Polling timeout" },
                "timestamp": chrono_timestamp()
            }));
            break;
        }

        // Wait before polling
        tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;

        // Check if window still exists
        if webview.is_closable().is_err() {
            log::info!("Webview closed for run {}", run_id);
            break;
        }

        // Inject script to encode status/result in URL hash
        // We use base64 encoding to handle JSON safely in URLs
        let check_script = r#"
            (function() {
                try {
                    var result = window.__DATACONNECT_RESULT__;
                    var status = window.__DATACONNECT_STATUS__;

                    if (result && !window.__DATACONNECT_HASH_SET__) {
                        window.__DATACONNECT_HASH_SET__ = true;
                        var encoded = btoa(unescape(encodeURIComponent(JSON.stringify({
                            type: 'RESULT',
                            data: result
                        }))));
                        window.location.hash = 'DATACONNECT_' + encoded;
                        return;
                    }

                    if (status && status.type && !window.__DATACONNECT_HASH_SET__) {
                        var statusKey = status.type + '_' + (status.message || '');
                        if (window.__DATACONNECT_LAST_STATUS_KEY__ !== statusKey) {
                            window.__DATACONNECT_LAST_STATUS_KEY__ = statusKey;
                            var encoded = btoa(unescape(encodeURIComponent(JSON.stringify({
                                type: 'STATUS',
                                data: status
                            }))));
                            window.location.hash = 'DATACONNECT_' + encoded;
                        }
                    }
                } catch(e) {
                    console.error('[DataConnect Poll] Error:', e);
                }
            })();
        "#;

        let _ = webview.eval(check_script);

        // Small delay for script to execute
        tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;

        // Read the URL to check the hash
        if let Ok(url) = webview.url() {
            let url_str = url.to_string();
            if let Some(hash_pos) = url_str.find("#DATACONNECT_") {
                let hash = &url_str[hash_pos + 12..]; // Skip "#DATACONNECT_"

                // Skip if we've already processed this hash
                if hash == last_status_hash {
                    continue;
                }
                last_status_hash = hash.to_string();

                // Decode base64
                if let Ok(decoded_bytes) = base64_decode(hash) {
                    if let Ok(decoded_str) = String::from_utf8(decoded_bytes) {
                        if let Ok(payload) = serde_json::from_str::<serde_json::Value>(&decoded_str) {
                            let msg_type = payload.get("type").and_then(|v| v.as_str()).unwrap_or("");
                            let data = payload.get("data").cloned().unwrap_or(serde_json::Value::Null);

                            if msg_type == "RESULT" {
                                log::info!("Got RESULT from webview for run {}", run_id);

                                // Emit completion status
                                let total = data.get("totalConversations").and_then(|v| v.as_i64()).unwrap_or(0);
                                let _ = app.emit("connector-status", serde_json::json!({
                                    "runId": run_id,
                                    "status": {
                                        "type": "COMPLETE",
                                        "message": format!("Exported {} conversations", total),
                                        "data": data
                                    },
                                    "timestamp": chrono_timestamp()
                                }));

                                // Emit export complete
                                let _ = app.emit("export-complete", serde_json::json!({
                                    "runId": run_id,
                                    "platformId": platform_id,
                                    "company": company,
                                    "name": name,
                                    "data": data,
                                    "timestamp": chrono_timestamp()
                                }));

                                log::info!("Export complete for run {}, emitted events", run_id);

                                // Clear the hash
                                let _ = webview.eval("window.location.hash = '';");
                                break;
                            } else if msg_type == "STATUS" {
                                let status_type = data.get("type").and_then(|v| v.as_str()).unwrap_or("");
                                let status_msg = data.get("message").and_then(|v| v.as_str());

                                log::info!("Got STATUS from webview: {} - {:?}", status_type, status_msg);

                                let _ = app.emit("connector-status", serde_json::json!({
                                    "runId": run_id,
                                    "status": data,
                                    "timestamp": chrono_timestamp()
                                }));

                                // Emit log
                                if let Some(msg) = status_msg {
                                    let _ = app.emit("connector-log", serde_json::json!({
                                        "runId": run_id,
                                        "message": msg,
                                        "timestamp": chrono_timestamp()
                                    }));
                                }

                                // Clear the hash so we can detect next status
                                let _ = webview.eval("window.location.hash = '';");
                            }
                        }
                    }
                }
            }
        }
    }

    // Remove from active windows
    CONNECTOR_WINDOWS.lock().unwrap().remove(&run_id);
    log::info!("Polling ended for run {}", run_id);
}

/// Decode base64 string using the base64 crate
fn base64_decode(input: &str) -> Result<Vec<u8>, String> {
    use base64::{Engine as _, engine::general_purpose::STANDARD};
    STANDARD.decode(input).map_err(|e| format!("Base64 decode error: {}", e))
}

fn chrono_timestamp() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64
}

/// Stop a connector run by closing its webview or killing the browser process
#[tauri::command]
pub async fn stop_connector_run(app: AppHandle, run_id: String) -> Result<(), String> {
    // Try to stop Playwright process first
    if let Some(mut process) = PLAYWRIGHT_PROCESSES.lock().unwrap().remove(&run_id) {
        log::info!("Killing Playwright process for run {}", run_id);
        #[cfg(unix)]
        {
            use crate::commands::server::kill_process_group;
            kill_process_group(process.id(), libc::SIGTERM);
            // Brief wait for graceful shutdown, then force kill
            for _ in 0..20 {
                if let Ok(Some(_)) = process.try_wait() {
                    return Ok(());
                }
                std::thread::sleep(std::time::Duration::from_millis(100));
            }
            kill_process_group(process.id(), libc::SIGKILL);
        }
        #[cfg(not(unix))]
        {
            let _ = process.kill();
        }
        let _ = process.wait();
        return Ok(());
    }

    // Try to get and remove the window label from the map
    let window_label = CONNECTOR_WINDOWS
        .lock()
        .unwrap()
        .remove(&run_id);

    // If we have a window label, try to close the window
    if let Some(label) = window_label {
        if let Some(window) = app.get_webview_window(&label) {
            let _ = window.close(); // Ignore close errors
        }
    }

    // Always return Ok - the run state is handled in the frontend
    Ok(())
}

/// Check if a platform is connected (has exported data)
#[tauri::command]
pub async fn check_connected_platforms(
    app: AppHandle,
    platform_ids: Vec<String>,
) -> Result<HashMap<String, bool>, String> {
    let mut connected = HashMap::new();

    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?
        .join("exported_data");

    // Build a map from platform ID to company name so we can check both paths
    let all_platforms = get_platforms(app).await.unwrap_or_default();
    let id_to_company: HashMap<String, String> = all_platforms
        .into_iter()
        .map(|p| (p.id.clone(), p.company))
        .collect();

    for id in platform_ids {
        // Check by platform ID directory or company name directory
        let exists = data_dir.join(&id).exists()
            || id_to_company
                .get(&id)
                .map(|company| data_dir.join(company).exists())
                .unwrap_or(false);
        connected.insert(id, exists);
    }

    Ok(connected)
}

/// Get the user data path
#[tauri::command]
pub fn get_user_data_path(app: AppHandle) -> Result<String, String> {
    app.path()
        .app_data_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| format!("Failed to get app data dir: {}", e))
}

/// Check if a browser is available for automation
#[tauri::command]
pub async fn check_browser_available(
    simulate_no_chrome: Option<bool>,
) -> Result<BrowserStatus, String> {
    // Skip system browser check if simulating no Chrome
    if !simulate_no_chrome.unwrap_or(false) {
        // Check for system Chrome/Edge first
        let system_browser = get_system_browser_path();
        if system_browser.is_some() {
            return Ok(BrowserStatus {
                available: true,
                browser_type: "system".to_string(),
                needs_download: false,
            });
        }
    }

    // Check for downloaded Chromium
    let downloaded = get_downloaded_chromium_path();
    if downloaded.is_some() {
        return Ok(BrowserStatus {
            available: true,
            browser_type: "downloaded".to_string(),
            needs_download: false,
        });
    }

    // No browser available
    Ok(BrowserStatus {
        available: false,
        browser_type: "none".to_string(),
        needs_download: true,
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BrowserStatus {
    pub available: bool,
    pub browser_type: String,
    pub needs_download: bool,
}

/// Get system browser path (Chrome/Edge)
fn get_system_browser_path() -> Option<PathBuf> {
    #[cfg(target_os = "macos")]
    {
        let paths = [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        ];
        for p in paths {
            let path = PathBuf::from(p);
            if path.exists() {
                return Some(path);
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        let paths = [
            "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
            "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        ];
        for p in paths {
            let path = PathBuf::from(p);
            if path.exists() {
                return Some(path);
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        let paths = [
            "/usr/bin/google-chrome",
            "/usr/bin/google-chrome-stable",
            "/usr/bin/chromium",
            "/usr/bin/chromium-browser",
        ];
        for p in paths {
            let path = PathBuf::from(p);
            if path.exists() {
                return Some(path);
            }
        }
    }

    None
}

/// Download Chromium browser (uses Rust-based download in production)
#[tauri::command]
pub async fn download_browser(app: AppHandle) -> Result<(), String> {
    // Use the Rust-based download which works in production without npx
    download_chromium_rust(app).await?;
    Ok(())
}

/// Test that Node.js runtime is working
#[tauri::command]
pub async fn test_nodejs(app: AppHandle) -> Result<serde_json::Value, String> {
    use std::io::{BufRead, BufReader, Write};
    use std::process::{Command, Stdio};

    // Get the playwright runner binary
    let (binary_path, _) = get_bundled_playwright_runner(&app)
        .ok_or("Playwright runner not found")?;

    let mut child = Command::new(&binary_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn playwright runner: {}", e))?;

    let mut stdin = child.stdin.take().ok_or("Failed to get stdin")?;
    let stdout = child.stdout.take().ok_or("Failed to get stdout")?;

    // Send test command
    writeln!(stdin, r#"{{"type":"test"}}"#)
        .map_err(|e| format!("Failed to send command: {}", e))?;

    // Read response
    let reader = BufReader::new(stdout);
    for line in reader.lines().flatten() {
        if let Ok(msg) = serde_json::from_str::<serde_json::Value>(&line) {
            if msg.get("type").and_then(|v| v.as_str()) == Some("test-result") {
                let _ = child.kill();
                return Ok(msg.get("data").cloned().unwrap_or(serde_json::Value::Null));
            }
        }
    }

    Err("No response from Node.js runtime".to_string())
}

/// Get downloaded Chromium path from ~/.dataconnect/browsers
fn get_downloaded_chromium_path() -> Option<PathBuf> {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .ok()?;

    let browsers_dir = PathBuf::from(&home).join(".dataconnect").join("browsers");
    if !browsers_dir.exists() {
        return None;
    }

    // Find chromium directory
    let entries = std::fs::read_dir(&browsers_dir).ok()?;
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with("chromium-") && !name.contains("headless") {
            let chromium_dir = entry.path();

            #[cfg(target_os = "macos")]
            {
                // Try arm64 first, then x64
                let paths = [
                    chromium_dir.join("chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
                    chromium_dir.join("chrome-mac/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
                ];
                for p in paths {
                    if p.exists() {
                        return Some(p);
                    }
                }
            }

            #[cfg(target_os = "windows")]
            {
                let paths = [
                    chromium_dir.join("chrome-win/chrome.exe"),
                    chromium_dir.join("chrome-win64/chrome.exe"),
                ];
                for p in paths {
                    if p.exists() {
                        return Some(p);
                    }
                }
            }

            #[cfg(target_os = "linux")]
            {
                let paths = [
                    chromium_dir.join("chrome-linux/chrome"),
                    chromium_dir.join("chrome-linux64/chrome"),
                ];
                for p in paths {
                    if p.exists() {
                        return Some(p);
                    }
                }
            }
        }
    }

    None
}

/// Get the Chromium download URL for the current platform
fn get_chromium_download_info() -> Option<(&'static str, &'static str)> {
    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    {
        Some(("chromium-mac-arm64.zip", "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"))
    }
    #[cfg(all(target_os = "macos", target_arch = "x86_64"))]
    {
        Some(("chromium-mac.zip", "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"))
    }
    #[cfg(target_os = "windows")]
    {
        Some(("chromium-win64.zip", "chrome-win64/chrome.exe"))
    }
    #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
    {
        Some(("chromium-linux.zip", "chrome-linux64/chrome"))
    }
    #[cfg(all(target_os = "linux", target_arch = "aarch64"))]
    {
        Some(("chromium-linux-arm64.zip", "chrome-linux/chrome"))
    }
    #[cfg(not(any(
        all(target_os = "macos", target_arch = "aarch64"),
        all(target_os = "macos", target_arch = "x86_64"),
        target_os = "windows",
        all(target_os = "linux", target_arch = "x86_64"),
        all(target_os = "linux", target_arch = "aarch64"),
    )))]
    {
        None
    }
}

/// Browser session info returned to the frontend
#[derive(Debug, Serialize, Deserialize)]
pub struct BrowserSessionInfo {
    #[serde(rename = "connectorId")]
    pub connector_id: String,
    pub path: String,
    #[serde(rename = "sizeBytes")]
    pub size_bytes: u64,
    #[serde(rename = "lastModified")]
    pub last_modified: String,
}

/// Recursively compute directory size in bytes
fn dir_size(path: &std::path::Path) -> u64 {
    walkdir::WalkDir::new(path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter_map(|e| e.metadata().ok())
        .map(|m| m.len())
        .sum()
}

/// List all stored browser sessions (profiles)
#[tauri::command]
pub async fn list_browser_sessions() -> Result<Vec<BrowserSessionInfo>, String> {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|_| "Could not determine home directory".to_string())?;

    let profiles_dir = PathBuf::from(&home)
        .join(".dataconnect")
        .join("browser-profiles");

    if !profiles_dir.exists() {
        return Ok(Vec::new());
    }

    let mut sessions = Vec::new();

    let entries = fs::read_dir(&profiles_dir)
        .map_err(|e| format!("Failed to read browser-profiles directory: {}", e))?;

    for entry in entries.flatten() {
        if !entry.path().is_dir() {
            continue;
        }

        let connector_id = entry.file_name().to_string_lossy().to_string();
        let path = entry.path();
        let size_bytes = dir_size(&path);

        let last_modified = entry
            .metadata()
            .ok()
            .and_then(|m| m.modified().ok())
            .map(|t| {
                let duration = t
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default();
                // Return as ISO-ish timestamp (milliseconds since epoch)
                let secs = duration.as_secs();
                // Format as ISO 8601 manually
                let dt = chrono::DateTime::from_timestamp(secs as i64, 0)
                    .unwrap_or_default();
                dt.to_rfc3339()
            })
            .unwrap_or_default();

        sessions.push(BrowserSessionInfo {
            connector_id,
            path: path.to_string_lossy().to_string(),
            size_bytes,
            last_modified,
        });
    }

    Ok(sessions)
}

/// Clear (delete) a stored browser session for a given connector
#[tauri::command]
pub async fn clear_browser_session(connector_id: String) -> Result<(), String> {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|_| "Could not determine home directory".to_string())?;

    let profile_dir = PathBuf::from(&home)
        .join(".dataconnect")
        .join("browser-profiles")
        .join(&connector_id);

    if !profile_dir.exists() {
        return Ok(());
    }

    // Verify the path is within browser-profiles to prevent directory traversal
    let profiles_parent = PathBuf::from(&home)
        .join(".dataconnect")
        .join("browser-profiles");
    if !profile_dir.starts_with(&profiles_parent) {
        return Err("Invalid connector ID".to_string());
    }

    fs::remove_dir_all(&profile_dir)
        .map_err(|e| format!("Failed to delete browser profile: {}", e))?;

    log::info!("Cleared browser session for connector: {}", connector_id);
    Ok(())
}

/// Download Chromium browser using Rust (production-ready)
#[tauri::command]
pub async fn download_chromium_rust(app: AppHandle) -> Result<String, String> {
    use futures_util::StreamExt;

    log::info!("Starting Rust-based Chromium download");

    // Get platform-specific download info
    let (zip_filename, exe_path) = get_chromium_download_info()
        .ok_or("Unsupported platform for Chromium download")?;

    // Create browsers directory
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|_| "Could not determine home directory")?;

    let browsers_dir = PathBuf::from(&home).join(".dataconnect").join("browsers");
    std::fs::create_dir_all(&browsers_dir)
        .map_err(|e| format!("Failed to create browsers directory: {}", e))?;

    let chromium_dir = browsers_dir.join(format!("chromium-{}", CHROMIUM_REVISION));
    let final_exe_path = chromium_dir.join(exe_path);

    // Check if already downloaded
    if final_exe_path.exists() {
        log::info!("Chromium already downloaded at {:?}", final_exe_path);
        return Ok(final_exe_path.to_string_lossy().to_string());
    }

    // Build download URL - try mirrors in order
    let mut download_url = String::new();
    let client = reqwest::Client::new();

    for mirror in CHROMIUM_CDN_MIRRORS {
        let url = format!("{}/builds/chromium/{}/{}", mirror, CHROMIUM_REVISION, zip_filename);
        log::info!("Trying mirror: {}", url);

        match client.head(&url).send().await {
            Ok(resp) if resp.status().is_success() => {
                download_url = url;
                break;
            }
            Ok(resp) => {
                log::warn!("Mirror {} returned status: {}", mirror, resp.status());
            }
            Err(e) => {
                log::warn!("Mirror {} failed: {}", mirror, e);
            }
        }
    }

    if download_url.is_empty() {
        return Err("All Chromium download mirrors failed".to_string());
    }

    log::info!("Downloading from: {}", download_url);

    // Emit starting progress
    let _ = app.emit("browser-download-progress", serde_json::json!({
        "status": "downloading",
        "message": "Downloading Chromium browser...",
        "progress": 0
    }));

    // Download with progress
    let response = client
        .get(&download_url)
        .send()
        .await
        .map_err(|e| format!("Download request failed: {}", e))?;

    let total_size = response.content_length().unwrap_or(0);
    log::info!("Download size: {} bytes", total_size);

    let zip_path = browsers_dir.join(format!("chromium-{}.zip", CHROMIUM_REVISION));
    let mut file = std::fs::File::create(&zip_path)
        .map_err(|e| format!("Failed to create zip file: {}", e))?;

    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();
    let mut last_progress = 0u64;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Download stream error: {}", e))?;
        file.write_all(&chunk)
            .map_err(|e| format!("Failed to write chunk: {}", e))?;

        downloaded += chunk.len() as u64;

        // Emit progress every 1MB
        if total_size > 0 && downloaded - last_progress > 1_000_000 {
            last_progress = downloaded;
            let progress = (downloaded as f64 / total_size as f64 * 100.0) as u32;
            let _ = app.emit("browser-download-progress", serde_json::json!({
                "status": "downloading",
                "message": format!("Downloading Chromium... {}%", progress),
                "progress": progress,
                "downloaded": downloaded,
                "total": total_size
            }));
        }
    }

    drop(file);
    log::info!("Download complete, extracting...");

    // Emit extracting progress
    let _ = app.emit("browser-download-progress", serde_json::json!({
        "status": "extracting",
        "message": "Extracting Chromium...",
        "progress": 100
    }));

    // Extract zip
    let zip_file = std::fs::File::open(&zip_path)
        .map_err(|e| format!("Failed to open zip file: {}", e))?;

    let mut archive = zip::ZipArchive::new(zip_file)
        .map_err(|e| format!("Failed to read zip archive: {}", e))?;

    // Create extraction directory
    std::fs::create_dir_all(&chromium_dir)
        .map_err(|e| format!("Failed to create chromium directory: {}", e))?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)
            .map_err(|e| format!("Failed to read zip entry: {}", e))?;

        let outpath = chromium_dir.join(file.mangled_name());

        if file.name().ends_with('/') {
            std::fs::create_dir_all(&outpath)
                .map_err(|e| format!("Failed to create directory: {}", e))?;
        } else {
            if let Some(parent) = outpath.parent() {
                std::fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create parent directory: {}", e))?;
            }
            let mut outfile = std::fs::File::create(&outpath)
                .map_err(|e| format!("Failed to create file: {}", e))?;
            std::io::copy(&mut file, &mut outfile)
                .map_err(|e| format!("Failed to extract file: {}", e))?;

            // Set executable permission on Unix
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                if let Some(mode) = file.unix_mode() {
                    std::fs::set_permissions(&outpath, std::fs::Permissions::from_mode(mode)).ok();
                }
            }
        }
    }

    // Clean up zip file
    std::fs::remove_file(&zip_path).ok();

    // Verify executable exists
    if !final_exe_path.exists() {
        return Err(format!("Chromium executable not found after extraction at {:?}", final_exe_path));
    }

    // Set executable permission on the Chrome binary (macOS/Linux)
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&final_exe_path, std::fs::Permissions::from_mode(0o755))
            .map_err(|e| format!("Failed to set executable permission: {}", e))?;
    }

    log::info!("Chromium extraction complete: {:?}", final_exe_path);

    // Emit complete
    let _ = app.emit("browser-download-progress", serde_json::json!({
        "status": "complete",
        "message": "Browser download complete",
        "path": final_exe_path.to_string_lossy()
    }));

    Ok(final_exe_path.to_string_lossy().to_string())
}
