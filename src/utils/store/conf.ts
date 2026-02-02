import {
  ensureMysqlInitialized,
  getConfig as getMysqlConfig,
  setConfig as setMysqlConfig,
  removeConfig as removeMysqlConfig,
  clearConfig as clearMysqlConfig,
  getAllConfigKeys as getMysqlConfigKeys,
  getDefaultInstanceKey,
} from './mysql-store';

/**
 * 确保 MySQL 存储已初始化（应用启动时调用）
 */
export async function ensureConfInitialized(): Promise<void> {
  await ensureMysqlInitialized();
}

/**
 * 获取指定实例的配置
 */
export function getConfig(instanceKey: string, key: string): any {
  return getMysqlConfig(instanceKey, key);
}

/**
 * 设置指定实例的配置
 */
export function setConfig(instanceKey: string, key: string, value: any): void {
  setMysqlConfig(instanceKey, key, value);
}

/**
 * 删除指定实例的配置
 */
export function removeConfig(instanceKey: string, key: string): void {
  removeMysqlConfig(instanceKey, key);
}

/**
 * 清空指定实例的所有配置
 */
export function clearConfig(instanceKey: string): void {
  clearMysqlConfig(instanceKey);
}

/**
 * 获取指定实例的所有存储键名
 */
export function getAllConfigKeys(instanceKey: string): string[] {
  return getMysqlConfigKeys(instanceKey);
}

/**
 * 获取默认配置实例标识
 */
export function getConfigPath(): string {
  return 'mysql://';
}

/**
 * 删除指定的配置实例（MySQL 模式下不需要额外处理）
 */
export function removeConfInstance(_instanceKey: string): void {
  // no-op
}

/**
 * 获取所有已创建的实例标识（MySQL 模式下以默认实例为准）
 */
export function getAllInstanceKeys(): string[] {
  return [getDefaultInstanceKey()];
}

// ========== 全局配置函数（使用默认实例） ==========

/**
 * 获取全局配置（使用默认实例）
 */
export function getGlobal(key: string): any {
  return getMysqlConfig(getDefaultInstanceKey(), key);
}

/**
 * 设置全局配置（使用默认实例）
 */
export function setGlobal(key: string, value: any): void {
  setMysqlConfig(getDefaultInstanceKey(), key, value);
}

/**
 * 删除全局配置（使用默认实例）
 */
export function removeGlobal(key: string): void {
  removeMysqlConfig(getDefaultInstanceKey(), key);
}

/**
 * 清空所有全局配置（使用默认实例）
 */
export function clearGlobal(): void {
  clearMysqlConfig(getDefaultInstanceKey());
}

/**
 * 获取所有存储键名（使用默认实例）
 */
export function getAllStoreKeys(): string[] {
  return getMysqlConfigKeys(getDefaultInstanceKey());
}
