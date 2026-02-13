use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};

static PERSONAL_SERVER_PROCESS: Mutex<Option<std::process::Child>> = Mutex::new(None);
pub static PERSONAL_SERVER_PORT: Mutex<Option<u16>> = Mutex::new(None);
static PERSONAL_SERVER_STARTING: Mutex<bool> = Mutex::new(false);
pub static PERSONAL_SERVER_DEV_TOKEN: Mutex<Option<String>> = Mutex::new(None);
/// Set to true by stop_personal_server so the stdout reader thread knows
/// the exit was intentional and should NOT emit personal-server-exited.
static PERSONAL_SERVER_STOPPING: Mutex<bool> = Mutex::new(false);

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PersonalServerStatus {
    pub running: bool,
    pub port: Option<u16>,
}

/// Resolve the bundled personal-server binary path
fn get_bundled_personal_server(app: &AppHandle) -> Option<PathBuf> {
    let resource_dir = app.path().resource_dir().ok()?;

    #[cfg(target_os = "macos")]
    let binary_name = "personal-server";
    #[cfg(target_os = "windows")]
    let binary_name = "personal-server.exe";
    #[cfg(target_os = "linux")]
    let binary_name = "personal-server";

    // Check all possible locations
    let candidates = [
        // Production: resources are copied into personal-server/dist/
        resource_dir.join("personal-server").join("dist").join(binary_name),
        // CI builds
        resource_dir.join("binaries").join(binary_name),
        // Local builds (tauri dev with _up_ prefix)
        resource_dir.join("_up_").join("personal-server").join("dist").join(binary_name),
    ];

    for candidate in &candidates {
        if candidate.exists() {
            // Verify that node_modules/ exists alongside the binary.
            // Native addons (e.g. better-sqlite3) can't be embedded in the pkg snapshot
            // and must live on the real filesystem. In dev mode Tauri's resource glob
            // only copies the binary, not node_modules/, so skip incomplete copies
            // and fall through to the dev-mode path that uses the source tree.
            let dist_dir = candidate.parent().unwrap_or(candidate);
            if !dist_dir.join("node_modules").exists() {
                log::warn!(
                    "Skipping {:?}: node_modules/ not found alongside binary",
                    candidate
                );
                continue;
            }
            log::info!("Found bundled personal server at {:?}", candidate);
            return Some(candidate.clone());
        }
    }

    log::warn!("Personal server binary not found. Checked: {:?}", candidates);
    None
}

