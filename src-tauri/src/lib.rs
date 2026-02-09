mod commands;
mod processors;

use commands::{
    cancel_browser_auth, check_browser_available, check_connected_platforms, check_connector_updates,
    cleanup_personal_server, clear_browser_session, debug_connector_paths, download_browser,
    download_chromium_rust, download_connector, get_app_config, get_installed_connectors,
    get_personal_server_status, get_platforms, get_registry_url, get_run_files, get_user_data_path,
    handle_download, list_browser_sessions, load_run_export_data, load_runs, open_folder,
    open_platform_export_folder, set_app_config, start_browser_auth, start_personal_server,
    stop_connector_run, stop_personal_server, start_connector_run, test_nodejs, write_export_data,
};
use tauri::{Listener, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            // Enable logging in both debug and release builds
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Info)
                    .build(),
            )?;

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
            load_runs,
            load_run_export_data,
            check_connector_updates,
            download_connector,
            get_registry_url,
            get_installed_connectors,
            get_app_config,
            set_app_config,
            start_browser_auth,
            cancel_browser_auth,
            start_personal_server,
            stop_personal_server,
            get_personal_server_status,
            list_browser_sessions,
            clear_browser_session,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app, event| {
            if let tauri::RunEvent::Exit = event {
                cleanup_personal_server();
            }
        });
}
