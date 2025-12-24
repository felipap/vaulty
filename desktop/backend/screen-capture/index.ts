import { desktopCapturer, screen } from "electron";
import { store, addRequestLog, getDeviceId } from "../store";
import { startAnimating, stopAnimating } from "../tray/animate";

let captureInterval: NodeJS.Timeout | null = null;
let nextCaptureTime: Date | null = null;

export function getNextCaptureTime(): Date | null {
  return nextCaptureTime;
}

export function getTimeUntilNextCapture(): number {
  if (!nextCaptureTime) {
    return 0;
  }
  return Math.max(0, nextCaptureTime.getTime() - Date.now());
}

export function formatTimeUntilNextCapture(): string {
  const ms = getTimeUntilNextCapture();
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

async function captureScreen(): Promise<Buffer | null> {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;

  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: { width, height },
  });

  if (sources.length === 0) {
    console.error("No screen sources found");
    return null;
  }

  const primarySource = sources[0];
  const thumbnail = primarySource.thumbnail;

  return thumbnail.toPNG();
}

async function uploadScreenshot(imageBuffer: Buffer): Promise<void> {
  const serverUrl = store.get("serverUrl");
  const deviceId = getDeviceId();
  const path = "/api/screenshots";
  const uploadUrl = `${serverUrl}${path}`;

  const formData = new FormData();
  const uint8Array = new Uint8Array(imageBuffer);
  const blob = new Blob([uint8Array], { type: "image/png" });
  formData.append("screenshot", blob, `screenshot-${Date.now()}.png`);

  const startTime = Date.now();

  let response: Response;
  try {
    response = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
      headers: {
        "x-device-id": deviceId,
      },
    });
  } catch (error) {
    addRequestLog({
      timestamp: startTime,
      method: "POST",
      path,
      status: "error",
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Network error",
    });
    throw error;
  }

  const duration = Date.now() - startTime;

  if (!response.ok) {
    addRequestLog({
      timestamp: startTime,
      method: "POST",
      path,
      status: "error",
      statusCode: response.status,
      duration,
      error: `${response.status} ${response.statusText}`,
    });
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
  }

  addRequestLog({
    timestamp: startTime,
    method: "POST",
    path,
    status: "success",
    statusCode: response.status,
    duration,
  });

  console.log("Screenshot uploaded successfully");
}

async function captureAndUpload(): Promise<void> {
  console.log("Capturing screen...");

  const imageBuffer = await captureScreen();
  if (!imageBuffer) {
    console.error("Failed to capture screen");
    return;
  }

  startAnimating("old");
  try {
    await uploadScreenshot(imageBuffer);
  } catch (error) {
    console.error("Failed to upload screenshot:", error);
  } finally {
    stopAnimating();
  }
}

function scheduleNextCapture(): void {
  const screenCaptureConfig = store.get("screenCapture");
  const intervalMs = screenCaptureConfig.intervalMinutes * 60 * 1000;

  nextCaptureTime = new Date(Date.now() + intervalMs);

  captureInterval = setTimeout(async () => {
    await captureAndUpload();
    scheduleNextCapture();
  }, intervalMs);
}

export function startScreenCapture(): void {
  if (captureInterval) {
    console.log("Screen capture already running");
    return;
  }

  const screenCaptureConfig = store.get("screenCapture");
  if (!screenCaptureConfig.enabled) {
    console.log("Screen capture is disabled");
    return;
  }

  console.log("Starting screen capture...");

  // Take an initial screenshot immediately
  captureAndUpload();

  // Schedule subsequent captures
  scheduleNextCapture();
}

export function stopScreenCapture(): void {
  if (captureInterval) {
    clearTimeout(captureInterval);
    captureInterval = null;
    nextCaptureTime = null;
    console.log("Screen capture stopped");
  }
}

export function restartScreenCapture(): void {
  stopScreenCapture();
  startScreenCapture();
}

export function isScreenCaptureRunning(): boolean {
  return captureInterval !== null;
}

export async function captureNow(): Promise<void> {
  await captureAndUpload();
}

