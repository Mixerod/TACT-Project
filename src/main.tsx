import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { useProfileStore } from "./stores/profileStore";
import { useRunStore } from "./stores/runStore";
import { useMappingStore } from "./stores/mappingStore";

import { invoke } from "@tauri-apps/api/core";
import { initI18n } from "./i18n";
import { AppConfig } from "./types";

if (typeof window !== 'undefined') {
  (window as any).profileStore = useProfileStore;
  (window as any).runStore = useRunStore;
  (window as any).mappingStore = useMappingStore;
  console.log("TACT Automation stores bound to window:", {
    profileStore: useProfileStore,
    runStore: useRunStore,
    mappingStore: useMappingStore
  });
}

async function bootstrap() {
  let lang = "en";
  try {
    const config = await invoke<AppConfig>("get_app_config");
    lang = config.language || "en";
  } catch (err) {
    console.error("Failed to load language from app config:", err);
  }

  initI18n(lang);

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

bootstrap();
