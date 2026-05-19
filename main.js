const { app, BrowserWindow, Tray, Menu, nativeImage, screen, ipcMain, dialog } = require('electron');
const path = require('path');

let mainWindow;
let tray;
let isPinned = true;
let isVisible = true;

function getTrayIconPath() {
  const preferred = path.join(__dirname, 'assets', 'idle-01.png');
  return preferred;
}

function createWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  const width = 220;
  const height = 220;
  const x = Math.round(workArea.x + workArea.width - width - 20);
  const y = Math.round(workArea.y + workArea.height - height - 10);

  mainWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = getTrayIconPath();
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip('哈士奇电子宠物');

  const buildMenu = () => Menu.buildFromTemplate([
    {
      label: isVisible ? '隐藏宠物' : '显示宠物',
      click: () => {
        if (!mainWindow) return;
        if (isVisible) {
          mainWindow.hide();
        } else {
          mainWindow.show();
        }
        isVisible = !isVisible;
        tray.setContextMenu(buildMenu());
      }
    },
    {
      label: isPinned ? '取消置顶' : '置顶',
      click: () => {
        if (!mainWindow) return;
        isPinned = !isPinned;
        mainWindow.setAlwaysOnTop(isPinned);
        tray.setContextMenu(buildMenu());
      }
    },
    {
      label: '设置',
      click: async () => {
        await dialog.showMessageBox({
          type: 'info',
          title: '设置',
          message: '设置面板接口预留中。',
          detail: '后续可在此接入动画速度、提醒频率、语音包等配置。'
        });
      }
    },
    { type: 'separator' },
    {
      label: '退出程序',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(buildMenu());
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});

ipcMain.handle('pet:move-by', (_, deltaX, deltaY) => {
  if (!mainWindow) return;
  const [x, y] = mainWindow.getPosition();
  const { workArea } = screen.getDisplayNearestPoint({ x, y });
  const [w, h] = mainWindow.getSize();

  const nextX = Math.min(Math.max(workArea.x, x + Math.round(deltaX)), workArea.x + workArea.width - w);
  const nextY = Math.min(Math.max(workArea.y, y + Math.round(deltaY)), workArea.y + workArea.height - h);
  mainWindow.setPosition(nextX, nextY);
  return { x: nextX, y: nextY };
});

ipcMain.handle('pet:get-bounds', () => {
  if (!mainWindow) return null;
  const [x, y] = mainWindow.getPosition();
  const [width, height] = mainWindow.getSize();
  const { workArea } = screen.getDisplayNearestPoint({ x, y });
  return { x, y, width, height, workArea };
});
