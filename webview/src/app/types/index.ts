// 基本配置类型
export interface BasicConfig {
  slideStats: boolean;
  port: string; // 修改为string类型
  noVideo: boolean;
  autoEnd: boolean;
}

// 脚本配置类型
export interface ScriptConfig {
  likeRate: number;
  quantity: number;
  failure: number;
  taskWait: number;
  watchWait: number;
  detectWait: number;
}

// 代理配置类型
export interface ProxyConfig {
  enabled: boolean;
  server: string;
  port: number;
  username: string;
  password: string;
}

// 平台配置类型
export interface PlatformConfig {
  [key: string]: {
    enabled: boolean;
    user: string;
    pass: string;
  };
}

// 实例运行状态类型
export type InstanceRunningStatus = 'running' | 'stopped' | 'paused';

// 实例类型
export interface Instance {
  port: number;
  createdAt: string;
  lastActiveAt: string;
  isActive: boolean;
  configName: string;
  runningStatus: InstanceRunningStatus;
  likeCount: number;
  totalLikeCount: number; // 总点赞数
  uid: string;
  nickName: string;
  isLogin: boolean;
  isException: boolean;
  isLock: boolean;
  lockTime: number;
}

// 日志条目类型
export interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'warning' | 'error';
}

// 端口配置类型
export interface PortConfig {
  port: number;
  configName: string;
  hasBasicConfig: boolean;
  hasScriptConfig: boolean;
  hasPlatformConfig: boolean;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

// 标签页类型
export type TabKey = 'script' | 'proxy' | 'instance' | 'help';

// 平台名称类型
export type PlatformName = 'syc' | 'xm' | 'ak' | 'sh' | 'nm';

// 平台信息类型
export interface PlatformInfo {
  key: PlatformName;
  name: string;
  enabled: boolean;
  user: string;
  pass: string;
}

// 状态统计类型
export interface StatusStats {
  successCount: number;
  invalidCount: number;
  currentPort: number;
}

// 实例统计类型
export interface InstanceStats {
  currentPort: number;
  activeInstanceCount: number;
  availableSlots: number;
} 