/// Start the bundled personal server
#[tauri::command]
pub async fn start_personal_server(
    app: AppHandle,
    port: Option<u16>,
    master_key_signature: Option<String>,
    gateway_url: Option<String>,
    owner_address: Option<String>,
) -> Result<PersonalServerStatus, String> {
    use std::io::{BufRead, BufReader};
    use std::process::{Command, Stdio};

    // Clear the stopping flag from any previous stop
    if let Ok(mut s) = PERSONAL_SERVER_STOPPING.lock() {
        *s = false;
    }

    // Prevent concurrent spawns
    {
        let mut starting = PERSONAL_SERVER_STARTING.lock().map_err(|e| e.to_string())?;
        if *starting {
            log::info!("Personal server is already being started, skipping");
            let port_guard = PERSONAL_SERVER_PORT.lock().map_err(|e| e.to_string())?;
            return Ok(PersonalServerStatus {
                running: true,
                port: *port_guard,
            });
        }
        let guard = PERSONAL_SERVER_PROCESS.lock().map_err(|e| e.to_string())?;
        if guard.is_some() {
            let port_guard = PERSONAL_SERVER_PORT.lock().map_err(|e| e.to_string())?;
            return Ok(PersonalServerStatus {
                running: true,
                port: *port_guard,
            });
        }
        *starting = true;
    }

    // Helper to clear starting flag on error
    let clear_starting = || {
        if let Ok(mut s) = PERSONAL_SERVER_STARTING.lock() {
            *s = false;
        }
    };

    let port = if let Some(p) = port {
        p
    } else {
        // Find a free port, preferring 8080
        let preferred = [8080u16, 8081, 8082, 8083, 8084, 8085];
        let mut found = None;
        for p in preferred {
            // Check both IPv4 and IPv6 — the PS binds on :::PORT (all interfaces)
            if std::net::TcpListener::bind(("127.0.0.1", p)).is_ok()
                && std::net::TcpListener::bind(("::1", p)).is_ok()
            {
                found = Some(p);
                break;
            }
        }
        match found {
            Some(p) => p,
            None => {
                // Bind to port 0 to get any free port
                let listener = std::net::TcpListener::bind("127.0.0.1:0")
                    .map_err(|e| { clear_starting(); format!("No free port available: {}", e) })?;
                listener.local_addr()
                    .map_err(|e| { clear_starting(); format!("Failed to get port: {}", e) })?
                    .port()
            }
        }
    };
    log::info!("Starting personal server on port {}", port);

    // Build env vars
    let mut env_vars: Vec<(&str, String)> = vec![
        ("PORT", port.to_string()),
        ("NODE_ENV", "production".to_string()),
    ];
    if let Some(ref sig) = master_key_signature {
        env_vars.push(("VANA_MASTER_KEY_SIGNATURE", sig.clone()));
    }
    if let Some(ref url) = gateway_url {
        env_vars.push(("GATEWAY_URL", url.clone()));
    }
    if let Some(ref addr) = owner_address {
        env_vars.push(("OWNER_ADDRESS", addr.clone()));
    }

    // Get config dir (~/data-connect/personal-server)
    if let Some(home) = dirs::home_dir() {
        let config_dir = home.join("data-connect").join("personal-server");
        env_vars.push(("CONFIG_DIR", config_dir.to_string_lossy().to_string()));
    }

    let mut child = if let Some(binary_path) = get_bundled_personal_server(&app) {
        // Re-sign on macOS
        #[cfg(target_os = "macos")]
        {
            log::info!("Re-signing bundled personal server for macOS...");
            if let Ok(output) = Command::new("codesign")
                .arg("--force")
                .arg("--sign")
                .arg("-")
                .arg(&binary_path)
                .output()
            {
                if !output.status.success() {
                    log::warn!(
                        "Failed to codesign personal server: {}",
                        String::from_utf8_lossy(&output.stderr)
                    );
                }
            }
        }

        let mut cmd = Command::new(&binary_path);
        cmd.stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        for (key, val) in &env_vars {
            cmd.env(key, val);
        }

        cmd.spawn()
            .map_err(|e| { clear_starting(); format!("Failed to spawn personal server: {}", e) })?
    } else {
        // Dev mode: find personal-server directory relative to project root
        let runner_dir = if let Ok(manifest_dir) = std::env::var("CARGO_MANIFEST_DIR") {
            PathBuf::from(&manifest_dir).parent().map(|p| p.join("personal-server")).unwrap_or_default()
        } else if let Ok(exe_path) = std::env::current_exe() {
            exe_path.parent()
                .and_then(|p| p.parent())
                .and_then(|p| p.parent())
                .and_then(|p| p.parent())
                .map(|p| p.join("personal-server"))
                .unwrap_or_default()
        } else {
            PathBuf::from("personal-server")
        };

        if !runner_dir.exists() {
            clear_starting();
            return Err(format!(
                "Personal server not found: {:?}. Run 'npm install' in personal-server directory.",
                runner_dir
            ));
        }

        // Try the built binary in dist/ first (built by ensure-personal-server.js)
        #[cfg(target_os = "macos")]
        let dev_binary_name = "personal-server";
        #[cfg(target_os = "windows")]
        let dev_binary_name = "personal-server.exe";
        #[cfg(target_os = "linux")]
        let dev_binary_name = "personal-server";

        let dev_binary = runner_dir.join("dist").join(dev_binary_name);
        if dev_binary.exists() {
            log::info!("Using dev binary at {:?}", dev_binary);
            let mut cmd = Command::new(&dev_binary);
            cmd.stdin(Stdio::null())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped());

            for (key, val) in &env_vars {
                cmd.env(key, val);
            }

            cmd.spawn()
                .map_err(|e| { clear_starting(); format!("Failed to spawn personal server (dev binary): {}", e) })?
        } else {
            // Fallback: node index.js (requires npm install)
            log::info!("No dev binary found, using node index.js at {:?}", runner_dir);
            let mut cmd = Command::new("node");
            cmd.arg("index.js")
                .current_dir(&runner_dir)
                .stdin(Stdio::null())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped());

            for (key, val) in &env_vars {
                cmd.env(key, val);
            }

            cmd.spawn()
                .map_err(|e| { clear_starting(); format!("Failed to spawn personal server (dev): {}", e) })?
        }
    };

    let stdout = child.stdout.take().ok_or_else(|| { clear_starting(); "Failed to get stdout".to_string() })?;
    let stderr = child.stderr.take().ok_or_else(|| { clear_starting(); "Failed to get stderr".to_string() })?;

    // Store process
    {
        let mut guard = PERSONAL_SERVER_PROCESS
            .lock()
            .map_err(|e| e.to_string())?;
        *guard = Some(child);
    }
    {
        let mut guard = PERSONAL_SERVER_PORT.lock().map_err(|e| e.to_string())?;
        *guard = Some(port);
    }
    // Clear starting flag
    {
        let mut starting = PERSONAL_SERVER_STARTING.lock().map_err(|e| e.to_string())?;
        *starting = false;
    }

    // Read stdout in background thread
    let app_handle = app.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            match line {
                Ok(line) => {
                    if let Ok(msg) = serde_json::from_str::<serde_json::Value>(&line) {
                        let msg_type = msg.get("type").and_then(|t| t.as_str()).unwrap_or("");
                        match msg_type {
                            "ready" => {
                                let port = msg.get("port").and_then(|p| p.as_u64()).map(|p| p as u16);
                                log::info!("Personal server ready on port {:?}", port);
                                let _ = app_handle.emit(
                                    "personal-server-ready",
                                    serde_json::json!({ "port": port }),
                                );
                            }
                            "error" => {
                                let message = msg.get("message").and_then(|m| m.as_str()).unwrap_or("Unknown error");
                                log::error!("Personal server error: {}", message);
                                let _ = app_handle.emit(
                                    "personal-server-error",
                                    serde_json::json!({ "message": message }),
                                );
                            }
                            "tunnel" => {
                                let url = msg.get("url").and_then(|u| u.as_str()).unwrap_or("");
                                log::info!("Personal server tunnel: {}", url);
                                let _ = app_handle.emit(
                                    "personal-server-tunnel",
                                    serde_json::json!({ "url": url }),
                                );
                            }
                            "log" => {
                                let message = msg.get("message").and_then(|m| m.as_str()).unwrap_or("");
                                log::info!("Personal server: {}", message);
                                let _ = app_handle.emit(
                                    "personal-server-log",
                                    serde_json::json!({ "message": message }),
                                );
                            }
                            "tunnel-failed" => {
                                let message = msg.get("message").and_then(|m| m.as_str()).unwrap_or("");
                                log::warn!("Personal server tunnel failed: {}", message);
                                let _ = app_handle.emit(
                                    "personal-server-tunnel-failed",
                                    serde_json::json!({ "message": message }),
                                );
                            }
                            "dev-token" => {
                                let token = msg.get("token").and_then(|t| t.as_str()).unwrap_or("");
                                log::info!("Personal server dev token received");
                                if let Ok(mut guard) = PERSONAL_SERVER_DEV_TOKEN.lock() {
                                    *guard = Some(token.to_string());
                                }
                                let _ = app_handle.emit(
                                    "personal-server-dev-token",
                                    serde_json::json!({ "token": token }),
                                );
                            }
                            _ => {
                                log::debug!("Personal server stdout: {}", line);
                            }
                        }
                    } else {
                        log::debug!("Personal server stdout: {}", line);
                    }
                }
                Err(e) => {
                    log::error!("Personal server stdout read error: {}", e);
                    break;
                }
            }
        }

        // Pipe closed — process has exited.
        log::info!("Personal server stdout reader ended — process exited");

        // If stop_personal_server set the stopping flag, this is an intentional
        // shutdown — it already cleaned up global state, so skip the event.
        let was_intentional = PERSONAL_SERVER_STOPPING
            .lock()
            .map(|s| *s)
            .unwrap_or(false);

        if was_intentional {
            log::info!("Personal server stopped intentionally, skipping exited event");
        } else {
            // Unexpected exit — collect exit code and notify frontend.
            let exit_code: Option<i32> = PERSONAL_SERVER_PROCESS
                .lock()
                .ok()
                .and_then(|mut guard| {
                    guard.as_mut().and_then(|child| {
                        child.try_wait().ok().flatten().and_then(|status| status.code())
                    })
                });

            // Clear all global state so a new start can proceed
            if let Ok(mut guard) = PERSONAL_SERVER_PROCESS.lock() {
                *guard = None;
            }
            if let Ok(mut guard) = PERSONAL_SERVER_PORT.lock() {
                *guard = None;
            }
            if let Ok(mut guard) = PERSONAL_SERVER_STARTING.lock() {
                *guard = false;
            }
            if let Ok(mut guard) = PERSONAL_SERVER_DEV_TOKEN.lock() {
                *guard = None;
            }

            let crashed = exit_code.map(|c| c != 0).unwrap_or(true);
            log::info!(
                "Personal server exited: code={:?}, crashed={}",
                exit_code,
                crashed
            );
            let _ = app_handle.emit(
                "personal-server-exited",
                serde_json::json!({ "exitCode": exit_code, "crashed": crashed }),
            );
        }
    });

    // Read stderr in background thread
    std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            match line {
                Ok(line) => {
                    log::warn!("Personal server stderr: {}", line);
                }
                Err(_) => break,
            }
        }
    });

    Ok(PersonalServerStatus {
        running: true,
        port: Some(port),
    })
}

