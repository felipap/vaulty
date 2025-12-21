import { desktopCapturer, screen } from 'electron';
import { store } from '../store';

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
		types: ['screen'],
		thumbnailSize: { width, height },
	});

	if (sources.length === 0) {
		console.error('No screen sources found');
		return null;
	}

	const primarySource = sources[0];
	const thumbnail = primarySource.thumbnail;

	return thumbnail.toPNG();
}

async function uploadScreenshot(imageBuffer: Buffer): Promise<void> {
	const serverUrl = store.get('serverUrl');
	const uploadUrl = `${serverUrl}/api/screenshots`;

	const formData = new FormData();
	const uint8Array = new Uint8Array(imageBuffer);
	const blob = new Blob([uint8Array], { type: 'image/png' });
	formData.append('screenshot', blob, `screenshot-${Date.now()}.png`);

	const response = await fetch(uploadUrl, {
		method: 'POST',
		body: formData,
	});

	if (!response.ok) {
		throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
	}

	console.log('Screenshot uploaded successfully');
}

async function captureAndUpload(): Promise<void> {
	console.log('Capturing screen...');

	const imageBuffer = await captureScreen();
	if (!imageBuffer) {
		console.error('Failed to capture screen');
		return;
	}

	try {
		await uploadScreenshot(imageBuffer);
	} catch (error) {
		console.error('Failed to upload screenshot:', error);
	}
}

function scheduleNextCapture(): void {
	const screenCaptureConfig = store.get('screenCapture');
	const intervalMs = screenCaptureConfig.intervalMinutes * 60 * 1000;

	nextCaptureTime = new Date(Date.now() + intervalMs);

	captureInterval = setTimeout(async () => {
		await captureAndUpload();
		scheduleNextCapture();
	}, intervalMs);
}

export function startScreenCapture(): void {
	if (captureInterval) {
		console.log('Screen capture already running');
		return;
	}

	const screenCaptureConfig = store.get('screenCapture');
	if (!screenCaptureConfig.enabled) {
		console.log('Screen capture is disabled');
		return;
	}

	console.log('Starting screen capture...');

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
		console.log('Screen capture stopped');
	}
}

export function restartScreenCapture(): void {
	stopScreenCapture();
	startScreenCapture();
}

export function isScreenCaptureRunning(): boolean {
	return captureInterval !== null;
}
