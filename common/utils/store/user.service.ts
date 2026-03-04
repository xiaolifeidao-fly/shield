import { createPool, Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import log from 'electron-log';

/**
 * 用户信息接口
 */
export interface DBUser {
  id: string;
  username: string;
  password: string;
  remark: string;
  auth_cookie: string | null;
  business_type: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * MySQL 用户服务
 * 操作 shield_users 表
 */
class UserService {
  private pool: Pool | null = null;

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
      });
      log.info('UserService pool created');
    }
    return this.pool;
  }

  /**
   * 获取连接
   */
  private async getConnection(): Promise<PoolConnection> {
    const pool = await this.getPool();
    return await pool.getConnection();
  }

  /**
   * 根据用户名查找用户
   */
  async findByUsername(username: string): Promise<DBUser | null> {
    const conn = await this.getConnection();
    try {
      const [rows] = await conn.execute<RowDataPacket[]>(
        'SELECT * FROM shield_users WHERE username = ?',
        [username]
      );
      return rows.length > 0 ? rows[0] as DBUser : null;
    } catch (error) {
      log.error(`UserService findByUsername error for ${username}:`, error);
      return null;
    } finally {
      conn.release();
    }
  }

  /**
   * 获取所有用户
   */
  async findAll(): Promise<DBUser[]> {
    const conn = await this.getConnection();
    try {
      const [rows] = await conn.execute<RowDataPacket[]>(
        'SELECT * FROM shield_users'
      );
      return rows as DBUser[];
    } catch (error) {
      log.error('UserService findAll error:', error);
      return [];
    } finally {
      conn.release();
    }
  }

  /**
   * 根据业务类型获取用户
   */
  async findByBusinessType(businessType: string): Promise<DBUser[]> {
    const conn = await this.getConnection();
    try {
      const [rows] = await conn.execute<RowDataPacket[]>(
        'SELECT * FROM shield_users WHERE business_type = ?',
        [businessType]
      );
      return rows as DBUser[];
    } catch (error) {
      log.error(`UserService findByBusinessType error for ${businessType}:`, error);
      return [];
    } finally {
      conn.release();
    }
  }

  /**
   * 创建用户
   */
  async create(user: Partial<DBUser> & Pick<DBUser, 'username' | 'password'>): Promise<string | null> {
    const conn = await this.getConnection();
    try {
      const id = user.id || require('crypto').randomUUID();
      await conn.execute(
        `INSERT INTO shield_users (id, username, password, remark, auth_cookie, business_type)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, user.username, user.password, user.remark || '', user.auth_cookie || null, user.business_type || null]
      );
      return id;
    } catch (error) {
      log.error('UserService create error:', error);
      return null;
    } finally {
      conn.release();
    }
  }

  /**
   * 更新用户
   */
  async update(username: string, updates: Partial<Pick<DBUser, 'password' | 'remark' | 'auth_cookie' | 'business_type'>>): Promise<boolean> {
    const conn = await this.getConnection();
    try {
      const fields: string[] = [];
      const values: any[] = [];

      if (updates.password !== undefined) {
        fields.push('password = ?');
        values.push(updates.password);
      }
      if (updates.remark !== undefined) {
        fields.push('remark = ?');
        values.push(updates.remark);
      }
      if (updates.auth_cookie !== undefined) {
        fields.push('auth_cookie = ?');
        values.push(updates.auth_cookie);
      }
      if (updates.business_type !== undefined) {
        fields.push('business_type = ?');
        values.push(updates.business_type);
      }

      if (fields.length === 0) {
        return false;
      }

      values.push(username);
      await conn.execute(
        `UPDATE shield_users SET ${fields.join(', ')} WHERE username = ?`,
        values
      );
      return true;
    } catch (error) {
      log.error(`UserService update error for ${username}:`, error);
      return false;
    } finally {
      conn.release();
    }
  }

  /**
   * 删除用户
   */
  async delete(username: string): Promise<boolean> {
    const conn = await this.getConnection();
    try {
      await conn.execute('DELETE FROM shield_users WHERE username = ?', [username]);
      return true;
    } catch (error) {
      log.error(`UserService delete error for ${username}:`, error);
      return false;
    } finally {
      conn.release();
    }
  }

  /**
   * 更新 auth_cookie
   */
  async updateAuthCookie(username: string, authCookie: string): Promise<boolean> {
    return this.update(username, { auth_cookie: authCookie });
  }

  /**
   * 关闭连接池
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      log.info('UserService pool closed');
    }
  }
}

// 导出单例
export const userService = new UserService();
