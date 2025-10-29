// require('module-alias/register');
import { app, BrowserWindow, protocol, Menu, MenuItem,screen as electronScreen } from 'electron';
const path = require('path');
import * as dotenv from 'dotenv';
dotenv.config({path: path.join(__dirname, '.env')}); // 加载 .env 文件中的环境变量
import { mainWindow, setMainWindow } from './windows';

import { checkForUpdates, setupAutoUpdater, enableUpdateInDev } from './update/update';
import log from 'electron-log';
import { registerRpc } from './register/rpc';
import { init } from './store';
import Store from 'electron-store';
import { initTaskManager, runByPort, runPalyByPort } from '@src/door/dy/task/run';
import { processDetector, ProcessDetector } from '@src/impl/door/process.detector';
// 使用安全服务器替代普通服务器
import { initPlatform } from '@src/door/dy/engine';


log.info("app load")
async function createDefaultWindow() {
  try {
    const store = new Store();
    init(store);

    const instance = await createWindow("main", `${process.env.WEBVIEW_URL}`);
    
    setMainWindow(instance);
    checkUpdate(instance);
    
  } catch (e) {
    log.error("createDefaultWindow error", e);
  }
}
 
export async function createWindow(windowId : string, url : string) {
  const primaryDisplay = electronScreen.getPrimaryDisplay();
  const windowInstance = new BrowserWindow({
    width: 1600,
    height: 1000,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      webviewTag: true, // 启用 webview 标签
      // devTools: true,
      webSecurity: false,
      nodeIntegration: true // 启用Node.js集成，以便在渲染进程中使用Node.js模块
    }
  });

  // 设置和获取数据示例
  //@ts-ignore
  // store.set('userPreferences', "ddd");
    //@ts-ignore
  // console.log(store.get('userPreferences'));
  // 加载NestJS服务
  windowInstance.loadURL(url); // 假设NestJS服务运行在本地3000端口

  // 打开开发者工具
  // windowInstance.webContents.openDevTools();
  //@ts-ignore
  windowInstance.webContents.windowId = windowId;
  windowInstance.title = "x助手plus";
  return windowInstance;
}

function registerFileProtocol(){
  protocol.registerFileProtocol('localfile', (request, callback) => {
    const url = request.url.replace(/^localfile:\/\//, '');
    try {
      return callback(decodeURIComponent(url));
    } catch (error) {
      console.error('ERROR: registering local file protocol', error);
    }
  });
}

// 添加开发环境调试菜单
function createDebugMenu(mainWindow: BrowserWindow) {
  // const menu = Menu.getApplicationMenu() || Menu.buildFromTemplate([]);
  
  // const debugSubmenu = new MenuItem({
  //   label: '调试',
  //   submenu: [
  //     {
  //       label: '检查更新',
  //       click: () => {
  //         testUpdateCheck();
  //       }
  //     },
  //     {
  //       label: '模拟更新可用',
  //       click: () => {
  //         // 模拟发现更新的对话框
  //         mainWindow.webContents.send('update-info', {
  //           version: '1.2.0',
  //           notes: '这是一个测试更新\n- 测试功能1\n- 测试功能2',
  //           name: '测试版本',
  //           forceUpdate: false,
  //           updateType: 'normal'
  //         });
  //       }
  //     },
  //     { type: 'separator' },
  //     {
  //       label: '应用信息',
  //       click: () => {
  //         log.info('应用版本:', app.getVersion());
  //         log.info('更新URL:', process.env.UPDATE_URL || 'http://101.43.28.195/updates/');
  //         log.info('是否打包:', app.isPackaged);
  //       }
  //     }
  //   ]
  // });
  
  // menu.append(debugSubmenu);
  // Menu.setApplicationMenu(menu);
}

function checkUpdate(mainWindow: BrowserWindow){
  log.info("checkUpdate: ", mainWindow);

  // 添加开发环境调试菜单
  if (!app.isPackaged) {
    // createDebugMenu(mainWindow);
    
    // 在开发环境中启用更新
    enableUpdateInDev();
    
    log.info("已在开发环境中启用更新检查");
  }

  // 设置自动更新
  setupAutoUpdater(mainWindow);

  // 立即检查一次更新
  log.info("应用启动: 立即检查更新...");
  setTimeout(() => {
    checkForUpdates();
  }, 200); // 延迟2秒，确保窗口已完全加载
  
  // 每隔一段时间自动检查更新
  setInterval(async () => {
    // 调用上方的函数
    await checkForUpdates();
  }, 120 * 1000); // 120秒检查一次更新
}

/**
 * 启动进程检测器，用于检测抓包工具
 */
function startProcessDetector() {
  try {
    log.info("正在启动进程检测器...");
    
    // 检查是否处于开发环境
    const isDevMode = !app.isPackaged;
    
    // 使用较长的启动延迟（20秒）和较长的检查间隔（30秒）
    // 这样可以确保应用完全启动，并减少对性能的影响
    // 在开发环境中启用调试模式，不会导致应用退出
    const detector = new ProcessDetector(30000, 20000, isDevMode);
    
    // 设置检测回调，当检测到抓包工具时会调用
    detector.setDetectionCallback((tools) => {
      log.warn(`检测到抓包工具: ${tools.join(', ')}`);
      log.warn('在开发环境中不会退出应用，但在生产环境中会退出');
      
      // 在这里可以添加其他处理逻辑，例如发送通知
    });
    
    // 记录当前配置
    const config = detector.getConfig();
    log.info(`进程检测器配置: 间隔=${config.intervalMs}ms, 延迟=${config.startDelay}ms, 调试模式=${config.debugMode}`);
    
    // 启动检测器
    detector.start();
    
    // 立即运行一次手动检查，但不会导致应用退出
    setTimeout(() => {
      log.info('运行手动检查...');
      const detectedTools = detector.runManualCheck();
      if (detectedTools.length > 0) {
        log.warn(`手动检查检测到抓包工具: ${detectedTools.join(', ')}`);
      } else {
        log.info('手动检查未检测到抓包工具');
      }
    }, 5000);
    
    log.info(`进程检测器已启动，将在${config.startDelay}ms后开始首次检查`);
    
    // 在应用退出前停止检测器
    app.on('before-quit', () => {
      log.info("应用即将退出，正在停止进程检测器");
      detector.stop();
    });
  } catch (error) {
    log.error("启动进程检测器失败:", error);
  }
}


export const start = () => {
    app.on('ready', async ()=> {
      try {
        registerRpc();
        registerFileProtocol();
        
        // 启动进程检测器
        log.info("应用已就绪，准备启动进程检测器");
        startProcessDetector();

        await createDefaultWindow();
      } catch (e) {
        log.error("ready createDefaultWindow error", e);
      }
    });

    app.on('window-all-closed', () => {
      try {
        if (process.platform !== 'darwin') {
          app.quit();
        }
      } catch (e) {
        log.error("window-all-closed error", e);
      }
    });
    
    app.on('activate', async () => {
      try {
        if (mainWindow === null) {
          await createDefaultWindow();
        }
      } catch (e) {
        log.error("activate createDefaultWindow error", e);
      }
    });

    setTimeout(async () => {
      await initPlatform();
      await initTaskManager();
      await startPlay();
    }, 1000);
}


async function startPlay(){
  await runPalyByPort();
}