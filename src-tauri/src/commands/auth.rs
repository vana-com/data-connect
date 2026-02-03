use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Read, Write};
use std::net::TcpListener;
use std::sync::mpsc;
use std::thread;
use tauri::{AppHandle, Emitter, Manager};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuthResult {
    pub success: bool,
    pub user: Option<AuthUser>,
    #[serde(rename = "walletAddress")]
    pub wallet_address: Option<String>,
    #[serde(rename = "authToken")]
    pub auth_token: Option<String>,
    #[serde(rename = "masterKeySignature")]
    pub master_key_signature: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuthUser {
    pub id: String,
    pub email: Option<String>,
}

/// Start the external browser auth flow
#[tauri::command]
pub async fn start_browser_auth(app: AppHandle, privy_app_id: String, privy_client_id: Option<String>) -> Result<(), String> {
    log::info!("Starting browser auth flow with Privy app ID: {}", privy_app_id);

    // Find an available port for the callback server
    let listener = TcpListener::bind("127.0.0.1:3083")
        .or_else(|_| TcpListener::bind("127.0.0.1:5173"))
        .map_err(|e| format!("Failed to bind to port 3083 or 5173: {}", e))?;
    let callback_port = listener.local_addr()
        .map_err(|e| format!("Failed to get local address: {}", e))?
        .port();

    log::info!("Auth callback server starting on port {}", callback_port);

    // Channel to receive auth result
    let (tx, _rx) = mpsc::channel::<AuthResult>();

    let app_handle = app.clone();
    let privy_app_id_clone = privy_app_id.clone();
    let privy_client_id_clone = privy_client_id.unwrap_or_default();

    // Spawn callback server thread
    thread::spawn(move || {
        log::info!("Auth callback server thread started");

        // Load the bundled auth page HTML and inject the Privy IDs
        let auth_html = include_str!("../../auth-page/index.html")
            .replace("{{PRIVY_APP_ID}}", &privy_app_id_clone)
            .replace("{{PRIVY_CLIENT_ID}}", &privy_client_id_clone);

        for stream in listener.incoming() {
            match stream {
                Ok(mut stream) => {
                    let mut reader = BufReader::new(stream.try_clone().unwrap());
                    let mut request_line = String::new();

                    if reader.read_line(&mut request_line).is_err() {
                        continue;
                    }

                    log::debug!("Auth callback server received: {}", request_line.trim());

                    // Parse request
                    let parts: Vec<&str> = request_line.split_whitespace().collect();
                    if parts.len() < 2 {
                        continue;
                    }

                    let method = parts[0];
                    let path = parts[1];

                    match method {
                        "GET" if path == "/" || path.starts_with("/?") => {
                            // Serve the bundled auth page
                            let response = format!(
                                "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\n\r\n{}",
                                auth_html.len(),
                                auth_html
                            );
                            let _ = stream.write_all(response.as_bytes());
                        }
                        "POST" if path == "/auth-callback" || path == "/" => {
                            // Read headers to get content length
                            let mut content_length: usize = 0;
                            let mut line = String::new();
                            loop {
                                line.clear();
                                if reader.read_line(&mut line).is_err() || line == "\r\n" {
                                    break;
                                }
                                if line.to_lowercase().starts_with("content-length:") {
                                    if let Some(len_str) = line.split(':').nth(1) {
                                        content_length = len_str.trim().parse().unwrap_or(0);
                                    }
                                }
                            }

                            // Read body
                            let mut body = vec![0u8; content_length];
                            if reader.read_exact(&mut body).is_ok() {
                                if let Ok(body_str) = String::from_utf8(body) {
                                    log::info!("Auth callback received: {}", body_str);

                                    // Parse auth result
                                    if let Ok(auth_result) = serde_json::from_str::<AuthResult>(&body_str) {
                                        // Send to channel
                                        let _ = tx.send(auth_result.clone());

                                        // Emit event to frontend
                                        let _ = app_handle.emit("auth-complete", auth_result);

                                        // Focus the app window
                                        if let Some(window) = app_handle.get_webview_window("main") {
                                            let _ = window.set_focus();
                                        }
                                    }
                                }
                            }

                            // Send response with CORS headers
                            let response = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: POST, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type\r\n\r\n{\"ok\":true}";
                            let _ = stream.write_all(response.as_bytes());

                            log::info!("Auth complete, waiting for close-tab request");
                        }
                        "GET" if path == "/server-identity" => {
                            // Proxy the personal server health check to avoid CORS
                            log::info!("Server identity request received");
                            let cors = "Access-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type";
                            let port_opt = super::server::PERSONAL_SERVER_PORT.lock().ok().and_then(|g| *g);
                            log::info!("Personal server port: {:?}", port_opt);
                            if let Some(port) = port_opt {
                                match reqwest::blocking::get(format!("http://localhost:{}/health", port)) {
                                    Ok(resp) if resp.status().is_success() => {
                                        let body = resp.text().unwrap_or_default();
                                        let resp_str = format!(
                                            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n{}\r\nContent-Length: {}\r\n\r\n{}",
                                            cors, body.len(), body
                                        );
                                        let _ = stream.write_all(resp_str.as_bytes());
                                    }
                                    _ => {
                                        let resp_str = format!("HTTP/1.1 503 Service Unavailable\r\n{}\r\n\r\n", cors);
                                        let _ = stream.write_all(resp_str.as_bytes());
                                    }
                                }
                            } else {
                                let resp_str = format!("HTTP/1.1 503 Service Unavailable\r\n{}\r\n\r\n", cors);
                                let _ = stream.write_all(resp_str.as_bytes());
                            }
                        }
                        "POST" if path == "/register-server" => {
                            // Read POST body
                            let mut content_length: usize = 0;
                            let mut line = String::new();
                            loop {
                                line.clear();
                                if reader.read_line(&mut line).is_err() || line == "\r\n" {
                                    break;
                                }
                                if line.to_lowercase().starts_with("content-length:") {
                                    if let Some(len_str) = line.split(':').nth(1) {
                                        content_length = len_str.trim().parse().unwrap_or(0);
                                    }
                                }
                            }

                            let cors = "Access-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type";
                            let mut body = vec![0u8; content_length];
                            let gateway_url = "https://data-gateway-env-dev-opendatalabs.vercel.app";

                            if reader.read_exact(&mut body).is_ok() {
                                if let Ok(body_str) = String::from_utf8(body) {
                                    log::info!("Register server request: {}", body_str);

                                    // Parse { signature, message }
                                    if let Ok(reg) = serde_json::from_str::<serde_json::Value>(&body_str) {
                                        let signature = reg["signature"].as_str().unwrap_or_default();
                                        let message = &reg["message"];

                                        // POST to gateway
                                        let client = reqwest::blocking::Client::new();
                                        match client
                                            .post(format!("{}/v1/servers", gateway_url))
                                            .header("Content-Type", "application/json")
                                            .header("Authorization", format!("Web3Signed {}", signature))
                                            .json(message)
                                            .send()
                                        {
                                            Ok(resp) => {
                                                let status = resp.status().as_u16();
                                                let resp_body = resp.text().unwrap_or_default();
                                                log::info!("Gateway register response: {} {}", status, resp_body);

                                                if status == 200 || status == 201 || status == 409 {
                                                    let _ = app_handle.emit("server-registered", serde_json::json!({ "status": status }));
                                                }

                                                let resp_str = format!(
                                                    "HTTP/1.1 {} OK\r\nContent-Type: application/json\r\n{}\r\nContent-Length: {}\r\n\r\n{}",
                                                    status, cors, resp_body.len(), resp_body
                                                );
                                                let _ = stream.write_all(resp_str.as_bytes());
                                            }
                                            Err(e) => {
                                                let err_body = format!("{{\"error\":\"{}\"}}", e);
                                                let resp_str = format!(
                                                    "HTTP/1.1 502 Bad Gateway\r\nContent-Type: application/json\r\n{}\r\nContent-Length: {}\r\n\r\n{}",
                                                    cors, err_body.len(), err_body
                                                );
                                                let _ = stream.write_all(resp_str.as_bytes());
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        "GET" if path == "/close-tab" => {
                            // Browser tab navigates here after showing success.
                            // Serve a page with the success message, then close the tab
                            // from the native side via Cmd+W (macOS).
                            let close_html = r##"<!DOCTYPE html>
<html><head><title>Signed in</title><style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f7; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
.c { text-align: center; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); max-width: 400px; }
.i { width: 64px; height: 64px; background: #dcfce7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
h2 { font-size: 22px; color: #1a1a1a; margin-bottom: 12px; }
p { font-size: 14px; color: #6b7280; }
</style></head><body><div class="c">
<div class="i"><svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#22c55e"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg></div>
<h2>You're signed in!</h2>
<p>Closing this tab...</p>
</div></body></html>"##;
                            let response = format!(
                                "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\n\r\n{}",
                                close_html.len(),
                                close_html
                            );
                            let _ = stream.write_all(response.as_bytes());

                            #[cfg(target_os = "macos")]
                            {
                                std::thread::sleep(std::time::Duration::from_millis(800));
                                let _ = std::process::Command::new("osascript")
                                    .arg("-e")
                                    .arg(r#"tell application "System Events" to keystroke "w" using command down"#)
                                    .output();
                            }

                            log::info!("Close-tab done, shutting down auth server");
                            break;
                        }
                        "OPTIONS" => {
                            // Handle CORS preflight
                            let response = "HTTP/1.1 200 OK\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: POST, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type\r\n\r\n";
                            let _ = stream.write_all(response.as_bytes());
                        }
                        _ => {
                            log::info!("Auth server: unmatched request {} {}", method, path);
                            let response = "HTTP/1.1 404 Not Found\r\n\r\n";
                            let _ = stream.write_all(response.as_bytes());
                        }
                    }
                }
                Err(e) => {
                    log::error!("Auth callback server connection error: {}", e);
                }
            }
        }

        log::info!("Auth callback server thread ended");
    });

    // Open browser to the self-contained auth page served by our localhost server
    let auth_url = format!("http://localhost:{}", callback_port);
    log::info!("Opening browser to: {}", auth_url);

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&auth_url)
            .spawn()
            .map_err(|e| format!("Failed to open browser: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&auth_url)
            .spawn()
            .map_err(|e| format!("Failed to open browser: {}", e))?;
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", &auth_url])
            .spawn()
            .map_err(|e| format!("Failed to open browser: {}", e))?;
    }

    // Emit event that auth flow has started
    app.emit("auth-started", serde_json::json!({ "callbackPort": callback_port }))
        .map_err(|e| format!("Failed to emit event: {}", e))?;

    Ok(())
}

/// Cancel the auth flow
#[tauri::command]
pub fn cancel_browser_auth() -> Result<(), String> {
    // The server will automatically close when the thread ends
    // or when the auth completes
    Ok(())
}
