use serde::Deserialize;

#[derive(Deserialize)]
pub struct FileDialogFilter {
    pub name: String,
    pub extensions: Vec<String>,
}

#[tauri::command]
pub fn open_file_dialog(
    title: Option<String>,
    filters: Option<Vec<FileDialogFilter>>,
    multiple: Option<bool>,
) -> Result<serde_json::Value, String> {
    use rfd::FileDialog;

    let mut dialog = FileDialog::new();
    if let Some(t) = title {
        dialog = dialog.set_title(&t);
    }
    if let Some(flts) = filters {
        for f in flts {
            let exts: Vec<&str> = f.extensions.iter().map(|s| s.as_str()).collect();
            dialog = dialog.add_filter(&f.name, &exts);
        }
    }

    if multiple.unwrap_or(false) {
        if let Some(paths) = dialog.pick_files() {
            let paths_str: Vec<String> = paths
                .into_iter()
                .map(|p| p.to_string_lossy().into_owned())
                .collect();
            Ok(serde_json::to_value(paths_str).unwrap())
        } else {
            Ok(serde_json::Value::Null)
        }
    } else {
        if let Some(path) = dialog.pick_file() {
            let path_str = path.to_string_lossy().into_owned();
            Ok(serde_json::to_value(path_str).unwrap())
        } else {
            Ok(serde_json::Value::Null)
        }
    }
}

#[tauri::command]
pub fn open_folder_dialog(title: Option<String>) -> Result<Option<String>, String> {
    use rfd::FileDialog;

    let mut dialog = FileDialog::new();
    if let Some(t) = title {
        dialog = dialog.set_title(&t);
    }

    if let Some(path) = dialog.pick_folder() {
        Ok(Some(path.to_string_lossy().into_owned()))
    } else {
        Ok(None)
    }
}
