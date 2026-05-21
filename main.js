const { app, BrowserWindow, Tray, Menu, nativeImage, screen, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

let mainWindow;
let tray;
let isPinned = true;
let isVisible = true;

const settings = {
  standReminderMinutes: 60,
  waterReminderMinutes: 120,
  petSize: 200
};

const SIZE_OPTIONS = [200, 156, 128];
const REMINDER_OPTIONS = {
  stand: [30, 45, 60, 90, 120],
  water: [60, 90, 120, 180, 240]
};

function scanAnimationAssets() {
  const assetsDir = path.join(__dirname, 'assets');
  const result = {};

  if (!fs.existsSync(assetsDir)) return result;

  const files = fs.readdirSync(assetsDir);
  const pngs = files.filter((name) => /\.png$/i.test(name));

  for (const file of pngs) {
    const m = file.match(/^(.*?)-(\d+)\.png$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const frameNo = Number(m[2]);
    if (!result[key]) result[key] = [];
    result[key].push({ frameNo, file });
  }

  Object.keys(result).forEach((key) => {
    result[key].sort((a, b) => a.frameNo - b.frameNo);
    result[key] = result[key].map((item) => item.file);
  });

  return result;
}

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

function syncSettingsToRenderer() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('settings:updated', settings);
}

function buildTrayMenu() {
  return Menu.buildFromTemplate([
    {
      label: isVisible ? '隐藏宠物' : '显示宠物',
      click: () => {
        if (!mainWindow) return;
        if (isVisible) mainWindow.hide();
        else mainWindow.show();
        isVisible = !isVisible;
        tray.setContextMenu(buildTrayMenu());
      }
    },
    {
      label: isPinned ? '取消置顶' : '置顶',
      click: () => {
        if (!mainWindow) return;
        isPinned = !isPinned;
        mainWindow.setAlwaysOnTop(isPinned);
        tray.setContextMenu(buildTrayMenu());
      }
    },
    {
      label: '设置',
      submenu: [
        {
          label: '提醒频率',
          submenu: [
            {
              label: '活动提醒',
              submenu: REMINDER_OPTIONS.stand.map((minutes) => ({
                label: `${minutes} 分钟`,
                type: 'radio',
                checked: settings.standReminderMinutes === minutes,
                click: () => {
                  settings.standReminderMinutes = minutes;
                  syncSettingsToRenderer();
                  tray.setContextMenu(buildTrayMenu());
                }
              }))
            },
            {
              label: '喝水提醒',
              submenu: REMINDER_OPTIONS.water.map((minutes) => ({
                label: `${minutes} 分钟`,
                type: 'radio',
                checked: settings.waterReminderMinutes === minutes,
                click: () => {
                  settings.waterReminderMinutes = minutes;
                  syncSettingsToRenderer();
                  tray.setContextMenu(buildTrayMenu());
                }
              }))
            }
          ]
        },
        {
          label: '宠物大小',
          submenu: [
            { label: '大 (200px)', value: 200 },
            { label: '中 (156px)', value: 156 },
            { label: '小 (128px)', value: 128 }
          ].map((item) => ({
            label: item.label,
            type: 'radio',
            checked: settings.petSize === item.value,
            click: () => {
              settings.petSize = item.value;
              syncSettingsToRenderer();
              tray.setContextMenu(buildTrayMenu());
            }
          }))
        },
        {
          label: '更多设置（预留）',
          click: async () => {
            await dialog.showMessageBox({
              type: 'info',
              title: '设置',
              message: '更多设置接口预留中。',
              detail: '后续可接入百分比缩放、音效音量、行为权重等配置。'
            });
          }
        }
      ]
    },
    { type: 'separator' },
    {
      label: '退出程序',
      click: () => app.quit()
    }
  ]);
}

function createTray() {
  const iconPath = getTrayIconPath();
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip('哈士奇电子宠物');
  tray.setContextMenu(buildTrayMenu());
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', (e) => e.preventDefault());

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

ipcMain.handle('pet:get-animation-manifest', () => scanAnimationAssets());
ipcMain.handle('pet:get-settings', () => settings);
