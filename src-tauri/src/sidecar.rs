use std::process::{Command, Child, Stdio};
use std::sync::Mutex;
use std::time::Duration;
use std::net::TcpStream;
use std::io::{Write, Read};
use std::path::PathBuf;

pub struct SidecarState {
    pub status: Mutex<String>, // "starting", "running", "dead"
    pub child: Mutex<Option<Child>>,
}

impl SidecarState {
    pub fn new() -> Self {
        Self {
            status: Mutex::new("starting".to_string()),
            child: Mutex::new(None),
        }
    }
}

// Function to check if the port is open and returns HTTP 200 OK from /api/health
pub fn check_health() -> bool {
    if let Ok(mut stream) = TcpStream::connect_timeout(
        &"127.0.0.1:48921".parse().unwrap(),
        Duration::from_millis(500)
    ) {
        let _ = stream.set_read_timeout(Some(Duration::from_millis(500)));
        let request = "GET /api/health HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n";
        if stream.write_all(request.as_bytes()).is_ok() {
            let mut response = [0; 1024];
            if let Ok(n) = stream.read(&mut response) {
                let resp_str = String::from_utf8_lossy(&response[..n]);
                return resp_str.contains("200 OK") && resp_str.contains("ok");
            }
        }
    }
    false
}

pub fn spawn_sidecar_process() -> Result<Child, String> {
    // 1. Try to find the production sidecar executable in the same directory as our app
    if let Ok(current_exe) = std::env::current_exe() {
        if let Some(exe_dir) = current_exe.parent() {
            let sidecar_path = exe_dir.join("tact-backend-x86_64-pc-windows-msvc.exe");
            if sidecar_path.exists() {
                // To avoid console window flashing, we can use creation flags under windows if needed,
                // but std::process::Command is standard.
                let child = Command::new(sidecar_path)
                    .stdout(Stdio::null())
                    .stderr(Stdio::null())
                    .spawn()
                    .map_err(|e| format!("Failed to spawn production sidecar: {}", e))?;
                return Ok(child);
            }
        }
    }

    // 2. Fallback to development mode: run via python virtual environment
    let mut root_dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    
    // Find python-backend directory
    let mut python_backend_dir = root_dir.join("python-backend");
    if !python_backend_dir.exists() {
        if root_dir.ends_with("src-tauri") {
            if let Some(parent) = root_dir.parent() {
                python_backend_dir = parent.join("python-backend");
            }
        }
    }

    let python_exe = python_backend_dir.join(".venv").join("Scripts").join("python.exe");
    if python_exe.exists() {
        // Run python with uvicorn
        let child = Command::new(python_exe)
            .args(&["-m", "uvicorn", "main:app", "--port", "48921"])
            .current_dir(python_backend_dir)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|e| format!("Failed to spawn dev sidecar: {}", e))?;
        return Ok(child);
    }

    // 3. Fallback to global python
    let child = Command::new("python")
        .args(&["-m", "uvicorn", "main:app", "--port", "48921"])
        .current_dir(python_backend_dir)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("Failed to spawn global python sidecar: {}", e))?;
    Ok(child)
}

#[tauri::command]
pub fn restart_python_sidecar(state: tauri::State<'_, SidecarState>) -> Result<(), String> {
    let mut child_guard = state.child.lock().unwrap();
    if let Some(mut child) = child_guard.take() {
        let _ = child.kill();
    }
    
    match spawn_sidecar_process() {
        Ok(new_child) => {
            *child_guard = Some(new_child);
            *state.status.lock().unwrap() = "starting".to_string();
            Ok(())
        }
        Err(e) => {
            *state.status.lock().unwrap() = "dead".to_string();
            Err(e)
        }
    }
}

#[tauri::command]
pub fn get_sidecar_status(state: tauri::State<'_, SidecarState>) -> String {
    state.status.lock().unwrap().clone()
}
