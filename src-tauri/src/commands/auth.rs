use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::io::{BufRead, BufReader, Read, Write};
use std::net::TcpListener;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::mpsc;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager};

use super::auth_proxy::try_handle_proxy_route;

static CALLBACK_STATE_COUNTER: AtomicU64 = AtomicU64::new(0);
const CALLBACK_STATE_TTL_SECS: u64 = 300;
const AUTH_CALLBACK_MAX_BODY_BYTES: usize = 32 * 1024;
const AUTH_CALLBACK_ALLOWED_CONTENT_TYPE: &str = "application/json";

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

#[derive(Debug, Clone)]
struct CallbackState {
    value: String,
    issued_at_unix_secs: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum CallbackStateValidation {
    Valid,
    Missing,
    Replayed,
    Invalid,
    Expired,
    LockError,
}

fn now_unix_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or_default()
}

fn generate_callback_state() -> String {
    let mut random = [0u8; 32];
    rand::rngs::OsRng.fill_bytes(&mut random);
    let counter = CALLBACK_STATE_COUNTER.fetch_add(1, Ordering::Relaxed);
    let now_nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or_default();
    let mut hasher = Sha256::new();
    hasher.update(random);
    hasher.update(counter.to_le_bytes());
    hasher.update(now_nanos.to_le_bytes());
    hasher.update(std::process::id().to_le_bytes());
    let digest = hasher.finalize();
    format!("{:x}", digest)
}

fn extract_query_param(path: &str, key: &str) -> Option<String> {
    let query = path.split('?').nth(1)?;
    for part in query.split('&') {
        let mut pieces = part.splitn(2, '=');
        let param_key = pieces.next()?;
        if param_key != key {
            continue;
        }
        let value = pieces.next().unwrap_or("");
        if value.is_empty() {
            return None;
        }
        return Some(value.to_string());
    }
    None
}

fn validate_and_consume_callback_state(
    expected_state: &Arc<Mutex<Option<CallbackState>>>,
    received_state: Option<&str>,
) -> CallbackStateValidation {
    let Some(received_state) = received_state else {
        return CallbackStateValidation::Missing;
    };
    let Ok(mut guard) = expected_state.lock() else {
        return CallbackStateValidation::LockError;
    };
    let Some(current) = guard.as_ref() else {
        return CallbackStateValidation::Replayed;
    };

    if current.value != received_state {
        return CallbackStateValidation::Invalid;
    }

    let age_secs = now_unix_secs().saturating_sub(current.issued_at_unix_secs);
    if age_secs > CALLBACK_STATE_TTL_SECS {
        *guard = None;
        return CallbackStateValidation::Expired;
    }

    *guard = None;
    CallbackStateValidation::Valid
}

fn get_request_path(path: &str) -> &str {
    path.split('?').next().unwrap_or(path)
}

fn is_auth_callback_post_target(request_path: &str) -> bool {
    request_path == "/auth-callback"
}

fn is_allowed_callback_content_type(content_type: Option<&str>) -> bool {
    content_type
        .map(|value| {
            value
                .to_ascii_lowercase()
                .starts_with(AUTH_CALLBACK_ALLOWED_CONTENT_TYPE)
        })
        .unwrap_or(false)
}

fn emit_auth_callback_rejected(
    app_handle: &AppHandle,
    reason: &str,
    request_path: &str,
    details: Option<&str>,
) {
    let _ = app_handle.emit(
        "auth-callback-rejected",
        serde_json::json!({
            "reason": reason,
            "requestPath": request_path,
            "details": details,
        }),
    );
}

