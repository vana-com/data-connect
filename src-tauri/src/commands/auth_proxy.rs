use std::io::{BufRead, Read, Write};
use std::sync::OnceLock;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

const DEFAULT_GATEWAY_URL: &str = "https://data-gateway-env-dev-opendatalabs.vercel.app";
const HTTP_CONNECT_TIMEOUT_SECS: u64 = 3;
const HTTP_REQUEST_TIMEOUT_SECS: u64 = 10;

static GATEWAY_URL: OnceLock<String> = OnceLock::new();

fn gateway_url() -> &'static str {
    GATEWAY_URL
        .get_or_init(|| {
            std::env::var("DATABRIDGE_GATEWAY_URL")
                .ok()
                .filter(|value| !value.trim().is_empty())
                .or_else(|| {
                    std::env::var("GATEWAY_URL")
                        .ok()
                        .filter(|value| !value.trim().is_empty())
                })
                .unwrap_or_else(|| DEFAULT_GATEWAY_URL.to_string())
        })
        .as_str()
}

fn read_content_length<R: BufRead>(reader: &mut R) -> usize {
    let mut content_length: usize = 0;
    let mut line = String::new();
    loop {
        line.clear();
        if reader.read_line(&mut line).is_err() || line == "\r\n" {
            break;
        }
        if line.to_ascii_lowercase().starts_with("content-length:") {
            if let Some(len_str) = line.split(':').nth(1) {
                content_length = len_str.trim().parse().unwrap_or(0);
            }
        }
    }
    content_length
}

fn read_utf8_body<R: Read>(reader: &mut R, content_length: usize) -> Option<String> {
    if content_length == 0 {
        return None;
    }
    let mut body = vec![0u8; content_length];
    if reader.read_exact(&mut body).is_err() {
        return None;
    }
    String::from_utf8(body).ok()
}

fn http_client() -> reqwest::blocking::Client {
    reqwest::blocking::Client::builder()
        .connect_timeout(Duration::from_secs(HTTP_CONNECT_TIMEOUT_SECS))
        .timeout(Duration::from_secs(HTTP_REQUEST_TIMEOUT_SECS))
        .build()
        .expect("reqwest client should build with fixed timeouts")
}

fn query_param(path: &str, key: &str) -> Option<String> {
    path.split('?')
        .nth(1)?
        .split('&')
        .find_map(|part| {
            let mut pieces = part.splitn(2, '=');
            let param_key = pieces.next()?;
            if param_key != key {
                return None;
            }
            let value = pieces.next().unwrap_or("");
            if value.is_empty() {
                None
            } else {
                Some(value.to_string())
            }
        })
}

