use std::path::PathBuf;

fn get_app_data_dir() -> PathBuf {
    let appdata = std::env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
    PathBuf::from(appdata).join("TACTAutomation")
}

fn get_default_config() -> serde_json::Value {
    let default_profiles_dir = get_app_data_dir().join("profiles");
    let default_profiles_dir_str = default_profiles_dir.to_string_lossy().replace("\\", "/");
    serde_json::json!({
        "app_version": "1.0.0",
        "profiles_directory": default_profiles_dir_str,
        "last_used_profile_id": "",
        "python_port": 48921,
        "theme": "light",
        "language": "en"
    })
}

#[tauri::command]
pub fn get_app_config() -> Result<serde_json::Value, String> {
    let config_path = get_app_data_dir().join("config.json");
    if config_path.exists() {
        let content = std::fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read app config: {}", e))?;
        let config: serde_json::Value = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse app config: {}", e))?;
        Ok(config)
    } else {
        let default_config = get_default_config();
        let app_dir = get_app_data_dir();
        std::fs::create_dir_all(&app_dir)
            .map_err(|e| format!("Failed to create AppData directory: {}", e))?;
        let content = serde_json::to_string_pretty(&default_config).unwrap();
        std::fs::write(&config_path, content)
            .map_err(|e| format!("Failed to write default config: {}", e))?;
        Ok(default_config)
    }
}

#[tauri::command]
pub fn save_app_config(config: serde_json::Value) -> Result<(), String> {
    let config_path = get_app_data_dir().join("config.json");
    let app_dir = get_app_data_dir();
    std::fs::create_dir_all(&app_dir)
        .map_err(|e| format!("Failed to create AppData directory: {}", e))?;
    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;
    std::fs::write(&config_path, content)
        .map_err(|e| format!("Failed to write config: {}", e))?;
    Ok(())
}

fn get_profiles_dir() -> PathBuf {
    if let Ok(config) = get_app_config() {
        if let Some(dir_str) = config.get("profiles_directory").and_then(|v| v.as_str()) {
            if !dir_str.is_empty() {
                return PathBuf::from(dir_str);
            }
        }
    }
    get_app_data_dir().join("profiles")
}

#[tauri::command]
pub fn load_profiles() -> Result<Vec<serde_json::Value>, String> {
    let profiles_dir = get_profiles_dir();
    if !profiles_dir.exists() {
        std::fs::create_dir_all(&profiles_dir)
            .map_err(|e| format!("Failed to create profiles directory: {}", e))?;
        return Ok(vec![]);
    }

    let mut profiles = vec![];
    let entries = std::fs::read_dir(&profiles_dir)
        .map_err(|e| format!("Failed to read profiles directory: {}", e))?;

    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            if path.is_file() && path.extension().map_or(false, |ext| ext == "json") {
                if let Ok(content) = std::fs::read_to_string(&path) {
                    if let Ok(profile) = serde_json::from_str::<serde_json::Value>(&content) {
                        profiles.push(profile);
                    }
                }
            }
        }
    }
    Ok(profiles)
}

#[tauri::command]
pub fn save_profile(mut profile: serde_json::Value) -> Result<(), String> {
    let profiles_dir = get_profiles_dir();
    std::fs::create_dir_all(&profiles_dir)
        .map_err(|e| format!("Failed to create profiles directory: {}", e))?;

    let mut id = profile.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
    if id.is_empty() {
        id = uuid::Uuid::new_v4().to_string();
        if let Some(obj) = profile.as_object_mut() {
            obj.insert("id".to_string(), serde_json::Value::String(id.clone()));
        }
    }

    let now_str = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
    if let Some(obj) = profile.as_object_mut() {
        obj.insert("updated_at".to_string(), serde_json::Value::String(now_str.clone()));
        if obj.get("created_at").and_then(|v| v.as_str()).unwrap_or("").is_empty() {
            obj.insert("created_at".to_string(), serde_json::Value::String(now_str));
        }
    }

    let file_path = profiles_dir.join(format!("{}.json", id));
    let content = serde_json::to_string_pretty(&profile)
        .map_err(|e| format!("Failed to serialize profile: {}", e))?;
    
    std::fs::write(&file_path, content)
        .map_err(|e| format!("Failed to write profile file: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub fn delete_profile(profile_id: String) -> Result<(), String> {
    let profiles_dir = get_profiles_dir();
    let file_path = profiles_dir.join(format!("{}.json", profile_id));
    if file_path.exists() {
        std::fs::remove_file(&file_path)
            .map_err(|e| format!("Failed to delete profile file: {}", e))?;
        Ok(())
    } else {
        Err(format!("Profile not found: {}", profile_id))
    }
}

#[tauri::command]
pub fn open_folder_in_explorer(path: String) -> Result<(), String> {
    use std::process::Command;
    
    Command::new("explorer")
        .arg(&path)
        .spawn()
        .map_err(|e| format!("Failed to open folder in explorer: {}", e))?;
    Ok(())
}
