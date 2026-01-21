use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

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

/// Get the connectors directory path
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
            log::info!("Found connectors at: {:?}", dev_path);
            return dev_path;
        }
    }

    // Try relative to current directory (for when running from project root)
    let cwd_path = std::env::current_dir()
        .unwrap_or_default()
        .join("connectors");
    if cwd_path.exists() {
        log::info!("Found connectors at: {:?}", cwd_path);
        return cwd_path;
    }

    // Try relative to executable location (development fallback)
    if let Ok(exe_path) = std::env::current_exe() {
        // In dev: exe is at src-tauri/target/debug/databridge
        // Project root is 4 levels up
        if let Some(project_root) = exe_path
            .parent()  // target/debug
            .and_then(|p| p.parent())  // target
            .and_then(|p| p.parent())  // src-tauri
            .and_then(|p| p.parent())  // project root
        {
            let dev_path = project_root.join("connectors");
            if dev_path.exists() {
                log::info!("Found connectors at: {:?}", dev_path);
                return dev_path;
            }
        }
    }

    // Try resource path for bundled app (production)
    let resource_path = app.path()
        .resource_dir()
        .unwrap_or_default()
        .join("connectors");

    log::info!("Using resource connectors path: {:?}", resource_path);
    resource_path
}

/// Load all platform connectors from the connectors directory
#[tauri::command]
pub async fn get_platforms(app: AppHandle) -> Result<Vec<Platform>, String> {
    let connectors_dir = get_connectors_dir(&app);
    let mut platforms = Vec::new();

    if !connectors_dir.exists() {
        log::warn!("Connectors directory not found: {:?}", connectors_dir);
        return Ok(platforms);
    }

    // Walk through the connectors directory
    for entry in walkdir::WalkDir::new(&connectors_dir)
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

            // Skip type definition files
            if filename == "connector" {
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

    Ok(platforms)
}

/// Active connector windows
static CONNECTOR_WINDOWS: std::sync::LazyLock<
    std::sync::Mutex<HashMap<String, String>>,
> = std::sync::LazyLock::new(|| std::sync::Mutex::new(HashMap::new()));

/// Load connector script from the connectors directory
fn load_connector_script(app: &AppHandle, company: &str, filename: &str) -> Option<String> {
    let connectors_dir = get_connectors_dir(app);

    // Try to load the .js file first, then .ts
    let js_path = connectors_dir.join(company.to_lowercase()).join(format!("{}.js", filename));
    let ts_path = connectors_dir.join(company.to_lowercase()).join(format!("{}.ts", filename));

    log::info!("Looking for connector script at: {:?}", js_path);

    if js_path.exists() {
        match fs::read_to_string(&js_path) {
            Ok(content) => {
                log::info!("Loaded connector script: {:?}", js_path);
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

/// Start a connector run using Playwright sidecar
async fn start_playwright_run(
    app: AppHandle,
    run_id: String,
    platform_id: String,
    filename: String,
    company: String,
    name: String,
    connect_url: String,
) -> Result<(), String> {
    use std::io::{BufRead, BufReader, Write};
    use std::process::{Command, Stdio};

    log::info!("Starting Playwright run for {}", run_id);

    // Get paths
    let connectors_dir = get_connectors_dir(&app);
    let connector_path = connectors_dir
        .join(company.to_lowercase())
        .join(format!("{}.js", filename));

    if !connector_path.exists() {
        return Err(format!("Connector script not found: {:?}", connector_path));
    }

    // Get playwright-runner directory
    let runner_dir = connectors_dir.parent()
        .map(|p| p.join("playwright-runner"))
        .ok_or("Could not find playwright-runner directory")?;

    if !runner_dir.exists() {
        return Err(format!("Playwright runner not found: {:?}. Run 'npm install' in playwright-runner directory.", runner_dir));
    }

    // Spawn the Node.js process
    let mut child = Command::new("node")
        .arg("index.js")
        .current_dir(&runner_dir)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn Playwright runner: {}", e))?;

    // Get handles to stdin/stdout
    let mut stdin = child.stdin.take().ok_or("Failed to get stdin")?;
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

    std::thread::spawn(move || {
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
                        if let Some(status) = msg.get("status").and_then(|v| v.as_str()) {
                            let _ = app_clone.emit("connector-status", serde_json::json!({
                                "runId": run_id_for_stdout,
                                "status": { "type": status },
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

    // Send the run command
    let run_cmd = serde_json::json!({
        "type": "run",
        "runId": run_id,
        "connectorPath": connector_path.to_string_lossy(),
        "url": connect_url
    });

    writeln!(stdin, "{}", run_cmd.to_string())
        .map_err(|e| format!("Failed to send run command: {}", e))?;

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
) -> Result<(), String> {
    // Check if this is a Playwright runtime connector
    if runtime.as_deref() == Some("playwright") {
        return start_playwright_run(
            app, run_id, platform_id, filename, company, name, connect_url
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
        // DataBridge Connector API
        const __RUN_ID__ = "{}";
        const __PLATFORM_ID__ = "{}";
        const __FILENAME__ = "{}";
        const __COMPANY__ = "{}";
        const __NAME__ = "{}";

        // Define log function first so other functions can reference it
        const __databridgeLog = function(...args) {{
            const stringArgs = args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            );
            console.log('[DataBridge]', ...stringArgs);
            if (window.__TAURI__ && window.__TAURI__.event) {{
                window.__TAURI__.event.emit('connector-log', {{
                    runId: __RUN_ID__,
                    message: stringArgs.join(' '),
                    timestamp: Date.now()
                }});
            }}
        }};

        window.__DATABRIDGE_API__ = {{
            log: __databridgeLog,
            waitForElement: function(selector, elementName, multipleElements = false, timeout = 10000) {{
                if (!multipleElements) {{
                    __databridgeLog('Waiting for ' + elementName);
                }}
                return new Promise((resolve) => {{
                    const startTime = Date.now();
                    const checkElement = () => {{
                        const element = multipleElements
                            ? document.querySelectorAll(selector)
                            : document.querySelector(selector);
                        if (element && (multipleElements ? element.length > 0 : true)) {{
                            if (!multipleElements) {{
                                __databridgeLog('Found ' + elementName);
                            }}
                            resolve(element);
                        }} else if (Date.now() - startTime >= timeout) {{
                            __databridgeLog('Timeout waiting for ' + elementName);
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
                __databridgeLog('Status: ' + (typeof status === 'string' ? status : JSON.stringify(status)));
                if (window.__TAURI__ && window.__TAURI__.event) {{
                    window.__TAURI__.event.emit('connector-status', {{
                        runId: __RUN_ID__,
                        status: status,
                        timestamp: Date.now()
                    }});
                }}
            }},
            navigate: function(url) {{
                __databridgeLog('Navigating to: ' + url);
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

        window.__DATABRIDGE_RUN_ID__ = __RUN_ID__;
        window.__DATABRIDGE_PLATFORM_ID__ = __PLATFORM_ID__;
        window.__DATABRIDGE_FILENAME__ = __FILENAME__;
        window.__DATABRIDGE_COMPANY__ = __COMPANY__;
        window.__DATABRIDGE_NAME__ = __NAME__;

        console.log('[DataBridge] API initialized for run:', __RUN_ID__);
        "#,
        run_id, platform_id, filename, company, name
    );

    // Combine the API script with the connector script
    // The connector script runs after page loads and stores results in window.__DATABRIDGE_RESULT__
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
                        console.error('[DataBridge] Connector error:', e);
                        window.__DATABRIDGE_STATUS__ = {{ type: 'ERROR', message: e.message }};
                        window.__DATABRIDGE_RESULT__ = {{ error: e.message }};
                    }}
                }}, 2000);
            }});
        }} else {{
            setTimeout(function() {{
                try {{
                    {}
                }} catch (e) {{
                    console.error('[DataBridge] Connector error:', e);
                    window.__DATABRIDGE_STATUS__ = {{ type: 'ERROR', message: e.message }};
                    window.__DATABRIDGE_RESULT__ = {{ error: e.message }};
                }}
            }}, 2000);
        }}
        "#,
        api_script, network_capture_script, page_api_script, connector_script, connector_script
    );

    // Create the webview window
    let webview = WebviewWindowBuilder::new(&app, &window_label, WebviewUrl::External(connect_url.parse().map_err(|e| format!("Invalid URL: {}", e))?))
        .title(format!("DataBridge - {}", name))
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
                    var result = window.__DATABRIDGE_RESULT__;
                    var status = window.__DATABRIDGE_STATUS__;

                    if (result && !window.__DATABRIDGE_HASH_SET__) {
                        window.__DATABRIDGE_HASH_SET__ = true;
                        var encoded = btoa(unescape(encodeURIComponent(JSON.stringify({
                            type: 'RESULT',
                            data: result
                        }))));
                        window.location.hash = 'DATABRIDGE_' + encoded;
                        return;
                    }

                    if (status && status.type && !window.__DATABRIDGE_HASH_SET__) {
                        var statusKey = status.type + '_' + (status.message || '');
                        if (window.__DATABRIDGE_LAST_STATUS_KEY__ !== statusKey) {
                            window.__DATABRIDGE_LAST_STATUS_KEY__ = statusKey;
                            var encoded = btoa(unescape(encodeURIComponent(JSON.stringify({
                                type: 'STATUS',
                                data: status
                            }))));
                            window.location.hash = 'DATABRIDGE_' + encoded;
                        }
                    }
                } catch(e) {
                    console.error('[DataBridge Poll] Error:', e);
                }
            })();
        "#;

        let _ = webview.eval(check_script);

        // Small delay for script to execute
        tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;

        // Read the URL to check the hash
        if let Ok(url) = webview.url() {
            let url_str = url.to_string();
            if let Some(hash_pos) = url_str.find("#DATABRIDGE_") {
                let hash = &url_str[hash_pos + 12..]; // Skip "#DATABRIDGE_"

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

/// Stop a connector run by closing its webview or killing the Playwright process
#[tauri::command]
pub async fn stop_connector_run(app: AppHandle, run_id: String) -> Result<(), String> {
    // Try to stop Playwright process first
    if let Some(mut process) = PLAYWRIGHT_PROCESSES.lock().unwrap().remove(&run_id) {
        log::info!("Killing Playwright process for run {}", run_id);
        let _ = process.kill();
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

    for id in platform_ids {
        // Check if the platform directory exists
        let platform_path = data_dir.join(&id);
        connected.insert(id, platform_path.exists());
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