/// Stop the personal server
#[tauri::command]
pub async fn stop_personal_server() -> Result<(), String> {
    // Tell the stdout reader thread this is an intentional stop
    if let Ok(mut s) = PERSONAL_SERVER_STOPPING.lock() {
        *s = true;
    }

    // Reset starting flag in case a start is pending
    if let Ok(mut s) = PERSONAL_SERVER_STARTING.lock() {
        *s = false;
    }

    let mut guard = PERSONAL_SERVER_PROCESS
        .lock()
        .map_err(|e| e.to_string())?;

    if let Some(mut child) = guard.take() {
        log::info!("Stopping personal server...");

        // Try graceful shutdown first
        #[cfg(unix)]
        {
            unsafe {
                libc::kill(child.id() as libc::pid_t, libc::SIGTERM);
            }
        }

        // Wait for process to exit (up to 5s)
        for _ in 0..50 {
            match child.try_wait() {
                Ok(Some(_)) => {
                    log::info!("Personal server exited gracefully");
                    break;
                }
                _ => {
                    std::thread::sleep(std::time::Duration::from_millis(100));
                }
            }
        }

        // Force kill if still running
        if child.try_wait().map(|s| s.is_none()).unwrap_or(true) {
            let _ = child.kill();
            let _ = child.wait();
            log::info!("Personal server force-killed");
        }
    }

    let mut port_guard = PERSONAL_SERVER_PORT.lock().map_err(|e| e.to_string())?;
    let old_port = *port_guard;
    *port_guard = None;

    // Clear dev token
    if let Ok(mut token) = PERSONAL_SERVER_DEV_TOKEN.lock() {
        *token = None;
    }

    // Wait for port to be released on both IPv4 and IPv6 (up to 3s)
    if let Some(port) = old_port {
        for _ in 0..30 {
            if std::net::TcpListener::bind(("0.0.0.0", port)).is_ok()
                && std::net::TcpListener::bind(("::1", port)).is_ok()
            {
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(100));
        }
    }

    Ok(())
}

