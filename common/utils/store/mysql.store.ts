import { createPool, Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import log from 'electron-log';

/**
 * MySQL 键值存储服务
 * 替代 electron-store 的数据持久化
 * 表结构：shield_global_kv (instance_key, config_key, config_value)
 */
class MySQLStore {
  private pool: Pool | null = null;
  private instanceKey: string = 'default';

  /**
   * 获取或创建连接池
   */
  private async getPool(): Promise<Pool> {
    if (!this.pool) {
      this.pool = createPool({
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT || '3306'),
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'shield',
        waitForConnections: true,
        connectionLimit: parseInt(process.env.MYSQL_CONNECTION_LIMIT || '10'),
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
      });
      log.info('MySQL store pool created');
    }
    return this.pool;
  }

  /**
   * 确保连接可用
   */
  private async ensureConnection(): Promise<PoolConnection> {
    const pool = await this.getPool();
    return await pool.getConnection();
  }

  /**
   * 获取值 - 忽略 instance_key，查询所有匹配的行
   */
  async get(key: string): Promise<any> {
    const conn = await this.ensureConnection();
    try {
      // 先查询带 instance_key 的，如果没有结果则查询所有
      let [rows] = await conn.execute<RowDataPacket[]>(
        'SELECT config_value FROM shield_global_kv WHERE instance_key = ? AND config_key = ?',
        [this.instanceKey, key]
      );

      // 如果没有结果，尝试查询所有 instance_key
      if (rows.length === 0) {
        [rows] = await conn.execute<RowDataPacket[]>(
          'SELECT config_value FROM shield_global_kv WHERE config_key = ?',
          [key]
        );
      }

      if (rows.length === 0) {
        return undefined;
      }

      const { config_value } = rows[0];
      return this.deserializeValue(config_value);
    } catch (error) {
      log.error(`MySQL store get error for key ${key}:`, error);
      return undefined;
    } finally {
      conn.release();
    }
  }

  /**
   * 设置值
   */
  async set(key: string, value: any): Promise<void> {
    const serialized = this.serializeValue(value);

    const conn = await this.ensureConnection();
    try {
      // 使用默认 instance_key
      await conn.execute(
        `INSERT INTO shield_global_kv (instance_key, config_key, config_value)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
        [this.instanceKey || 'default', key, serialized]
      );
    } catch (error) {
      log.error(`MySQL store set error for key ${key}:`, error);
      throw error;
    } finally {
      conn.release();
    }
  }

  /**
   * 删除值
   */
  async delete(key: string): Promise<void> {
    const conn = await this.ensureConnection();
    try {
      // 删除所有 instance_key 匹配的记录
      await conn.execute(
        'DELETE FROM shield_global_kv WHERE config_key = ?',
        [key]
      );
    } catch (error) {
      log.error(`MySQL store delete error for key ${key}:`, error);
      throw error;
    } finally {
      conn.release();
    }
  }

  /**
   * 清空当前实例的所有数据
   */
  async clear(): Promise<void> {
    const conn = await this.ensureConnection();
    try {
      await conn.execute(
        'DELETE FROM shield_global_kv WHERE instance_key = ?',
        [this.instanceKey]
      );
    } catch (error) {
      log.error('MySQL store clear error:', error);
      throw error;
    } finally {
      conn.release();
    }
  }

  /**
   * 获取所有键
   */
  async getAllKeys(): Promise<string[]> {
    const conn = await this.ensureConnection();
    try {
      // 获取所有不同的 config_key
      const [rows] = await conn.execute<RowDataPacket[]>(
        'SELECT DISTINCT config_key FROM shield_global_kv'
      );
      return rows.map(row => row.config_key);
    } catch (error) {
      log.error('MySQL store getAllKeys error:', error);
      return [];
    } finally {
      conn.release();
    }
  }

  /**
   * 获取整个存储对象
   */
  async getStore(): Promise<{ [key: string]: any }> {
    const conn = await this.ensureConnection();
    try {
      // 获取所有数据
      const [rows] = await conn.execute<RowDataPacket[]>(
        'SELECT config_key, config_value FROM shield_global_kv'
      );

      const store: { [key: string]: any } = {};
      for (const row of rows) {
        store[row.config_key] = this.deserializeValue(row.config_value);
      }
      return store;
    } catch (error) {
      log.error('MySQL store getStore error:', error);
      return {};
    } finally {
      conn.release();
    }
  }

  /**
   * 序列化值
   */
  private serializeValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    // 对象/数组序列化为 JSON
    return JSON.stringify(value);
  }

  /**
   * 反序列化值
   */
  private deserializeValue(value: string): any {
    if (!value) {
      return undefined;
    }

    // 尝试解析 JSON
    try {
      return JSON.parse(value);
    } catch {
      // 如果不是 JSON，返回原始字符串
      return value;
    }
  }

  /**
   * 关闭连接池
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      log.info('MySQL store pool closed');
    }
  }
}

// 导出单例
export const mysqlStore = new MySQLStore();
