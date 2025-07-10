import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app.tsx";
import "./styles/globals.css";
import { registerSW } from "virtual:pwa-register";
import { confirmService } from "./services/confirm-service";
import { notifications } from "./utils/notifications";

const updateSW = registerSW({
  async onNeedRefresh() {
    const shouldUpdate = await confirmService.confirm({
      title: "App Update Available",
      description:
        "New content is available. Would you like to reload the app?",
      confirmText: "Reload",
      cancelText: "Later",
    });
    if (shouldUpdate) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log("App ready to work offline");
  },
});

if ("bluetooth" in navigator === false) {
  notifications.alert(
    "Web Bluetooth API is not available in this browser. Please use Chrome, Edge, or Opera on desktop/Android.",
  );
}

ReactDOM.createRoot(document.getElementById("app")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
