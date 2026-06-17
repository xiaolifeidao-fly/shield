import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import log from '@src/utils/logger';
import { BusinessType } from '@model/user.types';

const DEFAULT_INSTANCE_KEY = 'default';
const SUPPORTED_BUSINESS_TYPES = new Set<BusinessType>(['uku', 'adapundi', 'SINGA', 'KAT', 'KLIKKAMI']);

let db: any | null = null;
let DatabaseSync: any | null = null;
let initialized = false;

const instanceCache = new Map<string, Map<string, any>>();

function getEnv(name: string, fallback?: string): string | undefined {
  return process.env[name] ?? fallback;
}

function getDefaultSqlitePath(): string {
  return path.join(os.homedir(), '.config', 'shield', 'shield.sqlite');
}

function getSqlitePath(): string {
  return getEnv('SQLITE_PATH') || getEnv('SHIELD_SQLITE_PATH') || getDefaultSqlitePath();
}

function getDatabase(): any {
  if (!db) {
    throw new Error('SQLite database not initialized. Call ensureSqliteInitialized() first.');
  }
  return db;
}

function getInstanceCache(instanceKey: string): Map<string, any> {
  const key = instanceKey || DEFAULT_INSTANCE_KEY;
  let cache = instanceCache.get(key);
  if (!cache) {
    cache = new Map<string, any>();
    instanceCache.set(key, cache);
  }
  return cache;
}

function serializeValue(value: any): string {
  return JSON.stringify(value === undefined ? null : value);
}

function deserializeValue(raw: string): any {
  if (raw === null || raw === undefined) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    log.error('Failed to parse stored config value, returning raw string', err);
    return raw;
  }
}

