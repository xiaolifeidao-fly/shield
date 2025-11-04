// require('module-alias/register');
import { app, BrowserWindow, protocol, Menu, MenuItem,screen as electronScreen } from 'electron';
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');
import * as dotenv from 'dotenv';
dotenv.config({path: path.join(__dirname, '.env')}); // 加载 .env 文件中的环境变量
import { mainWindow, setMainWindow } from './windows';

import log from 'electron-log';
import { registerRpc } from './register/rpc';
import { init } from './store';
import Store from 'electron-store';
import { initializeScheduledTasks } from '@src/task/task';
// 使用安全服务器替代普通服务器


log.info("app load")


async function createDefaultWindow() {
  try {
    const store = new Store();
    init(store);

    const instance = await createWindow("main", `${process.env.WEBVIEW_URL}`);
    
    setMainWindow(instance);
    
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
  windowInstance.title = "shield";
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





export const start = () => {

    app.on('ready', async ()=> {
      try {
        
        registerRpc();
        registerFileProtocol();

        await createDefaultWindow();
        
        // 初始化定时任务
        setTimeout(async () => {
          try {
            await initializeScheduledTasks();
            log.info("Scheduled tasks initialized successfully");
          } catch (e) {
            log.error("Failed to initialize scheduled tasks:", e);
          }
        }, 2000); // 延迟2秒，确保 RPC 注册完成
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
    }, 1000);
}

