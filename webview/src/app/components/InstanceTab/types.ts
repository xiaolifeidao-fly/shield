import { Business } from '@model/business.entity';

export interface InstanceStats {
  currentPort: number;
  activeInstanceCount: number;
  availableSlots: number;
}

export interface InstanceRunningStatus {
  status: 'running' | 'stopped';
}

export interface Instance {
  port: number;
  createdAt: string;
  lastActiveAt: string;
  isActive: boolean;
  configName: string;
  runningStatus: 'running' | 'stopped' | 'paused';
  likeCount: number;
  totalLikeCount: number;
  uid: string;
  nickName?: string;
  isLogin: boolean;
  isException?: boolean;
  lockTime?: number;
  lockTimes?: Map<string, number>;
  sleepFlags?: Map<string, boolean>;
  sleepTimes?: Map<string, number>;
  sleepReasons?: Map<string, string>;
  statistic?: Map<string, BusinessStatistic>;
}

export interface BusinessStatistic {
  totalCount: number;
  todayCount: number;
  totalErrorCount: number;
  todayErrorCount: number;
  chose: boolean;
}

export interface GlobalStats {
  totalLikes: number;
  todayLikes: number;
  totalFailures: number;
  todayFailures: number;
}

export interface BusinessStats {
  [businessCode: string]: {
    totalCount: number;
    todayCount: number;
    totalErrorCount: number;
    todayErrorCount: number;
  };
}

export interface ProgressInfo {
  type: 'start' | 'stop';
  total: number;
  current: number;
  currentInstance: Instance | null;
  completed: number;
  failed: number;
  logs: Array<{
    time: string;
    message: string;
    type: 'info' | 'error' | 'success';
  }>;
}

export interface QrLogItem {
  time: string;
  message: string;
  type: 'info' | 'error' | 'warning';
}

export interface InstanceBusinessConfigs {
  [port: string]: Business[];
}
