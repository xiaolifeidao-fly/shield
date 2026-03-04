/**
 * Shield Singa Web Server
 * Express API Server with Playwright integration
 */

require('dotenv').config();
require('tsx/cjs');

// Import and initialize store with MySQL before business layer
const { initStore, preloadMySQLStore } = require('../common/utils/store/electron');
initStore(undefined, true);  // true = use MySQL mode

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3001;

// Import and initialize business layer
const { initializeBusinesses, businessFactoryRegistry } = require('./src/business/index');
initializeBusinesses();

// Preload MySQL store after businesses are initialized
preloadMySQLStore().then(() => {
  console.log('[Server] MySQL store preloaded');
}).catch(err => {
  console.error('[Server] Failed to preload MySQL store:', err);
});

// MySQL connection pool
let pool = null;

async function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || '172.16.49.45',
      port: process.env.MYSQL_PORT || 3306,
      user: process.env.MYSQL_USER || 'amc_w',
      password: process.env.MYSQL_PASSWORD || 'sdfcerts4amc',
      database: process.env.MYSQL_DATABASE || 'shield',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
  return pool;
}

// Middleware
app.use(cors());
app.use(express.json());

// KV Store functions
async function getKV(key) {
  const pool = await getPool();
  const [rows] = await pool.execute(
    'SELECT config_value FROM shield_global_kv WHERE config_key = ?',
    [key]
  );
  if (rows.length > 0) {
    try {
      return JSON.parse(rows[0].config_value);
    } catch {
      return rows[0].config_value;
    }
  }
  return null;
}

async function setKV(key, value) {
  const pool = await getPool();
  const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
  await pool.execute(
    'INSERT INTO shield_global_kv (config_key, config_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE config_value = ?',
    [key, valueStr, valueStr]
  );
  return true;
}

async function getUsers() {
  const pool = await getPool();
  const [rows] = await pool.execute('SELECT * FROM shield_users');
  // Map MySQL fields to camelCase for business layer
  return rows.map(user => ({
    ...user,
    businessType: user.business_type
  }));
}

async function getUserByUsername(username) {
  const pool = await getPool();
  const [rows] = await pool.execute('SELECT * FROM shield_users WHERE username = ?', [username]);
  if (rows.length === 0) return null;
  // Map MySQL fields to camelCase for business layer
  const user = rows[0];
  return {
    ...user,
    businessType: user.business_type
  };
}

// Health check
app.get('/health', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.execute('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// API: Start sync
app.post('/api/sync/start', async (req, res) => {
  try {
    const { username, businessType, enableDeduplication, enableResume } = req.body;
    if (!username) {
      return res.status(400).json({ error: 'username is required' });
    }

    console.log(`[Sync API] Starting sync for user: ${username}, businessType: ${businessType}`);

    // Get user from MySQL
    const user = await getUserByUsername(username);
    console.log(`[Sync API] getUserByUsername result:`, user ? `found (id=${user.id}, businessType=${user.businessType})` : 'NOT FOUND');
    if (!user) {
      return res.status(404).json({ error: `用户 ${username} 不存在` });
    }

    // Use provided businessType or get from user
    const bt = businessType || user.business_type;
    if (!bt) {
      return res.status(400).json({ error: `用户 ${username} 未设置业务类型` });
    }

    // Check if business type is registered
    if (!businessFactoryRegistry.hasBusinessType(bt)) {
      return res.status(400).json({ error: `业务类型 ${bt} 未注册` });
    }

    // Get sync service
    const syncService = businessFactoryRegistry.getSyncService(bt);

    // Build sync params
    const syncParams = {
      enableDeduplication: enableDeduplication !== false,
      enableResume: enableResume === true,
    };

    // Adapundi specific params
    if (bt === 'adapundi') {
      syncParams.product = 'AP';
    }

    // Call sync service (async, don't wait for completion)
    console.log(`[Sync API] Calling syncService.syncUserCases for ${username}, businessType=${bt}`);
    syncService.syncUserCases(user, syncParams).catch(err => {
      console.error(`[Sync API] Sync error for user ${username}:`, err);
    });

    res.json({ success: true, message: 'Sync started', username, businessType: bt });
  } catch (error) {
    console.error('[Sync API] Error starting sync:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Get sync status
app.get('/api/sync/status/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const statsKey = `sync_stats_${username}`;
    const stats = await getKV(statsKey);

    res.json({
      username,
      stats: stats || {
        totalCount: 0,
        successCount: 0,
        skipCount: 0,
        failCount: 0,
        running: false
      }
    });
  } catch (error) {
    console.error('[Sync API] Error getting status:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Get sync result
app.get('/api/sync/result/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const statsKey = `sync_stats_${username}`;
    const stats = await getKV(statsKey);

    res.json({
      username,
      result: stats || null
    });
  } catch (error) {
    console.error('[Sync API] Error getting result:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await getUsers();
    // Map business_type to businessType for frontend compatibility
    const mappedUsers = users.map(user => ({
      ...user,
      businessType: user.business_type
    }));
    res.json({ users: mappedUsers });
  } catch (error) {
    console.error('[User API] Error getting users:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Add user
app.post('/api/users', async (req, res) => {
  try {
    const { username, password, remark, businessType } = req.body;
    console.log(`[User API] Add user request: username=${username}, businessType=${businessType}, remark=${remark}`);
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    const pool = await getPool();
    const id = require('crypto').randomUUID();

    await pool.execute(
      'INSERT INTO shield_users (id, username, password, remark, auth_cookie, business_type) VALUES (?, ?, ?, ?, NULL, ?)',
      [id, username, password, remark || '', businessType || null]
    );
    console.log(`[User API] User added successfully: id=${id}, username=${username}`);

    res.json({ success: true, id, username });
  } catch (error) {
    console.error('[User API] Error adding user:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Delete user
app.delete('/api/users/:username', async (req, res) => {
  try {
    const { username } = req.params;
    console.log(`[User API] Delete user: username=${username}`);
    const pool = await getPool();
    await pool.execute('DELETE FROM shield_users WHERE username = ?', [username]);
    console.log(`[User API] User deleted: username=${username}`);
    res.json({ success: true, username });
  } catch (error) {
    console.error('[User API] Error deleting user:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Get KV value
app.get('/api/kv/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const value = await getKV(key);
    res.json({ key, value });
  } catch (error) {
    console.error('[KV API] Error getting value:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Set KV value
app.post('/api/kv/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    await setKV(key, value);
    res.json({ success: true, key, value });
  } catch (error) {
    console.error('[KV API] Error setting value:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Get sync time config
app.get('/api/config/sync-time', async (req, res) => {
  try {
    const { businessType } = req.query;
    const configKey = businessType ? `syncTimeConfig_${businessType}` : 'syncTimeConfig';
    const config = await getKV(configKey);

    res.json({
      config: config || {
        type: 'daily',
        hour: 0,
        minute: 0
      }
    });
  } catch (error) {
    console.error('[Config API] Error getting sync time config:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Save sync time config
app.post('/api/config/sync-time', async (req, res) => {
  try {
    const { businessType, ...config } = req.body;
    const configKey = businessType ? `syncTimeConfig_${businessType}` : 'syncTimeConfig';
    await setKV(configKey, { ...config, businessType });

    res.json({ success: true, config: req.body });
  } catch (error) {
    console.error('[Config API] Error saving sync time config:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
async function startServer() {
  try {
    // Test MySQL connection
    const pool = await getPool();
    await pool.execute('SELECT 1');
    console.log('[Server] MySQL connected');

    app.listen(PORT, () => {
      console.log(`[Server] Shield Singa Web Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  }
}

startServer();
