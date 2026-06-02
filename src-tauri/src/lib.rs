mod commands;
mod sidecar;

use tauri::Manager;
use sidecar::{SidecarState, check_health, spawn_sidecar_process};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let sidecar_state = SidecarState::new();
    
    // Spawn sidecar initially
    match spawn_sidecar_process() {
        Ok(child) => {
            *sidecar_state.child.lock().unwrap() = Some(child);
            *sidecar_state.status.lock().unwrap() = "starting".to_string();
        }
        Err(e) => {
            eprintln!("Failed to spawn Python sidecar: {}", e);
            *sidecar_state.status.lock().unwrap() = "dead".to_string();
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(sidecar_state)
        .setup(|app| {
            // Background thread to poll the sidecar status every 5 seconds
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                loop {
                    std::thread::sleep(std::time::Duration::from_secs(5));
                    
                    let state = app_handle.state::<SidecarState>();
                    let is_healthy = check_health();
                    let mut status = state.status.lock().unwrap();
                    if is_healthy {
                        *status = "running".to_string();
                    } else {
                        let mut child_guard = state.child.lock().unwrap();
                        let child_alive = match &mut *child_guard {
                            Some(child) => {
                                match child.try_wait() {
                                    Ok(None) => true, // still running
                                    _ => false,
                                }
                            }
                            None => false,
                        };
                        if child_alive {
                            if *status != "starting" {
                                *status = "dead".to_string();
                            }
                        } else {
                            *status = "dead".to_string();
                        }
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::file_dialog::open_file_dialog,
            commands::file_dialog::open_folder_dialog,
            commands::config::load_profiles,
            commands::config::save_profile,
            commands::config::delete_profile,
            commands::config::get_app_config,
            commands::config::save_app_config,
            commands::config::open_folder_in_explorer,
            commands::config::install_update_and_exit,
            sidecar::restart_python_sidecar,
            sidecar::get_sidecar_status
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let state = window.state::<SidecarState>();
                let mut child_guard = state.child.lock().unwrap();
                if let Some(mut child) = child_guard.take() {
                    let _ = child.kill();
                    println!("Killed sidecar process on window exit.");
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                let state = app_handle.state::<SidecarState>();
                let mut child_guard = state.child.lock().unwrap();
                if let Some(mut child) = child_guard.take() {
                    let _ = child.kill();
                    println!("Killed sidecar process on app exit.");
                }
            }
        });
}
