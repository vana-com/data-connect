mod commands;
mod processors;

use commands::{
    check_browser_available, check_connected_platforms, debug_connector_paths, download_browser,
    get_platforms, get_run_files, get_user_data_path, handle_download, load_runs, open_folder,
    open_platform_export_folder, start_connector_run, stop_connector_run, test_nodejs,
    write_export_data,
};
use tauri::{Listener, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

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
            test_nodejs,
            debug_connector_paths,
            get_user_data_path,
            handle_download,
            open_folder,
            get_run_files,
            write_export_data,
            open_platform_export_folder,
            load_runs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
