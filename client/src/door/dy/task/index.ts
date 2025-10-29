// 核心组件导出
export { ResourcePool } from './resource-pool';
export { MessageQueue } from './queue';

// 接口和类型导出
export {
  ResourceAccount,
  QueueMessage,
  ProducerConfig,
  ConsumerConfig,
  TaskManagerConfig,
  WorkerMessage,
  ActionResult,
  ProcessResult,
  ResourcePoolStats,
  SystemStatus
} from './interfaces';

import { DyUser } from '@model/dy.entity';
// 导入类型用于内部使用
import { TaskManagerConfig, ResourceAccount, ResourceType } from './interfaces';

// 工具函数导出
export { TaskUtils } from './utils';

// 快速创建配置的辅助函数
export const createTaskManagerConfig = (
  producerCount: number,
  consumerCount: number,
  options?: {
    queueMaxSize?: number;
    resourceDistributionStrategy?: 'round-robin' | 'random' | 'even';
  }
): TaskManagerConfig => ({
  producerCount,
  consumerCount,
  queueMaxSize: options?.queueMaxSize || 10000,
  resourceDistributionStrategy: options?.resourceDistributionStrategy || 'even'
});


// 版本信息
export const VERSION = '1.0.0'; 