/// Start the external browser auth flow
#[tauri::command]
pub async fn start_browser_auth(
    app: AppHandle,
    _privy_app_id: String,
    _privy_client_id: Option<String>,
) -> Result<String, String> {
    log::info!("Starting browser auth flow");
    let callback_state = generate_callback_state();
    let expected_callback_state = Arc::new(Mutex::new(Some(CallbackState {
        value: callback_state.clone(),
        issued_at_unix_secs: now_unix_secs(),
    })));

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
    let callback_state_for_server = expected_callback_state.clone();
    // Spawn callback server thread
    thread::spawn(move || {
        log::info!("Auth callback server thread started");

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

                    let request_path = get_request_path(path);

                    match method {
                        "GET" if path == "/" || path.starts_with("/?") => {
                            let body = "DataBridge auth callback server is running.";
                            let response = format!(
                                "HTTP/1.1 200 OK\r\nContent-Type: text/plain; charset=utf-8\r\nCache-Control: no-store\r\nContent-Length: {}\r\n\r\n{}",
                                body.len(),
                                body
                            );
                            let _ = stream.write_all(response.as_bytes());
                        }
                        "POST" if is_auth_callback_post_target(request_path) => {
                            let callback_state = extract_query_param(path, "callbackState")
                                .or_else(|| extract_query_param(path, "state"));
                            let callback_state_validation = validate_and_consume_callback_state(
                                &callback_state_for_server,
                                callback_state.as_deref(),
                            );

                            if callback_state_validation != CallbackStateValidation::Valid {
                                let reason = match callback_state_validation {
                                    CallbackStateValidation::Missing => "missing_callback_state",
                                    CallbackStateValidation::Replayed => "replayed_callback_state",
                                    CallbackStateValidation::Invalid => "invalid_callback_state",
                                    CallbackStateValidation::Expired => "expired_callback_state",
                                    CallbackStateValidation::LockError => {
                                        "callback_state_lock_error"
                                    }
                                    CallbackStateValidation::Valid => "unexpected_valid_state",
                                };
                                let response = "HTTP/1.1 401 Unauthorized\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: POST, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type\r\n\r\n{\"ok\":false,\"error\":\"invalid_callback_state\"}";
                                let _ = stream.write_all(response.as_bytes());
                                emit_auth_callback_rejected(
                                    &app_handle,
                                    reason,
                                    request_path,
                                    None,
                                );
                                log::warn!("Rejected auth callback: {}", reason);
                                continue;
                            }

                            // Read headers to get content length
                            let mut content_length: usize = 0;
                            let mut content_type: Option<String> = None;
                            let mut line = String::new();
                            loop {
                                line.clear();
                                if reader.read_line(&mut line).is_err() || line == "\r\n" {
                                    break;
                                }
                                let line_lower = line.to_ascii_lowercase();
                                if line_lower.starts_with("content-length:") {
                                    if let Some(len_str) = line.split(':').nth(1) {
                                        content_length = len_str.trim().parse().unwrap_or(0);
                                    }
                                } else if line_lower.starts_with("content-type:") {
                                    if let Some(content_type_value) = line.split(':').nth(1) {
                                        content_type = Some(content_type_value.trim().to_string());
                                    }
                                }
                            }

                            if !is_allowed_callback_content_type(content_type.as_deref()) {
                                let response = "HTTP/1.1 415 Unsupported Media Type\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: POST, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type\r\n\r\n{\"ok\":false,\"error\":\"invalid_content_type\"}";
                                let _ = stream.write_all(response.as_bytes());
                                emit_auth_callback_rejected(
                                    &app_handle,
                                    "invalid_content_type",
                                    request_path,
                                    content_type.as_deref(),
                                );
                                log::warn!("Rejected auth callback due to invalid content-type");
                                continue;
                            }

                            if content_length == 0 || content_length > AUTH_CALLBACK_MAX_BODY_BYTES
                            {
                                let response = "HTTP/1.1 400 Bad Request\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: POST, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type\r\n\r\n{\"ok\":false,\"error\":\"invalid_content_length\"}";
                                let _ = stream.write_all(response.as_bytes());
                                emit_auth_callback_rejected(
                                    &app_handle,
                                    "invalid_content_length",
                                    request_path,
                                    Some(&content_length.to_string()),
                                );
                                log::warn!("Rejected auth callback due to invalid content-length");
                                continue;
                            }

                            // Read body
                            let mut body = vec![0u8; content_length];
                            if reader.read_exact(&mut body).is_err() {
                                let response = "HTTP/1.1 400 Bad Request\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: POST, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type\r\n\r\n{\"ok\":false,\"error\":\"failed_to_read_body\"}";
                                let _ = stream.write_all(response.as_bytes());
                                emit_auth_callback_rejected(
                                    &app_handle,
                                    "failed_to_read_body",
                                    request_path,
                                    None,
                                );
                                log::warn!("Rejected auth callback due to body read failure");
                                continue;
                            }

                            let Ok(body_str) = String::from_utf8(body) else {
                                let response = "HTTP/1.1 400 Bad Request\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: POST, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type\r\n\r\n{\"ok\":false,\"error\":\"invalid_body_encoding\"}";
                                let _ = stream.write_all(response.as_bytes());
                                emit_auth_callback_rejected(
                                    &app_handle,
                                    "invalid_body_encoding",
                                    request_path,
                                    None,
                                );
                                log::warn!("Rejected auth callback due to invalid body encoding");
                                continue;
                            };

                            log::info!("Auth callback received");

                            let Ok(auth_result) = serde_json::from_str::<AuthResult>(&body_str)
                            else {
                                let response = "HTTP/1.1 400 Bad Request\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: POST, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type\r\n\r\n{\"ok\":false,\"error\":\"invalid_body_json\"}";
                                let _ = stream.write_all(response.as_bytes());
                                emit_auth_callback_rejected(
                                    &app_handle,
                                    "invalid_body_json",
                                    request_path,
                                    None,
                                );
                                log::warn!("Rejected auth callback due to invalid body json");
                                continue;
                            };

                            // Send to channel
                            let _ = tx.send(auth_result.clone());

                            // Emit event to frontend
                            let _ = app_handle.emit("auth-complete", auth_result);

                            // Focus the app window
                            if let Some(window) = app_handle.get_webview_window("main") {
                                let _ = window.set_focus();
                            }

                            // Send response with CORS headers
                            let response = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: POST, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type\r\n\r\n{\"ok\":true}";
                            let _ = stream.write_all(response.as_bytes());

                            log::info!("Auth complete, waiting for close-tab request");
                        }
                        _ if try_handle_proxy_route(
                            method,
                            path,
                            request_path,
                            &mut reader,
                            &mut stream,
                            &app_handle,
                        ) => {}
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

    // Open browser to external Passport auth flow.
    // Keep callbackPort in query so the external flow can post to local endpoints.
    let base_auth_url = std::env::var("DATABRIDGE_EXTERNAL_AUTH_URL")
        .unwrap_or_else(|_| "https://passport.vana.org".to_string());
    let separator = if base_auth_url.contains('?') {
        '&'
    } else {
        '?'
    };
    let auth_url = format!(
        "{}{}mode=return_to_app&callbackPort={}&callbackState={}",
        base_auth_url, separator, callback_port, callback_state
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

/// Cancel the auth flow
#[tauri::command]
pub fn cancel_browser_auth() -> Result<(), String> {
    // The server will automatically close when the thread ends
    // or when the auth completes
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{
        extract_query_param, get_request_path, is_allowed_callback_content_type,
        is_auth_callback_post_target, validate_and_consume_callback_state, CallbackState,
        CallbackStateValidation, CALLBACK_STATE_TTL_SECS,
    };
    use std::sync::{Arc, Mutex};
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn extract_query_param_reads_expected_value() {
        let value = extract_query_param(
            "/auth-callback?callbackState=abc123&foo=bar",
            "callbackState",
        );
        assert_eq!(value.as_deref(), Some("abc123"));
    }

    #[test]
    fn extract_query_param_returns_none_when_missing() {
        let value = extract_query_param("/auth-callback?foo=bar", "callbackState");
        assert_eq!(value, None);
    }

    #[test]
    fn callback_state_validation_requires_exact_single_use_match() {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time before unix epoch")
            .as_secs();
        let valid_then_replayed = Arc::new(Mutex::new(Some(CallbackState {
            value: "state-1".to_string(),
            issued_at_unix_secs: now,
        })));
        assert_eq!(
            validate_and_consume_callback_state(&valid_then_replayed, Some("state-1")),
            CallbackStateValidation::Valid
        );
        assert_eq!(
            validate_and_consume_callback_state(&valid_then_replayed, Some("state-1")),
            CallbackStateValidation::Replayed
        );

        let invalid = Arc::new(Mutex::new(Some(CallbackState {
            value: "state-2".to_string(),
            issued_at_unix_secs: now,
        })));
        assert_eq!(
            validate_and_consume_callback_state(&invalid, Some("other")),
            CallbackStateValidation::Invalid
        );

        let missing = Arc::new(Mutex::new(Some(CallbackState {
            value: "state-3".to_string(),
            issued_at_unix_secs: now,
        })));
        assert_eq!(
            validate_and_consume_callback_state(&missing, None),
            CallbackStateValidation::Missing
        );
    }

    #[test]
    fn callback_state_validation_rejects_expired_state() {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time before unix epoch")
            .as_secs();
        let expired = now.saturating_sub(CALLBACK_STATE_TTL_SECS + 1);
        let expected = Arc::new(Mutex::new(Some(CallbackState {
            value: "expired-state".to_string(),
            issued_at_unix_secs: expired,
        })));
        assert_eq!(
            validate_and_consume_callback_state(&expected, Some("expired-state")),
            CallbackStateValidation::Expired
        );
        assert_eq!(
            validate_and_consume_callback_state(&expected, Some("expired-state")),
            CallbackStateValidation::Replayed
        );
    }

    #[test]
    fn callback_route_match_accepts_query_bearing_auth_callback_path() {
        let request_path = get_request_path("/auth-callback?callbackState=abc123");
        assert!(is_auth_callback_post_target(request_path));
        assert!(!is_auth_callback_post_target("/"));
    }

    #[test]
    fn callback_content_type_validation_requires_json() {
        assert!(is_allowed_callback_content_type(Some("application/json")));
        assert!(is_allowed_callback_content_type(Some(
            "application/json; charset=utf-8"
        )));
        assert!(!is_allowed_callback_content_type(Some("text/plain")));
        assert!(!is_allowed_callback_content_type(None));
    }
}
