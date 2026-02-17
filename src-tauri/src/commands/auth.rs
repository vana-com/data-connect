use serde::{Deserialize, Serialize};
use dirs::home_dir;
use std::fs;
use std::io::{BufRead, BufReader, Read, Write};
use std::net::TcpListener;
use std::path::{Path, PathBuf};
use std::sync::mpsc;
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::path::BaseDirectory;
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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DurableAuthSession {
    pub user: AuthUser,
    #[serde(rename = "walletAddress")]
    pub wallet_address: Option<String>,
    #[serde(rename = "masterKeySignature")]
    pub master_key_signature: Option<String>,
    #[serde(rename = "savedAtMs")]
    pub saved_at_ms: u64,
}

const CALLBACK_STATE_TTL_MS: u64 = 5 * 60 * 1000;
const AUTH_SESSION_FILENAME: &str = "auth-session.json";

#[derive(Debug, Clone)]
struct CallbackState {
    token: String,
    expires_at_ms: u64,
    consumed: bool,
}

#[derive(Debug, PartialEq, Eq)]
enum CallbackRejectReason {
    InvalidPayload,
    MissingState,
    InvalidState,
    ExpiredState,
    ReplayedState,
}

impl CallbackRejectReason {
    fn status_code(&self) -> u16 {
        match self {
            Self::InvalidPayload | Self::MissingState => 400,
            Self::InvalidState | Self::ExpiredState => 401,
            Self::ReplayedState => 409,
        }
    }

    fn code(&self) -> &'static str {
        match self {
            Self::InvalidPayload => "INVALID_PAYLOAD",
            Self::MissingState => "MISSING_STATE",
            Self::InvalidState => "INVALID_STATE",
            Self::ExpiredState => "EXPIRED_STATE",
            Self::ReplayedState => "REPLAYED_STATE",
        }
    }

    fn message(&self) -> &'static str {
        match self {
            Self::InvalidPayload => "Invalid callback payload",
            Self::MissingState => "Missing callback state",
            Self::InvalidState => "Invalid callback state",
            Self::ExpiredState => "Callback state expired",
            Self::ReplayedState => "Callback state already consumed",
        }
    }
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0)
}

fn new_callback_state() -> CallbackState {
    let issued_at_ms = now_ms();
    let token = format!("auth-{}-{}", std::process::id(), issued_at_ms);
    CallbackState {
        token,
        expires_at_ms: issued_at_ms.saturating_add(CALLBACK_STATE_TTL_MS),
        consumed: false,
    }
}

fn build_callback_reject_response(reason: CallbackRejectReason) -> String {
    let status = reason.status_code();
    let reason_json = serde_json::json!({
        "ok": false,
        "code": reason.code(),
        "message": reason.message(),
    })
    .to_string();

    format!(
        "HTTP/1.1 {} {}\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: POST, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type\r\nContent-Length: {}\r\n\r\n{}",
        status,
        if status == 400 {
            "Bad Request"
        } else if status == 401 {
            "Unauthorized"
        } else if status == 409 {
            "Conflict"
        } else {
            "Error"
        },
        reason_json.len(),
        reason_json
    )
}

fn get_auth_session_path() -> Result<PathBuf, String> {
    let home = home_dir().ok_or("Failed to get home directory")?;
    Ok(home.join(".databridge").join(AUTH_SESSION_FILENAME))
}

fn save_auth_session_at_path(path: &Path, session: &DurableAuthSession) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create auth session directory: {}", e))?;
    }

    let content = serde_json::to_string_pretty(session)
        .map_err(|e| format!("Failed to serialize auth session: {}", e))?;
    fs::write(path, content).map_err(|e| format!("Failed to write auth session: {}", e))?;
    Ok(())
}

fn load_auth_session_at_path(path: &Path) -> Result<Option<DurableAuthSession>, String> {
    if !path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(path).map_err(|e| format!("Failed to read auth session: {}", e))?;
    let session = serde_json::from_str::<DurableAuthSession>(&content)
        .map_err(|e| format!("Failed to parse auth session: {}", e))?;
    Ok(Some(session))
}

