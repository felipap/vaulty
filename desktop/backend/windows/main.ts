import { BrowserWindow, app } from 'electron';
import path from 'node:path';

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

export function createMainWindow(): BrowserWindow {
	mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
			preload: path.join(__dirname, '../preload.js'),
		},
	});

	if (isDev) {
		mainWindow.loadURL('http://localhost:5173');
		mainWindow.webContents.openDevTools();
	} else {
		mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
	}

	mainWindow.on('closed', () => {
		mainWindow = null;
	});

	return mainWindow;
}

export function getMainWindow(): BrowserWindow | null {
	return mainWindow;
}

export function showMainWindow(): void {
	if (mainWindow) {
		mainWindow.show();
		mainWindow.focus();
	} else {
		createMainWindow();
	}
}
