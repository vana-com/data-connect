use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};

static PERSONAL_SERVER_PROCESS: Mutex<Option<std::process::Child>> = Mutex::new(None);
static PERSONAL_SERVER_PORT: Mutex<Option<u16>> = Mutex::new(None);

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
) -> Result<PersonalServerStatus, String> {
    use std::io::{BufRead, BufReader};
    use std::process::{Command, Stdio};

    // Check if already running
    {
        let guard = PERSONAL_SERVER_PROCESS.lock().map_err(|e| e.to_string())?;
        if guard.is_some() {
            let port_guard = PERSONAL_SERVER_PORT.lock().map_err(|e| e.to_string())?;
            return Ok(PersonalServerStatus {
                running: true,
                port: *port_guard,
            });
        }
    }

    let port = port.unwrap_or(8080);
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

    // Get config dir (~/.vana)
    if let Some(home) = dirs::home_dir() {
        let config_dir = home.join(".vana");
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
            .map_err(|e| format!("Failed to spawn personal server: {}", e))?
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
                .map_err(|e| format!("Failed to spawn personal server (dev binary): {}", e))?
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
                .map_err(|e| format!("Failed to spawn personal server (dev): {}", e))?
        }
    };

    let stdout = child.stdout.take().ok_or("Failed to get stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to get stderr")?;

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
                            "log" => {
                                let message = msg.get("message").and_then(|m| m.as_str()).unwrap_or("");
                                log::info!("Personal server: {}", message);
                                let _ = app_handle.emit(
                                    "personal-server-log",
                                    serde_json::json!({ "message": message }),
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
        log::info!("Personal server stdout reader ended");
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
    let mut guard = PERSONAL_SERVER_PROCESS
        .lock()
        .map_err(|e| e.to_string())?;

    if let Some(mut child) = guard.take() {
        log::info!("Stopping personal server...");

        // Try graceful shutdown first
        #[cfg(unix)]
        {
            unsafe {
                // SIGTERM = 15
                libc::kill(child.id() as libc::pid_t, libc::SIGTERM);
            }
            // Wait briefly for graceful shutdown
            std::thread::sleep(std::time::Duration::from_millis(2000));
        }

        // Force kill if still running
        match child.try_wait() {
            Ok(Some(_)) => {
                log::info!("Personal server exited gracefully");
            }
            _ => {
                let _ = child.kill();
                log::info!("Personal server force-killed");
            }
        }
    }

    let mut port_guard = PERSONAL_SERVER_PORT.lock().map_err(|e| e.to_string())?;
    *port_guard = None;

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
