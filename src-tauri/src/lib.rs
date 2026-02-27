mod commands;
mod processors;

use commands::{
    check_browser_available, check_connected_platforms, check_connector_updates,
    cleanup_personal_server, cleanup_playwright_processes, clear_browser_session,
    clear_personal_server_data,
    debug_connector_paths, delete_exported_run, download_browser, download_chromium_rust,
    download_connector, get_app_config, get_installed_connectors, get_log_path,
    get_personal_server_data_path, get_personal_server_status, get_platforms, get_registry_url, get_run_files,
    get_user_data_path, handle_download, list_browser_sessions, open_personal_server_scope_folder,
    load_latest_source_export_full, load_latest_source_export_preview, load_run_export_data,
    load_runs, mark_export_synced, open_folder, open_platform_export_folder, set_app_config,
    start_connector_run, start_personal_server, stop_connector_run, stop_personal_server,
    test_nodejs, write_export_data,
};
use tauri::{Listener, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Load .env file into process environment so VITE_* vars are available
    // to std::env::var() calls (e.g. VITE_ACCOUNT_URL, VITE_CHAIN_ID).
    let _ = dotenvy::dotenv();

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // Focus the existing window when a second instance is intercepted.
            // The deep-link URL is forwarded automatically via the `deep-link`
            // cargo feature — no manual arg parsing needed.
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_clipboard_manager::init());

    #[cfg(debug_assertions)]
    let builder = builder.plugin(tauri_plugin_mcp_bridge::init());

    builder
        .setup(|app| {
            // Enable logging in both debug and release builds, writing to both stdout and a file
            // Default targets are already [Stdout, LogDir] — do NOT add
            // .target() calls or each log line gets written twice.
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Info)
                    .build(),
            )?;

            let version = app.config().version.clone().unwrap_or_default();
            log::info!("DataConnect v{} starting", version);

            // Listen for close window events from connectors
            let app_handle = app.handle().clone();
            app.listen("connector-close-window", move |event| {
                let payload_str = event.payload();
                if let Ok(payload) = serde_json::from_str::<serde_json::Value>(payload_str) {
                    if let Some(run_id) = payload.get("runId").and_then(|v| v.as_str()) {
                        let window_label = format!("connector-{}", run_id);
                        if let Some(window) = app_handle.get_webview_window(&window_label) {
                            log::info!("Closing connector window: {}", window_label);
                            let _ = window.close();
                        }
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_platforms,
            start_connector_run,
            stop_connector_run,
            check_connected_platforms,
            check_browser_available,
            download_browser,
            download_chromium_rust,
            test_nodejs,
            debug_connector_paths,
            get_user_data_path,
            handle_download,
            open_folder,
            get_run_files,
            write_export_data,
            open_platform_export_folder,
            open_personal_server_scope_folder,
            load_runs,
            load_run_export_data,
            load_latest_source_export_preview,
            load_latest_source_export_full,
            delete_exported_run,
            check_connector_updates,
            download_connector,
            get_registry_url,
            get_installed_connectors,
            get_app_config,
            set_app_config,
            get_log_path,
            start_personal_server,
            stop_personal_server,
            clear_personal_server_data,
            get_personal_server_data_path,
            get_personal_server_status,
            list_browser_sessions,
            clear_browser_session,
            mark_export_synced,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app, event| {
            if let tauri::RunEvent::Exit = event {
                cleanup_personal_server();
                cleanup_playwright_processes();
            }
        });
}
