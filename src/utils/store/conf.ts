import {
  ensureMysqlInitialized,
  getConfig as getMysqlConfig,
  setConfig as setMysqlConfig,
  removeConfig as removeMysqlConfig,
  clearConfig as clearMysqlConfig,
  getAllConfigKeys as getMysqlConfigKeys,
  getDefaultInstanceKey,
} from './mysql-store';

// ========= 旧的本地 Conf 存储（基于 conf 包） =========

// 动态导入 conf 模块（ESM）
// 使用 Function 构造函数来避免 webpack 将其转换为 require
let Conf: any;
let confModulePromise: Promise<any> | null = null;

// 初始化 conf 模块
async function initConfModule(): Promise<any> {
  if (!confModulePromise) {
    // 使用 Function 构造函数来创建动态 import，避免 webpack 转换
    const dynamicImport = new Function('specifier', 'return import(specifier)');
    confModulePromise = dynamicImport('conf').then((module: any) => {
      Conf = module.default;
      return Conf;
    });
  }
  return confModulePromise;
}

// 同步获取 Conf 类（如果已初始化）
function getConfClass(): any {
  if (!Conf) {
    throw new Error('Conf module not initialized. Call initConfModule() first.');
  }
  return Conf;
}

// conf 实例 Map，通过 key 管理多个配置实例
// 每个实例对应一个独立的配置文件，configName 为 key 的值
const confInstances = new Map<string, any>();

// 默认配置实例（向后兼容）
const DEFAULT_INSTANCE_KEY = 'default';

/**
 * 获取或创建 conf 实例
 * @param key 实例标识，同时也是 configName 的值
 * @returns Conf 实例
 */
