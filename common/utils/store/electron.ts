
let store: any = undefined;
let currentPort: number = 0;

/**
 * 初始化store
 */
export function initStore(electronStore: any): void {
    store = electronStore;
}

/**
 * 设置当前端口上下文
 */
export function setCurrentPort(port: number): void {
    currentPort = port;
}

/**
 * 获取当前端口
 */
export function getCurrentPort(): number {
    return currentPort;
}

/**
 * 生成带端口前缀的键名
 */
function getPortKey(key: string, port?: number): string {
    const targetPort = port || currentPort;
    if (targetPort === 0) {
        return key; // 默认全局配置
    }
    return `port_${targetPort}_${key}`;
}

// ========== 全局存储函数 (不涉及端口) ==========

/**
 * 获取全局配置 (不涉及端口)
 */
export function getGlobal(key: string): any {
    return store.get(key);
}

/**
 * 设置全局配置 (不涉及端口)
 */
export function setGlobal(key: string, value: any): void {
    store.set(key, value);
}

/**
 * 删除全局配置 (不涉及端口)
 */
export function removeGlobal(key: string): void {
    store.delete(key);
}

/**
 * 清空所有全局配置 (不涉及端口)
 */
export function clearGlobal(): void {
    store.clear();
}

// ========== 端口隔离存储函数 ==========

/**
 * 获取端口配置
 */
export function get(key: string, port?: number): any {
    const portKey = getPortKey(key, port);
    return store.get(portKey);
}

/**
 * 设置端口配置
 */
export function set(key: string, value: any, port?: number): void {
    const portKey = getPortKey(key, port);
    store.set(portKey, value);
}

/**
 * 删除端口配置
 */
export function remove(key: string, port?: number): void {
    const portKey = getPortKey(key, port);
    store.delete(portKey);
}

/**
 * 清空指定端口的所有配置
 */
export function clear(port?: number): void {
    const targetPort = port || currentPort;
    if (targetPort === 0) {
        // 如果端口为0，不应该清空全局配置，而是什么都不做
        console.warn('尝试清空端口0的配置，操作被忽略。请使用clearGlobal()清空全局配置。');
        return;
    }
    
    // 获取所有键
    const allKeys = Object.keys(store.store);
    const portPrefix = `port_${targetPort}_`;
    
    // 删除指定端口的所有配置
    allKeys.forEach(key => {
        if (key.startsWith(portPrefix)) {
            store.delete(key);
        }
    });
}

/**
 * 获取指定端口的所有配置
 */
export function getPortConfig(port: number): Record<string, any> {
    const allKeys = Object.keys(store.store);
    const portPrefix = `port_${port}_`;
    const config: Record<string, any> = {};
    
    allKeys.forEach(key => {
        if (key.startsWith(portPrefix)) {
            const configKey = key.replace(portPrefix, '');
            config[configKey] = store.get(key);
        }
    });
    
    return config;
}

/**
 * 复制配置到另一个端口
 */
export function copyPortConfig(fromPort: number, toPort: number): void {
    const config = getPortConfig(fromPort);
    Object.keys(config).forEach(key => {
        set(key, config[key], toPort);
    });
}

/**
 * 获取所有端口的配置统计
 */
export function getPortConfigStats(): Record<number, number> {
    const allKeys = Object.keys(store.store);
    const stats: Record<number, number> = {};
    
    allKeys.forEach(key => {
        const match = key.match(/^port_(\d+)_/);
        if (match) {
            const port = parseInt(match[1]);
            stats[port] = (stats[port] || 0) + 1;
        }
    });
    
    return stats;
}

/**
 * 获取所有端口的配置
 */
export function getAllPortConfigs(): Record<number, Record<string, any>> {
    const allKeys = Object.keys(store.store);
    const portConfigs: Record<number, Record<string, any>> = {};
    
    allKeys.forEach(key => {
        const match = key.match(/^port_(\d+)_(.+)/);
        if (match) {
            const port = parseInt(match[1]);
            const configKey = match[2];
            
            if (!portConfigs[port]) {
                portConfigs[port] = {};
            }
            portConfigs[port][configKey] = store.get(key);
        }
    });
    
    return portConfigs;
}

/**
 * 获取所有存储键名
 */
export function getAllStoreKeys(): string[] {
    return Object.keys(store.store);
}