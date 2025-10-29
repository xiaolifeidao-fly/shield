import { BrowserWindow, screen as electronScreen } from 'electron';
import { PortManager, PortInstance } from '../port/port.manager';
import log from 'electron-log';
import path from 'path';
import { app } from 'electron';

export interface InstanceConfig {
    port: number;
    windowTitle?: string;
    windowSize?: { width: number; height: number };
    windowPosition?: { x: number; y: number };
    startMinimized?: boolean;
}

export class InstanceManager {
    private static instance: InstanceManager;
    private portManager: PortManager;
    
    private constructor() {
        this.portManager = PortManager.getInstance();
    }
    
    public static getInstance(): InstanceManager {
        if (!InstanceManager.instance) {
            InstanceManager.instance = new InstanceManager();
        }
        return InstanceManager.instance;
    }
    
    /**
     * 创建新的应用实例
     */
    public async createInstance(config?: Partial<InstanceConfig>): Promise<PortInstance> {
        try {
            // 分配端口
            const port = this.portManager.allocatePort();
            
            // 生成唯一的窗口ID
            const windowId = `instance_${port}_${Date.now()}`;
            
            // 创建窗口
            const window = await this.createWindow(windowId, port, config);
            
            // 注册实例
            this.portManager.registerInstance(port, windowId, window);
            
            const instance = this.portManager.getInstance(port)!;
            
            log.info(`Created new instance: port=${port}, windowId=${windowId}`);
            return instance;
            
        } catch (error) {
            log.error('Failed to create instance:', error);
            throw error;
        }
    }
    
    /**
     * 创建指定端口的实例
     */
    public async createInstanceWithPort(port: number, config?: Partial<InstanceConfig>): Promise<PortInstance> {
        try {
            // 检查端口是否已被使用
            if (this.portManager.isPortActive(port)) {
                throw new Error(`Port ${port} is already in use`);
            }
            
            // 手动分配指定端口
            const windowId = `instance_${port}_${Date.now()}`;
            const window = await this.createWindow(windowId, port, { ...config, port });
            
            // 注册实例
            this.portManager.registerInstance(port, windowId, window);
            
            const instance = this.portManager.getInstance(port)!;
            
            log.info(`Created instance with specified port: port=${port}, windowId=${windowId}`);
            return instance;
            
        } catch (error) {
            log.error(`Failed to create instance with port ${port}:`, error);
            throw error;
        }
    }
    
    /**
     * 创建窗口
     */
    private async createWindow(windowId: string, port: number, config?: Partial<InstanceConfig>): Promise<BrowserWindow> {
        const primaryDisplay = electronScreen.getPrimaryDisplay();
        const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
        
        // 计算窗口位置（错开显示）
        const instanceCount = this.portManager.getActiveInstanceCount();
        const offset = (instanceCount % 5) * 50; // 每个窗口错开50px
        
        const windowOptions = {
            width: config?.windowSize?.width || 800,
            height: config?.windowSize?.height || 900,
            x: config?.windowPosition?.x || (100 + offset),
            y: config?.windowPosition?.y || (100 + offset),
            title: config?.windowTitle || `智慧助手 - 端口 ${port}`,
            show: !config?.startMinimized,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                contextIsolation: true,
                webviewTag: true,
                webSecurity: false,
                nodeIntegration: true,
                additionalArguments: [`--port=${port}`] // 传递端口参数
            }
        };
        
        const window = new BrowserWindow(windowOptions);
        
        // 设置窗口ID和端口
        (window.webContents as any).windowId = windowId;
        (window.webContents as any).port = port;
        
        // 加载页面
        const indexPath = path.join(path.dirname(app.getAppPath()), 'dy_app', 'static', 'html', 'index.html');
        await window.loadFile(indexPath);
        
        // 窗口事件处理
        window.on('focus', () => {
            this.portManager.updateLastActive(port);
        });
        
        window.on('page-title-updated', (event) => {
            event.preventDefault(); // 阻止默认标题更新
            window.setTitle(`智慧助手 - 端口 ${port}`);
        });
        
        // 开发环境下打开开发者工具
        if (process.env.NODE_ENV === 'development') {
            window.webContents.openDevTools();
        }
        
        return window;
    }
    
    /**
     * 获取所有实例
     */
    public getAllInstances(): PortInstance[] {
        return this.portManager.getActiveInstances();
    }
    
    /**
     * 获取指定端口的实例
     */
    public getInstance(port: number): PortInstance | undefined {
        return this.portManager.getInstance(port);
    }
    
    /**
     * 关闭指定端口的实例
     */
    public closeInstance(port: number): void {
        const instance = this.portManager.getInstance(port);
        if (instance && instance.window && !instance.window.isDestroyed()) {
            instance.window.close();
        }
    }
    
    /**
     * 关闭所有实例
     */
    public closeAllInstances(): void {
        const instances = this.portManager.getActiveInstances();
        instances.forEach(instance => {
            if (instance.window && !instance.window.isDestroyed()) {
                instance.window.close();
            }
        });
    }
    
    /**
     * 获取实例统计信息
     */
    public getInstanceStats(): {
        activeCount: number;
        availableSlots: number;
        instances: Array<{ port: number; windowId: string; createdAt: Date; lastActiveAt: Date }>;
    } {
        const instances = this.portManager.getActiveInstances();
        return {
            activeCount: instances.length,
            availableSlots: this.portManager.getAvailablePortCount(),
            instances: instances.map(instance => ({
                port: instance.port,
                windowId: instance.windowId,
                createdAt: instance.createdAt,
                lastActiveAt: instance.lastActiveAt
            }))
        };
    }
    
    /**
     * 重启指定端口的实例
     */
    public async restartInstance(port: number): Promise<PortInstance> {
        const oldInstance = this.portManager.getInstance(port);
        if (oldInstance) {
            oldInstance.window.close();
        }
        
        // 等待窗口关闭
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return this.createInstanceWithPort(port);
    }
    
    /**
     * 清理资源
     */
    public cleanup(): void {
        this.closeAllInstances();
        this.portManager.cleanup();
    }
} 