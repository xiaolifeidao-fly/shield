import { Business } from "@model/business.entity";
import { DyUser } from "@model/dy.entity";
import { TaskResponse } from "@model/task.entity";


export enum ResourceType {
    ak = "ak",
    xm = "xm",
    syc = "syc",
    sh = "sh",
    nm = "nm"
}

export enum ResourceStatus {
  running = "running",
  stopped = "stopped",
  error = "error"
}

// 资源账号接口
export interface ResourceAccount {
  id: string;
  isActive: boolean;
  type: string;
  port: string;
  groupCode: string;
  dyUser?: DyUser | null;
  lastUsed?: number;
  isRunning?: boolean;
  status?: ResourceStatus;
  taskType?: String;
  cacheTasks: Map<string, Map<string, TaskResponse | null>>;
}

// 队列消息接口
export interface QueueMessage {
  id: string;
  data: any;
  timestamp: Date;
  priority?: number;
}

// 生产者配置接口
export interface ProducerConfig {
  id: string;
  resourceAccounts: ResourceAccount[];
  actionInterval?: number; // 执行间隔（毫秒）
}

// 消费者配置接口
export interface ConsumerConfig {
  id: string;
  batchSize?: number; // 批量处理大小
  processInterval?: number; // 处理间隔（毫秒）
}

// 任务管理器配置接口
export interface TaskManagerConfig {
  producerCount: number;
  consumerCount: number;
  queueMaxSize?: number;
  resourceDistributionStrategy?: 'round-robin' | 'random' | 'even';
}

// Worker 消息类型
export interface WorkerMessage {
  type: 'start' | 'stop' | 'pause' | 'resume' | 'update-resources' | 'action-result' | 'process-result' | 'error' | 'heartbeat' | 'process-messages' | 'request-messages';
  data?: any;
  timestamp: Date;
}

// 生产者动作结果
export interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
  resourceId?: string;
  timestamp: Date;
}

// 消费者处理结果
export interface ProcessResult {
  success: boolean;
  processedCount: number;
  error?: string;
  timestamp: Date;
}

// 资源池统计信息
export interface ResourcePoolStats {
  totalResources: number;
  activeResources: number;
  inactiveResources: number;
  distributedResources: number;
}

// 系统状态
export interface SystemStatus {
  producers: {
    id: string;
    status: 'running' | 'stopped' | 'paused' | 'error';
    resourceCount: number;
    lastAction?: Date;
  }[];
  consumers: {
    id: string;
    status: 'running' | 'stopped' | 'paused' | 'error';
    processedCount: number;
    lastProcess?: Date;
  }[];
  queue: {
    size: number;
    maxSize: number;
  };
  resourcePool: ResourcePoolStats;
} 