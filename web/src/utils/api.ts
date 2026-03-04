/**
 * Web Server API Service
 * 调用 web-server 的 HTTP API
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_WEB_SERVER_API_URL || 'http://localhost:3001';

interface UserInfo {
  id: string;
  username: string;
  password: string;
  remark: string;
  business_type: string;
  auth_cookie?: string;
  created_at: string;
  updated_at: string;
}

interface SyncStats {
  totalCount: number;
  successCount: number;
  skipCount: number;
  failCount: number;
  running: boolean;
  lastSyncTime?: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// User API
export const userApi = {
  async getUserInfoList(): Promise<UserInfo[]> {
    const result = await request<{ users: UserInfo[] }>('/api/users');
    return result.users || [];
  },

  async getUserInfo(username: string): Promise<UserInfo | null> {
    const result = await request<{ user: UserInfo }>(`/api/users/${username}`);
    return result.user || null;
  },

  async addUser(user: Partial<UserInfo>): Promise<void> {
    await request('/api/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  },

  async updateUser(user: Partial<UserInfo>): Promise<void> {
    await request(`/api/users/${user.username}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
  },

  async deleteUser(username: string): Promise<void> {
    await request(`/api/users/${username}`, {
      method: 'DELETE',
    });
  },

  async runUser(username: string, businessType?: string, enableDeduplication?: boolean, enableResume?: boolean): Promise<void> {
    await request('/api/sync/start', {
      method: 'POST',
      body: JSON.stringify({ username, businessType, enableDeduplication, enableResume }),
    });
  },

  async stopUser(username: string): Promise<void> {
    await request(`/api/sync/stop/${username}`, {
      method: 'POST',
    });
  },

  async getSyncStats(username: string): Promise<SyncStats> {
    const result = await request<{ username: string; stats: SyncStats }>(`/api/sync/status/${username}`);
    return result.stats;
  },
};

// Sync API
export const syncApi = {
  async startSync(username: string, businessType?: string): Promise<void> {
    await request('/api/sync/start', {
      method: 'POST',
      body: JSON.stringify({ username, businessType }),
    });
  },

  async getSyncStatus(username: string): Promise<SyncStats> {
    const result = await request<{ username: string; stats: SyncStats }>(`/api/sync/status/${username}`);
    return result.stats;
  },

  async getSyncResult(username: string): Promise<SyncStats | null> {
    const result = await request<{ username: string; result: SyncStats }>(`/api/sync/result/${username}`);
    return result.result;
  },
};

// Config API
export const configApi = {
  async getSyncTimeConfig(businessType?: string): Promise<any> {
    const query = businessType ? `?businessType=${businessType}` : '';
    const result = await request<{ config: any }>(`/api/config/sync-time${query}`);
    return result.config;
  },

  async saveSyncTimeConfig(config: any, businessType?: string): Promise<void> {
    await request('/api/config/sync-time', {
      method: 'POST',
      body: JSON.stringify({ ...config, businessType }),
    });
  },
};

// KV API
export const kvApi = {
  async get(key: string): Promise<any> {
    const result = await request<{ key: string; value: any }>(`/api/kv/${encodeURIComponent(key)}`);
    return result.value;
  },

  async set(key: string, value: any): Promise<void> {
    await request(`/api/kv/${encodeURIComponent(key)}`, {
      method: 'POST',
      body: JSON.stringify({ value }),
    });
  },
};