fn clear_auth_session_at_path(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Ok(());
    }

    fs::remove_file(path).map_err(|e| format!("Failed to clear auth session: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn save_auth_session(session: DurableAuthSession) -> Result<(), String> {
    let path = get_auth_session_path()?;
    save_auth_session_at_path(&path, &session)
}

#[tauri::command]
pub async fn load_auth_session() -> Result<Option<DurableAuthSession>, String> {
    let path = get_auth_session_path()?;
    load_auth_session_at_path(&path)
}

#[tauri::command]
pub async fn clear_auth_session() -> Result<(), String> {
    let path = get_auth_session_path()?;
    clear_auth_session_at_path(&path)
}

fn parse_auth_callback_payload(
    body: &str,
    callback_state: &mut CallbackState,
    now_ms: u64,
) -> Result<AuthResult, CallbackRejectReason> {
    let value: serde_json::Value =
        serde_json::from_str(body).map_err(|_| CallbackRejectReason::InvalidPayload)?;

    let payload_obj = value
        .as_object()
        .ok_or(CallbackRejectReason::InvalidPayload)?;

    let callback_state_value = payload_obj
        .get("state")
        .and_then(|v| v.as_str())
        .ok_or(CallbackRejectReason::MissingState)?;

    if callback_state.consumed {
        return Err(CallbackRejectReason::ReplayedState);
    }

    if now_ms > callback_state.expires_at_ms {
        return Err(CallbackRejectReason::ExpiredState);
    }

    if callback_state_value != callback_state.token {
        return Err(CallbackRejectReason::InvalidState);
    }

    let auth_result = serde_json::from_value::<AuthResult>(value)
        .map_err(|_| CallbackRejectReason::InvalidPayload)?;

    callback_state.consumed = true;
    Ok(auth_result)
}

fn is_auth_callback_request(method: &str, request_path: &str) -> bool {
    method == "POST" && request_path == "/auth-callback"
}

/// Start the external browser auth flow
#[tauri::command]
pub async fn start_browser_auth(
    app: AppHandle,
    privy_app_id: String,
    privy_client_id: Option<String>,
) -> Result<String, String> {
    log::info!(
        "Starting browser auth flow with Privy app ID: {}",
        privy_app_id
    );
    let callback_state = new_callback_state();
    let callback_state_token = callback_state.token.clone();

    // Try to bind to fixed port 3083 (whitelisted in Privy dashboard)
    // Fall back to 5173 or random port if unavailable
    let (listener, callback_port) = if let Ok(l) = TcpListener::bind("127.0.0.1:3083") {
        log::info!("Bound to preferred port 3083");
        (l, 3083u16)
    } else if let Ok(l) = TcpListener::bind("127.0.0.1:5173") {
        log::info!("Port 3083 unavailable, using fallback port 5173");
        (l, 5173u16)
    } else {
        let l = TcpListener::bind("127.0.0.1:0")
            .map_err(|e| format!("Failed to bind to any port: {}", e))?;
        let port = l
            .local_addr()
            .map_err(|e| format!("Failed to get local address: {}", e))?
            .port();
        log::warn!(
            "Using random port {} - auth may fail if not whitelisted in Privy",
            port
        );
        (l, port)
    };

    log::info!("Auth callback server starting on port {}", callback_port);

    // Channel to receive auth result
    let (tx, _rx) = mpsc::channel::<AuthResult>();

    let app_handle = app.clone();
    let privy_app_id_clone = privy_app_id.clone();
    let privy_client_id_clone = privy_client_id.unwrap_or_default();

    // Spawn callback server thread
    thread::spawn(move || {
        log::info!("Auth callback server thread started");
        let mut callback_state = callback_state;

        let resource_dir = app_handle
            .path()
            .resolve("auth-page", BaseDirectory::Resource)
            .ok()
            .filter(|path| path.exists());

        let auth_dir = resource_dir
            .unwrap_or_else(|| PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("auth-page"));

        log::info!("Auth page directory: {}", auth_dir.display());

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

                    let request_path = path.split('?').next().unwrap_or(path);

                    match method {
                        "GET" if path == "/" || path.starts_with("/?") => {
                            let index_path = auth_dir.join("index.html");
                            match std::fs::read_to_string(&index_path) {
                                Ok(html) => {
                                    let resolved_html = html
                                        .replace("%PRIVY_APP_ID%", &privy_app_id_clone)
                                        .replace("%PRIVY_CLIENT_ID%", &privy_client_id_clone);
                                    let response = format!(
                                        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nCache-Control: no-store\r\nContent-Length: {}\r\n\r\n{}",
                                        resolved_html.len(),
                                        resolved_html
                                    );
                                    let _ = stream.write_all(response.as_bytes());
                                }
                                Err(err) => {
                                    log::error!("Failed to read auth page index.html: {}", err);
                                    let response = "HTTP/1.1 500 Internal Server Error\r\n\r\n";
                                    let _ = stream.write_all(response.as_bytes());
                                }
                            }
                        }
                        "GET"
                            if request_path.starts_with("/assets/")
                                || request_path.starts_with("/fonts/")
                                || request_path == "/favicon.ico" =>
                        {
                            let asset_path = auth_dir.join(request_path.trim_start_matches('/'));
                            match std::fs::read(&asset_path) {
                                Ok(bytes) => {
                                    let mime =
                                        mime_guess::from_path(&asset_path).first_or_octet_stream();
                                    let header = format!(
                                        "HTTP/1.1 200 OK\r\nContent-Type: {}\r\nCache-Control: no-store\r\nContent-Length: {}\r\n\r\n",
                                        mime,
                                        bytes.len()
                                    );
                                    let _ = stream.write_all(header.as_bytes());
                                    let _ = stream.write_all(&bytes);
                                }
                                Err(_) => {
                                    let response = "HTTP/1.1 404 Not Found\r\n\r\n";
                                    let _ = stream.write_all(response.as_bytes());
                                }
                            }
                        }
                        _ if is_auth_callback_request(method, request_path) => {
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

                                    match parse_auth_callback_payload(
                                        &body_str,
                                        &mut callback_state,
                                        now_ms(),
                                    ) {
                                        Ok(auth_result) => {
                                            let _ = tx.send(auth_result.clone());
                                            let _ = app_handle.emit("auth-complete", auth_result);

                                            if let Some(window) =
                                                app_handle.get_webview_window("main")
                                            {
                                                let _ = window.set_focus();
                                            }
                                        }
                                        Err(reason) => {
                                            log::warn!(
                                                "Rejected auth callback: {} ({})",
                                                reason.code(),
                                                reason.message()
                                            );
                                            let response = build_callback_reject_response(reason);
                                            let _ = stream.write_all(response.as_bytes());
                                            continue;
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
                            let port_opt = super::server::PERSONAL_SERVER_PORT
                                .lock()
                                .ok()
                                .and_then(|g| *g);
                            log::info!("Personal server port: {:?}", port_opt);
                            if let Some(port) = port_opt {
                                match reqwest::blocking::get(format!(
                                    "http://localhost:{}/health",
                                    port
                                )) {
                                    Ok(resp) if resp.status().is_success() => {
                                        let body = resp.text().unwrap_or_default();
                                        let resp_str = format!(
                                            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n{}\r\nContent-Length: {}\r\n\r\n{}",
                                            cors, body.len(), body
                                        );
                                        let _ = stream.write_all(resp_str.as_bytes());
                                    }
                                    _ => {
                                        let resp_str = format!(
                                            "HTTP/1.1 503 Service Unavailable\r\n{}\r\n\r\n",
                                            cors
                                        );
                                        let _ = stream.write_all(resp_str.as_bytes());
                                    }
                                }
                            } else {
                                let resp_str =
                                    format!("HTTP/1.1 503 Service Unavailable\r\n{}\r\n\r\n", cors);
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
                            let gateway_url =
                                "https://data-gateway-env-dev-opendatalabs.vercel.app";

                            if reader.read_exact(&mut body).is_ok() {
                                if let Ok(body_str) = String::from_utf8(body) {
                                    log::info!("Register server request: {}", body_str);

                                    // Parse { signature, message }
                                    if let Ok(reg) =
                                        serde_json::from_str::<serde_json::Value>(&body_str)
                                    {
                                        let signature =
                                            reg["signature"].as_str().unwrap_or_default();
                                        let message = &reg["message"];

                                        // POST to gateway
                                        let client = reqwest::blocking::Client::new();
                                        match client
                                            .post(format!("{}/v1/servers", gateway_url))
                                            .header("Content-Type", "application/json")
                                            .header(
                                                "Authorization",
                                                format!("Web3Signed {}", signature),
                                            )
                                            .json(message)
                                            .send()
                                        {
                                            Ok(resp) => {
                                                let status = resp.status().as_u16();
                                                let resp_body = resp.text().unwrap_or_default();
                                                log::info!(
                                                    "Gateway register response: {} {}",
                                                    status,
                                                    resp_body
                                                );

                                                if status == 200 || status == 201 || status == 409 {
                                                    // Extract serverId from response and include in event
                                                    let server_id =
                                                        serde_json::from_str::<serde_json::Value>(
                                                            &resp_body,
                                                        )
                                                        .ok()
                                                        .and_then(|v| {
                                                            v["serverId"]
                                                                .as_str()
                                                                .map(|s| s.to_string())
                                                        });
                                                    let _ = app_handle.emit(
                                                        "server-registered",
                                                        serde_json::json!({
                                                            "status": status,
                                                            "serverId": server_id
                                                        }),
                                                    );
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
                        "GET" if request_path == "/check-server-url" => {
                            // Proxy GET /v1/servers/{address} to gateway
                            let cors = "Access-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, POST, DELETE, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type, Authorization";
                            let gateway_url =
                                "https://data-gateway-env-dev-opendatalabs.vercel.app";
                            let address = path
                                .split("address=")
                                .nth(1)
                                .unwrap_or("")
                                .split('&')
                                .next()
                                .unwrap_or("");

                            if address.is_empty() {
                                let resp_str = format!(
                                    "HTTP/1.1 400 Bad Request\r\nContent-Type: application/json\r\n{}\r\n\r\n{{\"error\":\"Missing address parameter\"}}",
                                    cors
                                );
                                let _ = stream.write_all(resp_str.as_bytes());
                            } else {
                                let client = reqwest::blocking::Client::new();
                                match client
                                    .get(format!("{}/v1/servers/{}", gateway_url, address))
                                    .send()
                                {
                                    Ok(resp) => {
                                        let status = resp.status().as_u16();
                                        let resp_body = resp.text().unwrap_or_default();
                                        log::info!(
                                            "Gateway check-server-url response: {} {}",
                                            status,
                                            &resp_body[..resp_body.len().min(200)]
                                        );
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
                        "POST" if path == "/deregister-server" => {
                            // Proxy DELETE /v1/servers/{serverAddress} to gateway
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

                            let cors = "Access-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, POST, DELETE, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type, Authorization";
                            let gateway_url =
                                "https://data-gateway-env-dev-opendatalabs.vercel.app";
                            let mut body = vec![0u8; content_length];

                            if reader.read_exact(&mut body).is_ok() {
                                if let Ok(body_str) = String::from_utf8(body) {
                                    log::info!("Deregister server request: {}", body_str);

                                    if let Ok(dereg) =
                                        serde_json::from_str::<serde_json::Value>(&body_str)
                                    {
                                        let server_address =
                                            dereg["serverAddress"].as_str().unwrap_or_default();
                                        let signature =
                                            dereg["signature"].as_str().unwrap_or_default();
                                        let owner_address =
                                            dereg["ownerAddress"].as_str().unwrap_or_default();
                                        let deadline = dereg["deadline"].as_u64().unwrap_or(0);

                                        let delete_body = serde_json::json!({
                                            "ownerAddress": owner_address,
                                            "deadline": deadline,
                                        });

                                        let client = reqwest::blocking::Client::new();
                                        match client
                                            .delete(format!(
                                                "{}/v1/servers/{}",
                                                gateway_url, server_address
                                            ))
                                            .header("Content-Type", "application/json")
                                            .header(
                                                "Authorization",
                                                format!("Web3Signed {}", signature),
                                            )
                                            .json(&delete_body)
                                            .send()
                                        {
                                            Ok(resp) => {
                                                let status = resp.status().as_u16();
                                                let resp_body = resp.text().unwrap_or_default();
                                                log::info!(
                                                    "Gateway deregister response: {} {}",
                                                    status,
                                                    resp_body
                                                );
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
    let auth_url = format!(
        "http://localhost:{}?auth_state={}",
        callback_port, callback_state_token
    );
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
    app.emit(
        "auth-started",
        serde_json::json!({ "callbackPort": callback_port, "authUrl": auth_url }),
    )
    .map_err(|e| format!("Failed to emit event: {}", e))?;

    Ok(auth_url)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn valid_payload(state: &str) -> String {
        serde_json::json!({
            "success": true,
            "state": state,
            "user": {
                "id": "user-1",
                "email": "user@vana.org"
            },
            "walletAddress": "0xabc"
        })
        .to_string()
    }

    #[test]
    fn rejects_non_post_auth_callback() {
        assert!(is_auth_callback_request("POST", "/auth-callback"));
        assert!(!is_auth_callback_request("GET", "/auth-callback"));
        assert!(!is_auth_callback_request("OPTIONS", "/auth-callback"));
        assert!(!is_auth_callback_request("POST", "/"));
    }

    #[test]
    fn rejects_missing_state() {
        let mut callback_state = CallbackState {
            token: "expected-state".to_string(),
            expires_at_ms: 10_000,
            consumed: false,
        };
        let payload = serde_json::json!({
            "success": true,
            "user": { "id": "user-1" }
        })
        .to_string();

        let result = parse_auth_callback_payload(&payload, &mut callback_state, 100);

        assert!(matches!(result, Err(CallbackRejectReason::MissingState)));
        assert!(!callback_state.consumed);
    }

    #[test]
    fn rejects_expired_state() {
        let mut callback_state = CallbackState {
            token: "expected-state".to_string(),
            expires_at_ms: 100,
            consumed: false,
        };

        let result =
            parse_auth_callback_payload(&valid_payload("expected-state"), &mut callback_state, 101);

        assert!(matches!(result, Err(CallbackRejectReason::ExpiredState)));
        assert!(!callback_state.consumed);
    }

    #[test]
    fn rejects_replayed_state() {
        let mut callback_state = CallbackState {
            token: "expected-state".to_string(),
            expires_at_ms: 10_000,
            consumed: true,
        };

        let result =
            parse_auth_callback_payload(&valid_payload("expected-state"), &mut callback_state, 100);

        assert!(matches!(result, Err(CallbackRejectReason::ReplayedState)));
    }

    #[test]
    fn accepts_valid_state_once() {
        let mut callback_state = CallbackState {
            token: "expected-state".to_string(),
            expires_at_ms: 10_000,
            consumed: false,
        };

        let first =
            parse_auth_callback_payload(&valid_payload("expected-state"), &mut callback_state, 100);
        assert!(first.is_ok());
        assert!(callback_state.consumed);

        let second =
            parse_auth_callback_payload(&valid_payload("expected-state"), &mut callback_state, 101);
        assert!(matches!(second, Err(CallbackRejectReason::ReplayedState)));
    }

    #[test]
    fn save_load_clear_auth_session_roundtrip() {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock should be after unix epoch")
            .as_nanos();
        let path = std::env::temp_dir().join(format!("auth_session_roundtrip_{}.json", nanos));

        let session = DurableAuthSession {
            user: AuthUser {
                id: "user-1".to_string(),
                email: Some("user@vana.org".to_string()),
            },
            wallet_address: Some("0xabc".to_string()),
            master_key_signature: Some("sig-1".to_string()),
            saved_at_ms: 123,
        };

        save_auth_session_at_path(&path, &session).expect("save should succeed");
        let loaded = load_auth_session_at_path(&path).expect("load should succeed");
        assert!(loaded.is_some());
        assert_eq!(loaded.unwrap().user.id, "user-1");

        clear_auth_session_at_path(&path).expect("clear should succeed");
        let after_clear = load_auth_session_at_path(&path).expect("load after clear should succeed");
        assert!(after_clear.is_none());
    }
}

/// Cancel the auth flow
#[tauri::command]
pub fn cancel_browser_auth() -> Result<(), String> {
    // The server will automatically close when the thread ends
    // or when the auth completes
    Ok(())
}
