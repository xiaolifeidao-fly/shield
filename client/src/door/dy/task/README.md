# 生产者-消费者任务系统

基于 TypeScript 和 worker_threads 的高性能生产者-消费者架构，支持动态资源分配和线程管理。

## 🏗️ 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                     TaskManager                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │   ResourcePool  │  │   MessageQueue  │  │   Workers   │  │
│  │                 │  │                 │  │             │  │
│  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │ Producers   │  │
│  │ │ Resource 1  │ │  │ │ Message 1   │ │  │ ┌─────────┐ │  │
│  │ │ Resource 2  │ │  │ │ Message 2   │ │  │ │Thread-1 │ │  │
│  │ │ Resource n  │ │  │ │ Message n   │ │  │ │Thread-2 │ │  │
│  │ └─────────────┘ │  │ └─────────────┘ │  │ └─────────┘ │  │
│  └─────────────────┘  └─────────────────┘  │             │  │
│                                            │ Consumers   │  │
│                                            │ ┌─────────┐ │  │
│                                            │ │Thread-1 │ │  │
│                                            │ │Thread-2 │ │  │
│                                            │ └─────────┘ │  │
│                                            └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## ✨ 核心特性

### 🔧 资源池管理
- **动态添加/移除**：运行时添加或移除资源账号
- **智能分配**：支持平均分配、轮询、随机三种策略
- **自动重分配**：资源变化时自动重新分配到生产者
- **状态管理**：跟踪资源使用状态和最后使用时间

### 🏭 生产者系统
- **独立线程**：每个生产者运行在独立的 worker_thread 中
- **循环执行**：不停循环执行 doAction 业务逻辑
- **资源轮询**：自动轮询使用分配的资源账号
- **可配置间隔**：支持自定义执行间隔
- **动态扩缩容**：支持运行时增加或减少生产者数量

### 🏪 消费者系统
- **批量处理**：支持批量获取和处理消息
- **独立线程**：每个消费者运行在独立的 worker_thread 中
- **智能调度**：自动请求和处理队列中的消息
- **可配置批次**：支持自定义批量处理大小
- **动态扩缩容**：支持运行时增加或减少消费者数量

### 📦 消息队列
- **优先级支持**：支持消息优先级排序
- **批量操作**：支持批量入队和出队
- **容量控制**：可配置最大队列大小
- **统计信息**：提供详细的队列统计数据
- **线程安全**：支持多线程并发操作

### 📊 监控和管理
- **实时状态**：获取系统实时运行状态
- **性能监控**：内置性能监控和内存使用统计
- **事件系统**：丰富的事件通知机制
- **优雅关闭**：支持暂停、恢复和优雅停止

## 📦 安装和使用

### 基本使用

```typescript
import { 
  TaskManager, 
  createTaskManagerConfig, 
  createResourceAccount 
} from './task/index';

// 1. 创建配置
const config = createTaskManagerConfig(
  3, // 3个生产者
  2, // 2个消费者
  {
    queueMaxSize: 1000,
    resourceDistributionStrategy: 'even'
  }
);

// 2. 创建任务管理器
const taskManager = new TaskManager(config);

// 3. 添加资源账号
const resources = [
  createResourceAccount('账号1', { username: 'user1', token: 'token1' }),
  createResourceAccount('账号2', { username: 'user2', token: 'token2' })
];
taskManager.addResources(resources);

// 4. 启动系统
await taskManager.start();

// 5. 监听事件
taskManager.on('started', () => console.log('系统已启动'));
taskManager.on('resource-added', (resource) => 
  console.log(`资源已添加: ${resource.name}`)
);

// 6. 获取状态
const status = taskManager.getSystemStatus();
console.log('系统状态:', status);

// 7. 停止系统
await taskManager.stop();
```

### 动态管理

```typescript
// 动态调整生产者数量
await taskManager.adjustProducerCount(5);

// 动态调整消费者数量  
await taskManager.adjustConsumerCount(3);

// 动态添加资源
const newResources = [
  createResourceAccount('新账号', { token: 'new-token' })
];
taskManager.addResources(newResources);

// 动态移除资源
taskManager.removeResource('resource-id');

// 暂停和恢复
taskManager.pause();
taskManager.resume();
```

## 🔧 自定义业务逻辑

### 自定义生产者动作

创建继承自 `ProducerWorkerThread` 的类来实现自定义业务逻辑：