/// Get personal server status
#[tauri::command]
pub fn get_personal_server_status() -> Result<PersonalServerStatus, String> {
    let mut guard = PERSONAL_SERVER_PROCESS
        .lock()
        .map_err(|e| e.to_string())?;
    let port_guard = PERSONAL_SERVER_PORT.lock().map_err(|e| e.to_string())?;

    // Check if process is still running
    if let Some(ref mut child) = *guard {
        match child.try_wait() {
            Ok(Some(_)) => {
                // Process has exited
                *guard = None;
                return Ok(PersonalServerStatus {
                    running: false,
                    port: None,
                });
            }
            Ok(None) => {
                // Still running
                return Ok(PersonalServerStatus {
                    running: true,
                    port: *port_guard,
                });
            }
            Err(_) => {}
        }
    }

    Ok(PersonalServerStatus {
        running: false,
        port: None,
    })
}

/// Kill the personal server process on app exit (sync, best-effort)
pub fn cleanup_personal_server() {
    // Mark as intentional so the reader thread doesn't emit exited event
    if let Ok(mut s) = PERSONAL_SERVER_STOPPING.lock() {
        *s = true;
    }
    if let Ok(mut guard) = PERSONAL_SERVER_PROCESS.lock() {
        if let Some(mut child) = guard.take() {
            log::info!("Cleaning up personal server on app exit...");
            #[cfg(unix)]
            unsafe {
                libc::kill(child.id() as libc::pid_t, libc::SIGTERM);
            }
            // Brief wait then force kill
            for _ in 0..10 {
                if let Ok(Some(_)) = child.try_wait() {
                    log::info!("Personal server exited on cleanup");
                    return;
                }
                std::thread::sleep(std::time::Duration::from_millis(100));
            }
            let _ = child.kill();
            let _ = child.wait();
            log::info!("Personal server force-killed on cleanup");
        }
    }
}
