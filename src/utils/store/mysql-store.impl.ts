import mysql from 'mysql2/promise';
import log from '@src/utils/logger';
import { BusinessType } from '@model/user.types';

const DEFAULT_INSTANCE_KEY = 'default';

let pool: mysql.Pool | null = null;
let initialized = false;

const instanceCache = new Map<string, Map<string, any>>();

function getEnv(name: string, fallback?: string): string | undefined {
  return process.env[name] ?? fallback;
}

function getPool(): mysql.Pool {
  if (!pool) {
    throw new Error('MySQL pool not initialized. Call ensureMysqlInitialized() first.');
  }
  return pool;
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

async function ensureTables(): Promise<void> {
  const ddlGlobalKv = `
CREATE TABLE IF NOT EXISTS shield_global_kv (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  instance_key VARCHAR(64) NOT NULL DEFAULT 'default',
  config_key VARCHAR(191) NOT NULL,
  config_value LONGTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_instance_key (instance_key, config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

  const ddlUsers = `
CREATE TABLE IF NOT EXISTS shield_users (
  id VARCHAR(64) NOT NULL,
  username VARCHAR(191) NOT NULL,
  password VARCHAR(191) NOT NULL,
  remark VARCHAR(255) NOT NULL DEFAULT '',
  auth_cookie TEXT DEFAULT NULL,
  business_type VARCHAR(64) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

  const conn = await getPool().getConnection();
  try {
    await conn.query(ddlGlobalKv);
    await conn.query(ddlUsers);
  } finally {
    conn.release();
  }
}

async function loadAllConfigs(): Promise<void> {
  const conn = await getPool().getConnection();
  try {
    const [rows] = await conn.query(
      'SELECT instance_key, config_key, config_value FROM shield_global_kv'
    );
    const list = rows as Array<{ instance_key: string; config_key: string; config_value: string }>;
    for (const row of list) {
      const cache = getInstanceCache(row.instance_key);
      cache.set(row.config_key, deserializeValue(row.config_value));
    }
  } finally {
    conn.release();
  }
}

export async function ensureMysqlInitialized(): Promise<void> {
  if (initialized) {
    return;
  }
  const host = getEnv('MYSQL_HOST');
  const user = getEnv('MYSQL_USER');
  const database = getEnv('MYSQL_DATABASE');

  if (!host || !user || !database) {
    throw new Error('MySQL config missing. Please set MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE, MYSQL_PASSWORD.');
  }

  pool = mysql.createPool({
    host,
    port: Number(getEnv('MYSQL_PORT', '3306')),
    user,
    password: getEnv('MYSQL_PASSWORD', ''),
    database,
    connectionLimit: Number(getEnv('MYSQL_CONNECTION_LIMIT', '10')),
    waitForConnections: true,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });

  try {
    await ensureTables();
    await loadAllConfigs();
  } catch (err: any) {
    const message = err?.message ? `MySQL 初始化失败: ${err.message}` : 'MySQL 初始化失败';
    throw new Error(message);
  }
  initialized = true;
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
  return getPool()
    .query(
      'INSERT INTO shield_global_kv (instance_key, config_key, config_value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)',
      [instance, key, serialized]
    )
    .then(() => {
      // 写入成功，返回 undefined
    })
    .catch((err) => {
      log.error('Failed to persist config value to MySQL', err);
      throw err;
    });
}

export function removeConfig(instanceKey: string, key: string): void {
  const cache = getInstanceCache(instanceKey);
  cache.delete(key);

  const instance = instanceKey || DEFAULT_INSTANCE_KEY;
  void getPool()
    .query('DELETE FROM shield_global_kv WHERE instance_key = ? AND config_key = ?', [instance, key])
    .catch((err) => {
      log.error('Failed to delete config value from MySQL', err);
    });
}

export function clearConfig(instanceKey: string): void {
  const cache = getInstanceCache(instanceKey);
  cache.clear();

  const instance = instanceKey || DEFAULT_INSTANCE_KEY;
  void getPool()
    .query('DELETE FROM shield_global_kv WHERE instance_key = ?', [instance])
    .catch((err) => {
      log.error('Failed to clear config values from MySQL', err);
    });
}

export function getAllConfigKeys(instanceKey: string): string[] {
  const cache = getInstanceCache(instanceKey);
  return Array.from(cache.keys());
}

export function getDefaultInstanceKey(): string {
  return DEFAULT_INSTANCE_KEY;
}

function normalizeBusinessType(value: string | null): BusinessType | undefined {
  if (value === 'uku' || value === 'adapundi' || value === 'SINGA' || value === 'KAT' || value === 'KLIKKAMI') {
    return value;
  }
  return undefined;
}

export async function listUsers(): Promise<Array<{ id: string; username: string; password: string; remark: string; businessType?: BusinessType; authCookie?: string }>> {
  const conn = await getPool().getConnection();
  try {
    const [rows] = await conn.query(
      'SELECT id, username, password, remark, business_type, auth_cookie FROM shield_users ORDER BY created_at ASC'
    );
    return (rows as Array<{ id: string; username: string; password: string; remark: string; business_type: string | null; auth_cookie: string | null }>).map((r) => ({
      id: r.id,
      username: r.username,
      password: r.password,
      remark: r.remark ?? '',
      businessType: normalizeBusinessType(r.business_type),
      authCookie: r.auth_cookie ?? undefined,
    }));
  } finally {
    conn.release();
  }
}

export async function getUserByUsername(username: string): Promise<{ id: string; username: string; password: string; remark: string; businessType?: BusinessType; authCookie?: string } | null> {
  const conn = await getPool().getConnection();
  try {
    const [rows] = await conn.query(
      'SELECT id, username, password, remark, business_type, auth_cookie FROM shield_users WHERE username = ? LIMIT 1',
      [username]
    );
    const list = rows as Array<{ id: string; username: string; password: string; remark: string; business_type: string | null; auth_cookie: string | null }>;
    if (list.length === 0) {
      return null;
    }
    const r = list[0];
    return {
      id: r.id,
      username: r.username,
      password: r.password,
      remark: r.remark ?? '',
      businessType: normalizeBusinessType(r.business_type),
      authCookie: r.auth_cookie ?? undefined,
    };
  } finally {
    conn.release();
  }
}

export async function insertUser(user: { id: string; username: string; password: string; remark: string; businessType?: BusinessType; authCookie?: string }): Promise<void> {
  const conn = await getPool().getConnection();
  try {
    await conn.query(
      'INSERT INTO shield_users (id, username, password, remark, business_type, auth_cookie) VALUES (?, ?, ?, ?, ?, ?)',
      [user.id, user.username, user.password, user.remark ?? '', user.businessType ?? null, user.authCookie ?? null]
    );
  } finally {
    conn.release();
  }
}

export async function updateUser(user: { id: string; username: string; password: string; remark: string; businessType?: BusinessType; authCookie?: string }): Promise<void> {
  const conn = await getPool().getConnection();
  try {
    await conn.query(
      'UPDATE shield_users SET username = ?, password = ?, remark = ?, business_type = ?, auth_cookie = ? WHERE id = ?',
      [user.username, user.password, user.remark ?? '', user.businessType ?? null, user.authCookie ?? null, user.id]
    );
  } finally {
    conn.release();
  }
}

export async function deleteUserByUsername(username: string): Promise<void> {
  const conn = await getPool().getConnection();
  try {
    await conn.query('DELETE FROM shield_users WHERE username = ?', [username]);
  } finally {
    conn.release();
  }
}

export async function updateUserAuthCookie(username: string, authCookie: string | null): Promise<void> {
  const conn = await getPool().getConnection();
  try {
    await conn.query('UPDATE shield_users SET auth_cookie = ? WHERE username = ?', [authCookie, username]);
  } finally {
    conn.release();
  }
}