```typescript
// 在 producer-worker.ts 中修改 doAction 方法
private async doAction(resource: ResourceAccount | null): Promise<ActionResult> {
  if (!resource) {
    return {
      success: false,
      error: 'No resource available',
      timestamp: new Date()
    };
  }

  try {
    // 这里实现您的具体业务逻辑
    // 例如：API调用、数据抓取、文件处理等
    const result = await yourBusinessLogic(resource);
    
    return {
      success: true,
      data: result,
      resourceId: resource.id,
      timestamp: new Date()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      resourceId: resource.id,
      timestamp: new Date()
    };
  }
}
```

### 自定义消费者处理

在 `consumer-worker.ts` 中修改 `processMessage` 方法：

```typescript
private async processMessage(message: QueueMessage): Promise<boolean> {
  try {
    // 这里实现您的消息处理逻辑
    // 例如：数据存储、通知发送、文件写入等
    await yourMessageProcessingLogic(message.data);
    
    return true;
  } catch (error) {
    console.error('消息处理失败:', error);
    return false;
  }
}
```

## 📊 监控和调试

### 系统状态监控

```typescript
// 获取系统状态
const status = taskManager.getSystemStatus();
console.log('生产者状态:', status.producers);
console.log('消费者状态:', status.consumers);
console.log('队列状态:', status.queue);
console.log('资源池状态:', status.resourcePool);

// 获取队列统计
const queueStats = taskManager.getQueueStats();
console.log('队列利用率:', queueStats.utilizationRate);

// 获取内存使用
const memoryUsage = TaskUtils.getMemoryUsage();
console.log('内存使用:', memoryUsage);
```

### 事件监听

```typescript
// 系统事件
taskManager.on('started', () => console.log('系统启动'));
taskManager.on('stopped', () => console.log('系统停止'));
taskManager.on('paused', () => console.log('系统暂停'));
taskManager.on('resumed', () => console.log('系统恢复'));

// 资源事件
taskManager.on('resource-added', (resource) => 
  console.log('资源添加:', resource.name)
);
taskManager.on('resource-removed', (resource) => 
  console.log('资源移除:', resource.name)
);
taskManager.on('resources-redistributed', (distribution) => 
  console.log('资源重新分配:', distribution)
);

// 工作线程事件
taskManager.on('producer-count-changed', (count) => 
  console.log('生产者数量变更:', count)
);
taskManager.on('consumer-count-changed', (count) => 
  console.log('消费者数量变更:', count)
);
```

## 🔧 配置选项

### TaskManagerConfig

```typescript
interface TaskManagerConfig {
  producerCount: number;           // 生产者数量
  consumerCount: number;           // 消费者数量
  queueMaxSize?: number;           // 队列最大大小 (默认: 10000)
  resourceDistributionStrategy?: 'round-robin' | 'random' | 'even'; // 资源分配策略 (默认: 'even')
}
```

### ProducerConfig

```typescript
interface ProducerConfig {
  id: string;                      // 生产者ID
  resourceAccounts: ResourceAccount[]; // 资源账号列表
  actionInterval?: number;         // 执行间隔毫秒数 (默认: 1000)
}
```

### ConsumerConfig

```typescript
interface ConsumerConfig {
  id: string;                      // 消费者ID
  batchSize?: number;              // 批量处理大小 (默认: 10)
  processInterval?: number;        // 处理间隔毫秒数 (默认: 1000)
}
```

## 🎯 最佳实践

### 1. 资源配置
- 资源数量建议是生产者数量的 1.5-2 倍
- 定期清理过期的资源账号
- 使用有意义的资源名称便于调试

### 2. 性能优化
- 根据 CPU 核心数调整生产者和消费者数量
- 监控队列大小，避免内存溢出
- 合理设置批量处理大小

### 3. 错误处理
- 实现重试机制处理临时失败
- 记录详细的错误日志
- 设置合理的超时时间

### 4. 监控运维
- 定期检查系统状态
- 监控内存使用情况
- 设置告警机制

## 🚀 运行示例

运行完整的示例程序：

```bash
# 编译 TypeScript (如果需要)
npx tsc

# 运行示例
node example.js
```

示例程序将演示：
- 系统启动和配置
- 动态资源管理
- 工作线程扩缩容
- 系统监控
- 优雅停止

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来完善这个系统！

## �� 许可证

MIT License 