import { app, Menu, Tray, nativeImage } from "electron";
import {
  formatTimeUntilNextCapture,
  isScreenCaptureRunning,
  startScreenCapture,
  stopScreenCapture,
} from "../screen-capture";
import { showMainWindow } from "../windows/main";
import { store } from "../store";

let tray: Tray | null = null;
let updateInterval: NodeJS.Timeout | null = null;

function createTrayIcon(): Tray {
  // Create a simple tray icon (you can replace with a real icon later)
  const icon = nativeImage.createEmpty();

  tray = new Tray(icon);
  tray.setToolTip("Context");

  updateTrayMenu();

  return tray;
}

function updateTrayMenu(): void {
  if (!tray) {
    return;
  }

  const isCapturing = isScreenCaptureRunning();
  const timeUntilNext = formatTimeUntilNextCapture();
  const screenCaptureConfig = store.get("screenCapture");
  const intervalMinutes = screenCaptureConfig.intervalMinutes;

  const contextMenu = Menu.buildFromTemplate([
    // Screen Capture Section
    {
      label: "📷 Screen Capture",
      enabled: false,
    },
    {
      label: isCapturing
        ? `   Next capture in: ${timeUntilNext}`
        : "   Disabled",
      enabled: false,
    },
    {
      label: `   Interval: ${intervalMinutes} minutes`,
      enabled: false,
    },
    { type: "separator" },

    // Actions
    {
      label: isCapturing ? "Pause Screen Capture" : "Resume Screen Capture",
      click: () => {
        const config = store.get("screenCapture");
        if (isCapturing) {
          stopScreenCapture();
          store.set("screenCapture", { ...config, enabled: false });
        } else {
          store.set("screenCapture", { ...config, enabled: true });
          startScreenCapture();
        }
        updateTrayMenu();
      },
    },
    { type: "separator" },

    // Window and app controls
    {
      label: "Open Window",
      click: showMainWindow,
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

function startTrayUpdates(): void {
  // Update the tray menu every second to show countdown
  updateInterval = setInterval(() => {
    updateTrayMenu();
  }, 1000);
}

function stopTrayUpdates(): void {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
}

export function initTray(): Tray {
  const tray = createTrayIcon();
  startTrayUpdates();
  return tray;
}

export function destroyTray(): void {
  stopTrayUpdates();
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

