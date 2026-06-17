import log from '@src/utils/logger';
import * as mysqlStore from './mysql-store.impl';
import * as sqliteStore from './sqlite-store';

type StoreDriver = 'mysql' | 'sqlite';

type StoreModule = typeof mysqlStore;

function normalizeStoreDriver(value: string | undefined): StoreDriver {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized === 'sqlite' || normalized === 'sqlite3') {
    return 'sqlite';
  }
  return 'mysql';
}

export function getStorageDriver(): StoreDriver {
  return normalizeStoreDriver(
    process.env.STORAGE_DRIVER
      || process.env.SHIELD_STORAGE_DRIVER
      || process.env.STORE_DRIVER
  );
}

function getStore(): StoreModule {
  return getStorageDriver() === 'sqlite' ? (sqliteStore as unknown as StoreModule) : mysqlStore;
}

export async function ensureMysqlInitialized(): Promise<void> {
  const driver = getStorageDriver();
  log.info(`[storage] initializing ${driver} store`);
  if (driver === 'sqlite') {
    await sqliteStore.ensureSqliteInitialized();
    return;
  }
  await mysqlStore.ensureMysqlInitialized();
}

export function getConfig(instanceKey: string, key: string): any {
  return getStore().getConfig(instanceKey, key);
}

export function setConfig(instanceKey: string, key: string, value: any): Promise<void> {
  return getStore().setConfig(instanceKey, key, value);
}

export function removeConfig(instanceKey: string, key: string): void {
  getStore().removeConfig(instanceKey, key);
}

export function clearConfig(instanceKey: string): void {
  getStore().clearConfig(instanceKey);
}

export function getAllConfigKeys(instanceKey: string): string[] {
  return getStore().getAllConfigKeys(instanceKey);
}

/**
 * 直接从数据库读取配置值，不经过内存缓存
 */
export async function getConfigFromDb(instanceKey: string, key: string): Promise<any> {
  return getStore().getConfigFromDb(instanceKey, key);
}

export function getDefaultInstanceKey(): string {
  return getStore().getDefaultInstanceKey();
}

export function getSqliteStoragePath(): string {
  return sqliteStore.getSqliteStoragePath();
}

export async function listUsers(): ReturnType<StoreModule['listUsers']> {
  return getStore().listUsers();
}

export async function getUserByUsername(username: string): ReturnType<StoreModule['getUserByUsername']> {
  return getStore().getUserByUsername(username);
}

export async function insertUser(...args: Parameters<StoreModule['insertUser']>): ReturnType<StoreModule['insertUser']> {
  return getStore().insertUser(...args);
}

export async function updateUser(...args: Parameters<StoreModule['updateUser']>): ReturnType<StoreModule['updateUser']> {
  return getStore().updateUser(...args);
}

export async function deleteUserByUsername(username: string): ReturnType<StoreModule['deleteUserByUsername']> {
  return getStore().deleteUserByUsername(username);
}

export async function updateUserAuthCookie(...args: Parameters<StoreModule['updateUserAuthCookie']>): ReturnType<StoreModule['updateUserAuthCookie']> {
  return getStore().updateUserAuthCookie(...args);
}
