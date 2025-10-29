import { autoUpdater } from 'electron-updater'
import { UpdateInfo, ReleaseNoteInfo } from 'builder-util-runtime'
import log from 'electron-log'
import { BrowserWindow, dialog, ipcMain, app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { setUpdateWindow } from '../windows'

let updateFlag = false // 防止重复检查
let isUpdateAvailable = false // 标志是否发现新版本
let isDev = !app.isPackaged // 是否为开发环境

// 在开发环境中启用更新检查
export function enableUpdateInDev() {
  // 绕过开发环境限制
  Object.defineProperty(app, 'isPackaged', {
    get() {
      return false;
    }
  });
  
  // 启用详细日志
  autoUpdater.logger = log;
  // @ts-ignore - electron-log的类型定义可能与实际使用不匹配
  autoUpdater.logger.transports.file.level = 'debug';
  
  log.info('已在开发环境中启用更新检查功能');
  
  // 强制设置更新URL（如果package.json中的配置失效）
  const updateUrl = process.env.QINIU_YUN_URL || 'https://dybenben.oss-cn-hongkong.aliyuncs.com/x-assistant-plus';
  log.info('设置更新 URL:', updateUrl);
  
  autoUpdater.setFeedURL({
    provider: 'generic' as const,
    url: `${updateUrl}/updates/`
  });
  
  return autoUpdater;
}

// 自动更新检查
export async function checkForUpdates() {
  if (updateFlag || isUpdateAvailable) {
    log.info('更新检查被跳过：updateFlag=' + updateFlag + ', isUpdateAvailable=' + isUpdateAvailable);
    return
  }

  updateFlag = true // 锁定更新检查
  try {
    log.info('开始检查更新...');
    const result = await autoUpdater.checkForUpdates()
    log.info('更新检查结果:', result);
  } catch (error) {
    log.error('更新检查失败:', error)
  } finally {
    updateFlag = false // 解除更新锁
    log.info('更新检查完成，解除锁定');
  }
}

// 检查并创建更新目录
function ensureUpdateDirectory() {
  const updateDir = path.join(app.getPath('userData'), 'updater');
  log.info('更新目录路径:', updateDir);
  if (!fs.existsSync(updateDir)) {
    log.info('创建更新目录...');
    fs.mkdirSync(updateDir, { recursive: true });
  }
  return updateDir;
}

export function setupAutoUpdater(win: BrowserWindow) {
  log.info('开始设置自动更新...');
  // 确保更新目录存在
  ensureUpdateDirectory();
  
  // 设置更新配置
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.autoDownload = false; // 不自动下载，等待用户确认
  autoUpdater.allowPrerelease = true;
  
  log.info('更新配置已设置');
  
  // 设置管理员权限
  autoUpdater.requestHeaders = {
    'User-Agent': 'Electron'
  };
  
  // 设置更新目录权限
      if (process.platform === 'win32') {
    const updateUrl = process.env.QINIU_YUN_URL || 'https://dybenben.oss-cn-hongkong.aliyuncs.com/x-assistant-plus';
    const feedURL = {
      provider: 'generic' as const,
      url: `${updateUrl}/updates/`
    };
    log.info('Windows 平台更新 URL:', feedURL);
    autoUpdater.setFeedURL(feedURL);
  }

  // 监听更新事件
  autoUpdater.on('checking-for-update', () => {
    log.info('正在检查更新...');
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    log.info('发现新版本:', info.version);
    isUpdateAvailable = true;
    
    // 读取版本信息
    const newVersion = info.version;
    const releaseNotes = info.releaseNotes || '';
    const releaseName = info.releaseName || '新版本';
    
    // 读取自定义字段
    const updateInfo = info as any;
    const forceUpdate = updateInfo.forceUpdate === true;
    const updateType = updateInfo.updateType || 'normal';

    // 打开更新页面
    const updateWindow = new BrowserWindow({
      width: 800,
      height: 600,
      alwaysOnTop: true,
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        webviewTag: true, // 启用 webview 标签
        // devTools: true,
        webSecurity: false,
        nodeIntegration: true // 启用Node.js集成，以便在渲染进程中使用Node.js模块
      }
    });

    // 加载更新页面，并传递版本信息
    const notesText = typeof releaseNotes === 'string' 
      ? releaseNotes 
      : Array.isArray(releaseNotes) 
        ? releaseNotes.map(note => typeof note === 'string' ? note : note.note).join('\n')
        : '';
    setUpdateWindow(updateWindow);
    const updateUrl = `${process.env.WEBVIEW_URL}/installer?version=${newVersion}&releaseNotes=${encodeURIComponent(notesText)}&releaseName=${encodeURIComponent(releaseName)}&forceUpdate=${forceUpdate}&updateType=${updateType}`
    updateWindow.loadURL(updateUrl);
    updateWindow.on('closed', () => {
       app.quit();
    });

  });

  autoUpdater.on('update-not-available', async () => {
    log.info('当前已是最新版本');
  });

  autoUpdater.on('error', (error: any) => {
    log.error('更新出错:', error);
    
    // 在开发环境中，当出现错误时提供更多信息
    if (isDev) {
      log.info('这是开发环境。更新错误可能是因为DMG/EXE文件格式不兼容。');
      log.info('您可以通过"调试"菜单中的"模拟更新可用"来测试更新流程UI。');
    }
    
    updateFlag = false; // 解除更新锁
  });
  log.info('自动更新设置完成');
}

function checkExtUpdate(){
   // 打开更新页面
   const updateWindow = new BrowserWindow({
    width: 800,
    height: 600,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      webviewTag: true, // 启用 webview 标签
      // devTools: true,
      webSecurity: false,
      nodeIntegration: true // 启用Node.js集成，以便在渲染进程中使用Node.js模块
    }
  });

  setUpdateWindow(updateWindow);
  const updateUrl = `${process.env.WEBVIEW_URL}/installer/ext`
  updateWindow.loadURL(updateUrl);
}


// 示例：监听前端用户确认事件
ipcMain.on('user-update-confirm', (event : any, userConfirmed : any) => {
  if (userConfirmed) {
    autoUpdater.downloadUpdate();
  }
});