function getLocalDateTimeString(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function ensureTables(): void {
  getDatabase().exec(`
CREATE TABLE IF NOT EXISTS shield_global_kv (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instance_key TEXT NOT NULL DEFAULT 'default',
  config_key TEXT NOT NULL,
  config_value TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(instance_key, config_key)
);

CREATE TABLE IF NOT EXISTS shield_users (
  id TEXT NOT NULL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  remark TEXT NOT NULL DEFAULT '',
  auth_cookie TEXT DEFAULT NULL,
  business_type TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);
}

function loadAllConfigs(): void {
  instanceCache.clear();
  const rows = getDatabase()
    .prepare('SELECT instance_key, config_key, config_value FROM shield_global_kv')
    .all() as Array<{ instance_key: string; config_key: string; config_value: string }>;
  for (const row of rows) {
    const cache = getInstanceCache(row.instance_key);
    cache.set(row.config_key, deserializeValue(row.config_value));
  }
}

export async function ensureSqliteInitialized(): Promise<void> {
  if (initialized) {
    return;
  }

  if (!DatabaseSync) {
    ({ DatabaseSync } = require('node:sqlite'));
  }

  const sqlitePath = getSqlitePath();
  fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });

  try {
    db = new DatabaseSync(sqlitePath);
    db.exec('PRAGMA journal_mode = DELETE; PRAGMA foreign_keys = ON;');
    ensureTables();
    loadAllConfigs();
    initialized = true;
    log.info(`SQLite storage initialized: ${sqlitePath}`);
  } catch (err: any) {
    const message = err?.message ? `SQLite 初始化失败: ${err.message}` : 'SQLite 初始化失败';
    throw new Error(message);
  }
}

export async function closeSqlite(): Promise<void> {
  if (db) {
    db.close();
    db = null;
    initialized = false;
  }
}

export function getConfig(instanceKey: string, key: string): any {
  const cache = getInstanceCache(instanceKey);
  return cache.get(key);
}

export function setConfig(instanceKey: string, key: string, value: any): Promise<void> {
  const cache = getInstanceCache(instanceKey);
  cache.set(key, value);

  const instance = instanceKey || DEFAULT_INSTANCE_KEY;
  const serialized = serializeValue(value);
  const now = getLocalDateTimeString();
  try {
    getDatabase()
      .prepare(`
INSERT INTO shield_global_kv (instance_key, config_key, config_value, created_at, updated_at)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT(instance_key, config_key)
DO UPDATE SET config_value = excluded.config_value, updated_at = excluded.updated_at
`)
      .run(instance, key, serialized, now, now);
    return Promise.resolve();
  } catch (err) {
    log.error('Failed to persist config value to SQLite', err);
    return Promise.reject(err);
  }
}

export function removeConfig(instanceKey: string, key: string): void {
  const cache = getInstanceCache(instanceKey);
  cache.delete(key);

  const instance = instanceKey || DEFAULT_INSTANCE_KEY;
  try {
    getDatabase()
      .prepare('DELETE FROM shield_global_kv WHERE instance_key = ? AND config_key = ?')
      .run(instance, key);
  } catch (err) {
    log.error('Failed to delete config value from SQLite', err);
  }
}

export function clearConfig(instanceKey: string): void {
  const cache = getInstanceCache(instanceKey);
  cache.clear();

  const instance = instanceKey || DEFAULT_INSTANCE_KEY;
  try {
    getDatabase().prepare('DELETE FROM shield_global_kv WHERE instance_key = ?').run(instance);
  } catch (err) {
    log.error('Failed to clear config values from SQLite', err);
  }
}

export function getAllConfigKeys(instanceKey: string): string[] {
  const cache = getInstanceCache(instanceKey);
  return Array.from(cache.keys());
}

/**
 * 直接从数据库读取配置值，不经过内存缓存
 */
export async function getConfigFromDb(instanceKey: string, key: string): Promise<any> {
  const instance = instanceKey || DEFAULT_INSTANCE_KEY;
  const row = getDatabase()
    .prepare('SELECT config_value FROM shield_global_kv WHERE instance_key = ? AND config_key = ? LIMIT 1')
    .get(instance, key) as { config_value: string } | undefined;
  if (!row) {
    return undefined;
  }
  return deserializeValue(row.config_value);
}

export function getDefaultInstanceKey(): string {
  return DEFAULT_INSTANCE_KEY;
}

export function getSqliteStoragePath(): string {
  return getSqlitePath();
}

function normalizeBusinessType(value: string | null): BusinessType | undefined {
  return value && SUPPORTED_BUSINESS_TYPES.has(value as BusinessType) ? (value as BusinessType) : undefined;
}

function mapUser(row: {
  id: string;
  username: string;
  password: string;
  remark: string | null;
  business_type: string | null;
  auth_cookie: string | null;
}) {
  return {
    id: row.id,
    username: row.username,
    password: row.password,
    remark: row.remark ?? '',
    businessType: normalizeBusinessType(row.business_type),
    authCookie: row.auth_cookie ?? undefined,
  };
}

export async function listUsers(): Promise<Array<{ id: string; username: string; password: string; remark: string; businessType?: BusinessType; authCookie?: string }>> {
  const rows = getDatabase()
    .prepare('SELECT id, username, password, remark, business_type, auth_cookie FROM shield_users ORDER BY created_at ASC')
    .all() as Array<{ id: string; username: string; password: string; remark: string | null; business_type: string | null; auth_cookie: string | null }>;
  return rows.map(mapUser);
}

export async function getUserByUsername(username: string): Promise<{ id: string; username: string; password: string; remark: string; businessType?: BusinessType; authCookie?: string } | null> {
  const row = getDatabase()
    .prepare('SELECT id, username, password, remark, business_type, auth_cookie FROM shield_users WHERE username = ? LIMIT 1')
    .get(username) as { id: string; username: string; password: string; remark: string | null; business_type: string | null; auth_cookie: string | null } | undefined;
  return row ? mapUser(row) : null;
}

export async function insertUser(user: { id: string; username: string; password: string; remark: string; businessType?: BusinessType; authCookie?: string }): Promise<void> {
  const now = getLocalDateTimeString();
  getDatabase()
    .prepare(`
INSERT INTO shield_users (id, username, password, remark, business_type, auth_cookie, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`)
    .run(user.id, user.username, user.password, user.remark ?? '', user.businessType ?? null, user.authCookie ?? null, now, now);
}

export async function updateUser(user: { id: string; username: string; password: string; remark: string; businessType?: BusinessType; authCookie?: string }): Promise<void> {
  const now = getLocalDateTimeString();
  getDatabase()
    .prepare(`
UPDATE shield_users
SET username = ?, password = ?, remark = ?, business_type = ?, auth_cookie = ?, updated_at = ?
WHERE id = ?
`)
    .run(user.username, user.password, user.remark ?? '', user.businessType ?? null, user.authCookie ?? null, now, user.id);
}

export async function deleteUserByUsername(username: string): Promise<void> {
  getDatabase().prepare('DELETE FROM shield_users WHERE username = ?').run(username);
}

export async function updateUserAuthCookie(username: string, authCookie: string | null): Promise<void> {
  const now = getLocalDateTimeString();
  getDatabase()
    .prepare('UPDATE shield_users SET auth_cookie = ?, updated_at = ? WHERE username = ?')
    .run(authCookie, now, username);
}
