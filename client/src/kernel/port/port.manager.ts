import Store from 'electron-store';
import { BrowserWindow } from 'electron';
import log from 'electron-log';

export interface PortInstance {
    port: number;
    windowId: string;
    window: BrowserWindow;
    isActive: boolean;
    createdAt: Date;
    lastActiveAt: Date;
    config?: any;
}

export class PortManager {
    private static instance: PortManager;
    private portStore: Store;
    private activeInstances: Map<number, PortInstance>;
    private availablePorts: number[];
    
    private constructor() {
        this.portStore = new Store({ name: 'port-manager' });
        this.activeInstances = new Map();
        this.availablePorts = [];
        this.initializePortRange();
    }
    
    public static getInstance(): PortManager {
        if (!PortManager.instance) {
            PortManager.instance = new PortManager();
        }
        return PortManager.instance;
    }
    
    /**
     * 初始化端口范围 (1-65535)
     */
    private initializePortRange(): void {
        for (let port = 1; port <= 65535; port++) {
            this.availablePorts.push(port);
        }
        
        // 恢复已分配的端口
        const allocatedPorts = this.portStore.get('allocatedPorts', []) as number[];
        this.availablePorts = this.availablePorts.filter(port => !allocatedPorts.includes(port));
        
        log.info(`PortManager initialized with ${this.availablePorts.length} available ports`);
    }
    
    /**
     * 分配一个可用端口
     */
    public allocatePort(): number {
        if (this.availablePorts.length === 0) {
            throw new Error('No available ports');
        }
        
        const port = this.availablePorts.shift()!;
        
        // 持久化已分配的端口
        const allocatedPorts = this.portStore.get('allocatedPorts', []) as number[];
        allocatedPorts.push(port);
        this.portStore.set('allocatedPorts', allocatedPorts);
        
        log.info(`Port ${port} allocated`);
        return port;
    }
    
    /**
     * 释放端口
     */
    public releasePort(port: number): void {
        if (this.activeInstances.has(port)) {
            this.activeInstances.delete(port);
        }
        
        if (!this.availablePorts.includes(port)) {
            this.availablePorts.push(port);
        }
        
        // 从持久化存储中移除
        const allocatedPorts = this.portStore.get('allocatedPorts', []) as number[];
        const updatedPorts = allocatedPorts.filter(p => p !== port);
        this.portStore.set('allocatedPorts', updatedPorts);
        
        log.info(`Port ${port} released`);
    }
    
    /**
     * 注册实例
     */
    public registerInstance(port: number, windowId: string, window: BrowserWindow): void {
        const instance: PortInstance = {
            port,
            windowId,
            window,
            isActive: true,
            createdAt: new Date(),
            lastActiveAt: new Date()
        };
        
        this.activeInstances.set(port, instance);
        
        // 监听窗口关闭事件
        window.on('closed', () => {
            this.releasePort(port);
            log.info(`Instance for port ${port} closed`);
        });
        
        log.info(`Instance registered for port ${port} with windowId ${windowId}`);
    }
    
    /**
     * 获取实例
     */
    public getInstance(port: number): PortInstance | undefined {
        return this.activeInstances.get(port);
    }
    
    /**
     * 获取所有活跃实例
     */
    public getActiveInstances(): PortInstance[] {
        return Array.from(this.activeInstances.values());
    }
    
    /**
     * 检查端口是否已被使用
     */
    public isPortActive(port: number): boolean {
        return this.activeInstances.has(port);
    }
    
    /**
     * 获取指定端口的窗口
     */
    public getWindow(port: number): BrowserWindow | undefined {
        const instance = this.activeInstances.get(port);
        return instance?.window;
    }
    
    /**
     * 更新实例的最后活跃时间
     */
    public updateLastActive(port: number): void {
        const instance = this.activeInstances.get(port);
        if (instance) {
            instance.lastActiveAt = new Date();
        }
    }
    
    /**
     * 获取可用端口数量
     */
    public getAvailablePortCount(): number {
        return this.availablePorts.length;
    }
    
    /**
     * 获取活跃实例数量
     */
    public getActiveInstanceCount(): number {
        return this.activeInstances.size;
    }
    
    /**
     * 生成端口配置键名
     */
    public static getPortConfigKey(port: number, configType: string): string {
        return `port_${port}_${configType}`;
    }
    
    /**
     * 清理所有端口
     */
    public cleanup(): void {
        this.activeInstances.forEach((instance, port) => {
            if (instance.window && !instance.window.isDestroyed()) {
                instance.window.close();
            }
        });
        this.activeInstances.clear();
        this.portStore.set('allocatedPorts', []);
        log.info('All ports cleaned up');
    }
} 