pub fn try_handle_proxy_route<R: BufRead + Read, W: Write>(
    method: &str,
    path: &str,
    request_path: &str,
    reader: &mut R,
    stream: &mut W,
    app_handle: &AppHandle,
) -> bool {
    let cors_auth = "Access-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type";
    let cors_gateway = "Access-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, POST, DELETE, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type, Authorization";

    match (method, request_path) {
        ("GET", "/server-identity") => {
            log::info!("Server identity request received");
            let port_opt = super::server::PERSONAL_SERVER_PORT
                .lock()
                .ok()
                .and_then(|g| *g);
            log::info!("Personal server port: {:?}", port_opt);
            if let Some(port) = port_opt {
                match http_client().get(format!("http://localhost:{}/health", port)).send() {
                    Ok(resp) if resp.status().is_success() => {
                        let body = resp.text().unwrap_or_default();
                        let resp_str = format!(
                            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n{}\r\nContent-Length: {}\r\n\r\n{}",
                            cors_auth,
                            body.len(),
                            body
                        );
                        let _ = stream.write_all(resp_str.as_bytes());
                    }
                    Ok(_) | Err(_) => {
                        let resp_str = format!(
                            "HTTP/1.1 503 Service Unavailable\r\n{}\r\n\r\n",
                            cors_auth
                        );
                        let _ = stream.write_all(resp_str.as_bytes());
                    }
                }
            } else {
                let resp_str = format!(
                    "HTTP/1.1 503 Service Unavailable\r\n{}\r\n\r\n",
                    cors_auth
                );
                let _ = stream.write_all(resp_str.as_bytes());
            }
            true
        }
        ("POST", "/register-server") => {
            let content_length = read_content_length(reader);
            let Some(body_str) = read_utf8_body(reader, content_length) else {
                return true;
            };
            log::info!("Register server request: {}", body_str);

            if let Ok(reg) = serde_json::from_str::<serde_json::Value>(&body_str) {
                let signature = reg["signature"].as_str().unwrap_or_default();
                let message = &reg["message"];

                match http_client()
                    .post(format!("{}/v1/servers", gateway_url()))
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
                            let server_id = serde_json::from_str::<serde_json::Value>(&resp_body)
                                .ok()
                                .and_then(|v| v["serverId"].as_str().map(|s| s.to_string()));
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
                            status,
                            cors_auth,
                            resp_body.len(),
                            resp_body
                        );
                        let _ = stream.write_all(resp_str.as_bytes());
                    }
                    Err(e) => {
                        let err_body = format!("{{\"error\":\"{}\"}}", e);
                        let resp_str = format!(
                            "HTTP/1.1 502 Bad Gateway\r\nContent-Type: application/json\r\n{}\r\nContent-Length: {}\r\n\r\n{}",
                            cors_auth,
                            err_body.len(),
                            err_body
                        );
                        let _ = stream.write_all(resp_str.as_bytes());
                    }
                }
            }
            true
        }
        ("GET", "/check-server-url") => {
            let address = query_param(path, "address").unwrap_or_default();
            if address.is_empty() {
                let resp_str = format!(
                    "HTTP/1.1 400 Bad Request\r\nContent-Type: application/json\r\n{}\r\n\r\n{{\"error\":\"Missing address parameter\"}}",
                    cors_gateway
                );
                let _ = stream.write_all(resp_str.as_bytes());
                return true;
            }

            match http_client()
                .get(format!("{}/v1/servers/{}", gateway_url(), address))
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
                        status,
                        cors_gateway,
                        resp_body.len(),
                        resp_body
                    );
                    let _ = stream.write_all(resp_str.as_bytes());
                }
                Err(e) => {
                    let err_body = format!("{{\"error\":\"{}\"}}", e);
                    let resp_str = format!(
                        "HTTP/1.1 502 Bad Gateway\r\nContent-Type: application/json\r\n{}\r\nContent-Length: {}\r\n\r\n{}",
                        cors_gateway,
                        err_body.len(),
                        err_body
                    );
                    let _ = stream.write_all(resp_str.as_bytes());
                }
            }
            true
        }
        ("POST", "/deregister-server") => {
            let content_length = read_content_length(reader);
            let Some(body_str) = read_utf8_body(reader, content_length) else {
                return true;
            };
            log::info!("Deregister server request: {}", body_str);

            if let Ok(dereg) = serde_json::from_str::<serde_json::Value>(&body_str) {
                let server_address = dereg["serverAddress"].as_str().unwrap_or_default();
                let signature = dereg["signature"].as_str().unwrap_or_default();
                let owner_address = dereg["ownerAddress"].as_str().unwrap_or_default();
                let deadline = dereg["deadline"].as_u64().unwrap_or(0);

                let delete_body = serde_json::json!({
                    "ownerAddress": owner_address,
                    "deadline": deadline,
                });

                match http_client()
                    .delete(format!("{}/v1/servers/{}", gateway_url(), server_address))
                    .header("Content-Type", "application/json")
                    .header("Authorization", format!("Web3Signed {}", signature))
                    .json(&delete_body)
                    .send()
                {
                    Ok(resp) => {
                        let status = resp.status().as_u16();
                        let resp_body = resp.text().unwrap_or_default();
                        log::info!("Gateway deregister response: {} {}", status, resp_body);
                        let resp_str = format!(
                            "HTTP/1.1 {} OK\r\nContent-Type: application/json\r\n{}\r\nContent-Length: {}\r\n\r\n{}",
                            status,
                            cors_gateway,
                            resp_body.len(),
                            resp_body
                        );
                        let _ = stream.write_all(resp_str.as_bytes());
                    }
                    Err(e) => {
                        let err_body = format!("{{\"error\":\"{}\"}}", e);
                        let resp_str = format!(
                            "HTTP/1.1 502 Bad Gateway\r\nContent-Type: application/json\r\n{}\r\nContent-Length: {}\r\n\r\n{}",
                            cors_gateway,
                            err_body.len(),
                            err_body
                        );
                        let _ = stream.write_all(resp_str.as_bytes());
                    }
                }
            }
            true
        }
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::query_param;

    #[test]
    fn query_param_reads_expected_value() {
        assert_eq!(
            query_param("/check-server-url?address=0xabc&x=1", "address"),
            Some("0xabc".to_string())
        );
    }

    #[test]
    fn query_param_returns_none_for_missing_or_empty() {
        assert_eq!(query_param("/check-server-url?x=1", "address"), None);
        assert_eq!(query_param("/check-server-url?address=", "address"), None);
    }
}
