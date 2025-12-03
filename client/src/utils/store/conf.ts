import Conf from 'conf';

// conf 实例 Map，通过 key 管理多个配置实例
// 每个实例对应一个独立的配置文件，configName 为 key 的值
const confInstances = new Map<string, Conf<Record<string, any>>>();

// 默认配置实例（向后兼容）
const DEFAULT_INSTANCE_KEY = 'default';

/**
 * 获取或创建 conf 实例
 * @param key 实例标识，同时也是 configName 的值
 * @returns Conf 实例
 */
export function getConfInstance(key: string): Conf<Record<string, any>> {
  if (!confInstances.has(key)) {
    const conf = new Conf<Record<string, any>>({
      projectName: 'shield',
      configName: key, // configName 使用 key 的值
      // 自动清理无效配置
      clearInvalidConfig: true,
    });
    confInstances.set(key, conf);
  }
  return confInstances.get(key)!;
}

/**
 * 获取默认配置实例（向后兼容）
 */
function getDefaultConf(): Conf<Record<string, any>> {
  return getConfInstance(DEFAULT_INSTANCE_KEY);
}

/**
 * 获取指定实例的配置
 * @param instanceKey 实例标识
 * @param key 配置键名
 * @returns 配置值
 */
export function getConfig(instanceKey: string, key: string): any {
  const conf = getConfInstance(instanceKey);
  return conf.get(key);
}

/**
 * 设置指定实例的配置
 * @param instanceKey 实例标识
 * @param key 配置键名
 * @param value 配置值
 */
export function setConfig(instanceKey: string, key: string, value: any): void {
  const conf = getConfInstance(instanceKey);
  conf.set(key, value);
}

/**
 * 删除指定实例的配置
 * @param instanceKey 实例标识
 * @param key 配置键名
 */
export function removeConfig(instanceKey: string, key: string): void {
  const conf = getConfInstance(instanceKey);
  conf.delete(key);
}

/**
 * 清空指定实例的所有配置
 * @param instanceKey 实例标识
 */
export function clearConfig(instanceKey: string): void {
  const conf = getConfInstance(instanceKey);
  conf.clear();
}

/**
 * 获取指定实例的所有存储键名
 * @param instanceKey 实例标识
 * @returns 键名数组
 */
export function getAllConfigKeys(instanceKey: string): string[] {
  const conf = getConfInstance(instanceKey);
  return Object.keys(conf.store);
}

/**
 * 获取指定实例的配置文件路径
 * @param instanceKey 实例标识
 * @returns 配置文件路径
 */
export function getConfigPath(instanceKey: string): string;
/**
 * 获取默认实例的配置文件路径（向后兼容）
 * @returns 配置文件路径
 */
export function getConfigPath(): string;
export function getConfigPath(instanceKey?: string): string {
  const key = instanceKey ?? DEFAULT_INSTANCE_KEY;
  const conf = getConfInstance(key);
  return conf.path;
}

/**
 * 删除指定的 conf 实例（从 Map 中移除，但不删除文件）
 * @param instanceKey 实例标识
 */
export function removeConfInstance(instanceKey: string): void {
  confInstances.delete(instanceKey);
}

/**
 * 获取所有已创建的实例标识
 * @returns 实例标识数组
 */
export function getAllInstanceKeys(): string[] {
  return Array.from(confInstances.keys());
}

// ========== 全局配置函数（向后兼容，使用默认实例） ==========

/**
 * 获取全局配置（使用默认实例）
 */
export function getGlobal(key: string): any {
  return getDefaultConf().get(key);
}

/**
 * 设置全局配置（使用默认实例）
 */
export function setGlobal(key: string, value: any): void {
  getDefaultConf().set(key, value);
}

/**
 * 删除全局配置（使用默认实例）
 */
export function removeGlobal(key: string): void {
  getDefaultConf().delete(key);
}

/**
 * 清空所有全局配置（使用默认实例）
 */
export function clearGlobal(): void {
  getDefaultConf().clear();
}

/**
 * 获取所有存储键名（使用默认实例）
 */
export function getAllStoreKeys(): string[] {
  return Object.keys(getDefaultConf().store);
}

