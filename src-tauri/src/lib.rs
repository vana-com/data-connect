mod commands;
mod processors;

use commands::{
    check_connected_platforms, get_platforms, get_run_files, get_user_data_path, handle_download,
    open_folder, open_platform_export_folder, start_connector_run, stop_connector_run,
    write_export_data,
};

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
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_platforms,
            start_connector_run,
            stop_connector_run,
            check_connected_platforms,
            get_user_data_path,
            handle_download,
            open_folder,
            get_run_files,
            write_export_data,
            open_platform_export_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