export function getConfInstance(key: string): any {
  // 确保 Conf 模块已加载
  if (!Conf) {
    // 如果模块还未加载，同步等待（这在运行时应该已经加载完成）
    // 如果确实未加载，抛出错误提示
    throw new Error('Conf module not initialized. Please ensure the module is loaded before use.');
  }

  if (!confInstances.has(key)) {
    const ConfClass = getConfClass();
    const conf = new ConfClass({
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
function getDefaultConf(): any {
  return getConfInstance(DEFAULT_INSTANCE_KEY);
}

// 在模块加载时立即初始化（异步）
void initConfModule().catch((err) => {
  console.error('Failed to initialize conf module:', err);
});

/**
 * 确保存储已初始化（应用启动时调用）
 * - 初始化本地 Conf 存储
 * - 初始化当前配置的持久化存储（默认 MySQL，可通过 STORAGE_DRIVER=sqlite 切到 SQLite）
 */
export async function ensureConfInitialized(): Promise<void> {
  await initConfModule();
  await ensureMysqlInitialized();
}

// ========= 实例级配置：读取优先使用旧存储，写入只走当前持久化存储 =========

/**
 * 获取指定实例的配置
 * 读取顺序：先旧的本地 Conf 存储，如果不存在再从当前持久化存储读取
 */
export function getConfig(instanceKey: string, key: string): any {
  // 1) 先从旧的本地 Conf 存储读取
  try {
    const conf = getConfInstance(instanceKey);
    const value = conf.get(key);
    if (Object.prototype.hasOwnProperty.call(conf.store, key)) {
      return value;
    }
  } catch {
    // 旧存储不可用时忽略错误，继续走 MySQL
  }

  // 2) 再从 MySQL 存储读取
  return getMysqlConfig(instanceKey, key);
}

/**
 * 设置指定实例的配置
 * 新增/更新的数据只写入当前持久化存储，旧文件中的历史数据保持不变
 */
export function setConfig(instanceKey: string, key: string, value: any): void {
  setMysqlConfig(instanceKey, key, value);
}

/**
 * 删除指定实例的配置
 * 只删除当前持久化存储中的数据，不改动旧文件中的历史数据
 */
export function removeConfig(instanceKey: string, key: string): void {
  removeMysqlConfig(instanceKey, key);
}

/**
 * 清空指定实例的所有配置
 * 只清空当前持久化存储中的数据，不改动旧文件中的历史数据
 */
export function clearConfig(instanceKey: string): void {
  clearMysqlConfig(instanceKey);
}

/**
 * 获取指定实例的所有存储键名
 * 返回旧存储和当前持久化存储中键名的并集
 */
export function getAllConfigKeys(instanceKey: string): string[] {
  const keys = new Set<string>();

  // 旧存储中的键
  try {
    const conf = getConfInstance(instanceKey);
    for (const k of Object.keys(conf.store)) {
      keys.add(k);
    }
  } catch {
    // 忽略旧存储错误
  }

  // MySQL 中的键
  for (const k of getMysqlConfigKeys(instanceKey)) {
    keys.add(k);
  }

  return Array.from(keys);
}

/**
 * 获取指定实例的配置文件路径（旧存储）
 * - 优先返回本地 Conf 存储的路径（便于查看旧数据，如 ~/Library/Preferences/shield-nodejs/default.json）
 * - 如果旧存储不可用，则返回当前持久化存储标识
 */
export function getConfigPath(instanceKey: string): string;
/**
 * 获取默认实例的配置文件路径（向后兼容）
 */
export function getConfigPath(): string;
export function getConfigPath(instanceKey?: string): string {
  const key = instanceKey ?? DEFAULT_INSTANCE_KEY;
  try {
    const conf = getConfInstance(key);
    return conf.path;
  } catch {
    return 'storage://';
  }
}

/**
 * 删除指定的配置实例
 * - 仅从内存中的旧 Conf 实例 Map 中移除，不影响 MySQL 中的数据
 */
export function removeConfInstance(instanceKey: string): void {
  confInstances.delete(instanceKey);
}

/**
 * 获取所有已创建的实例标识
 * - 返回旧 Conf 实例和当前持久化存储默认实例标识的并集
 */
export function getAllInstanceKeys(): string[] {
  const keys = new Set<string>();
  for (const key of confInstances.keys()) {
    keys.add(key);
  }
  keys.add(getDefaultInstanceKey());
  return Array.from(keys);
}

// ========== 全局配置函数（向后兼容：读优先旧存储，写只走当前持久化存储） ==========

/**
 * 获取全局配置（使用默认实例）
 * 读取顺序：先旧的本地 Conf 存储，如果不存在再从当前持久化存储读取
 */
export function getGlobal(key: string): any {
  try {
    const conf = getDefaultConf();
    const value = conf.get(key);
    if (Object.prototype.hasOwnProperty.call(conf.store, key)) {
      return value;
    }
  } catch {
    // 忽略旧存储错误
  }

  return getMysqlConfig(getDefaultInstanceKey(), key);
}

/**
 * 设置全局配置（使用默认实例）
 * 新增/更新的数据只写入当前持久化存储
 */
export function setGlobal(key: string, value: any): Promise<void> {
  return setMysqlConfig(getDefaultInstanceKey(), key, value);
}

/**
 * 删除全局配置（使用默认实例）
 * 只删除当前持久化存储中的数据
 */
export function removeGlobal(key: string): void {
  removeMysqlConfig(getDefaultInstanceKey(), key);
}

/**
 * 清空所有全局配置（使用默认实例）
 * 只清空当前持久化存储中的数据
 */
export function clearGlobal(): void {
  clearMysqlConfig(getDefaultInstanceKey());
}

/**
 * 获取所有存储键名（使用默认实例）
 * 返回旧存储和当前持久化存储中键名的并集
 */
export function getAllStoreKeys(): string[] {
  const keys = new Set<string>();
  try {
    const conf = getDefaultConf();
    for (const k of Object.keys(conf.store)) {
      keys.add(k);
    }
  } catch {
    // 忽略旧存储错误
  }

  for (const k of getMysqlConfigKeys(getDefaultInstanceKey())) {
    keys.add(k);
  }

  return Array.from(keys);
}
