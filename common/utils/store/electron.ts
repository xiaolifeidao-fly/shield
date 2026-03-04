
import { mysqlStore } from './mysql.store';

/**
 * 存储类型：'electron' | 'mysql'
 */
let storeType: 'electron' | 'mysql' = 'electron';
let electronStore: any = undefined;
let currentPort: number = 0;

// MySQL 模式的内存缓存（用于同步返回）
let mysqlCache: { [key: string]: any } = {};

/**
 * 初始化 store - 支持 electron-store 或 MySQL
 */
export function initStore(storeInstance?: any, useMySQL: boolean = false): void {
    if (useMySQL) {
        storeType = 'mysql';
        console.log('[Store] MySQL storage ready');
    } else {
        storeType = 'electron';
        electronStore = storeInstance;
    }
}

/**
 * 预加载 MySQL 数据到缓存（异步）
 */
export async function preloadMySQLStore(): Promise<void> {
    if (storeType === 'mysql') {
        try {
            const store = await mysqlStore.getStore();
            mysqlCache = store;
            console.log(`[Store] Preloaded ${Object.keys(mysqlCache).length} keys to cache`);
        } catch (error) {
            console.error('[Store] Failed to preload MySQL store:', error);
        }
    }
}

// ========== 全局存储函数 ==========

/**
 * 获取全局配置 - 同步返回
 */
export function getGlobal(key: string): any {
    if (storeType === 'mysql') {
        // 从缓存获取（同步）
        return mysqlCache[key];
    }
    return electronStore.get(key);
}

/**
 * 设置全局配置 - 异步写入
 */
export async function setGlobal(key: string, value: any): Promise<void> {
    if (storeType === 'mysql') {
        // 先更新缓存
        mysqlCache[key] = value;
        // 异步写入 MySQL
        await mysqlStore.set(key, value);
        return;
    }
    return electronStore.set(key, value);
}

/**
 * 删除全局配置
 */
export async function removeGlobal(key: string): Promise<void> {
    if (storeType === 'mysql') {
        delete mysqlCache[key];
        await mysqlStore.delete(key);
        return;
    }
    return electronStore.delete(key);
}

/**
 * 清空所有全局配置
 */
export async function clearGlobal(): Promise<void> {
    if (storeType === 'mysql') {
        mysqlCache = {};
        await mysqlStore.clear();
        return;
    }
    return electronStore.clear();
}

/**
 * 获取所有存储键名
 */
export function getAllStoreKeys(): string[] {
    if (storeType === 'mysql') {
        return Object.keys(mysqlCache);
    }
    return Object.keys(electronStore.store);
}

/**
 * 同步获取 MySQL 存储的所有数据
 */
export function getMySQLStore(): Promise<{ [key: string]: any }> {
    return mysqlStore.getStore();
}

/**
 * 关闭 MySQL 连接池
 */
export async function closeMySQLStore(): Promise<void> {
    await mysqlStore.close();
}
