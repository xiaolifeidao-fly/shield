import { QueueMessage } from './interfaces';
import { EventEmitter } from 'events';

/**
 * 线程安全的消息队列
 * 支持优先级、批量操作和统计信息
 */
export class MessageQueue extends EventEmitter {
  private queue: QueueMessage[] = [];
  private maxSize: number;
  private processing: boolean = false;

  constructor(maxSize: number = 10000) {
    super();
    this.maxSize = maxSize;
  }

  /**
   * 添加消息到队列
   */
  enqueue(message: Omit<QueueMessage, 'id' | 'timestamp'>): boolean {
    if (this.queue.length >= this.maxSize) {
      this.emit('queue-full', this.queue.length);
      return false;
    }

    const queueMessage: QueueMessage = {
      id: this.generateMessageId(),
      timestamp: new Date(),
      priority: 0,
      ...message
    };

    // 根据优先级插入
    this.insertByPriority(queueMessage);
    
    this.emit('message-enqueued', queueMessage);
    this.emit('queue-size-changed', this.queue.length);
    
    return true;
  }

  /**
   * 批量添加消息
   */
  enqueueBatch(messages: Omit<QueueMessage, 'id' | 'timestamp'>[]): number {
    let enqueuedCount = 0;
    
    for (const message of messages) {
      if (this.enqueue(message)) {
        enqueuedCount++;
      } else {
        break; // 队列已满，停止添加
      }
    }

    if (enqueuedCount > 0) {
      this.emit('batch-enqueued', enqueuedCount);
    }

    return enqueuedCount;
  }

  /**
   * 从队列中取出一个消息
   */
  dequeue(): QueueMessage | null {
    if (this.queue.length === 0) {
      return null;
    }

    const message = this.queue.shift() || null;
    
    if (message) {
      this.emit('message-dequeued', message);
      this.emit('queue-size-changed', this.queue.length);
    }

    return message;
  }

  /**
   * 批量从队列中取出消息
   */
  dequeueBatch(count: number): QueueMessage[] {
    const messages: QueueMessage[] = [];
    const actualCount = Math.min(count, this.queue.length);

    for (let i = 0; i < actualCount; i++) {
      const message = this.queue.shift();
      if (message) {
        messages.push(message);
      }
    }

    if (messages.length > 0) {
      this.emit('batch-dequeued', messages);
      this.emit('queue-size-changed', this.queue.length);
    }

    return messages;
  }

  /**
   * 查看队列头部的消息但不移除
   */
  peek(): QueueMessage | null {
    return this.queue.length > 0 ? this.queue[0] : null;
  }

  /**
   * 查看队列中的多个消息但不移除
   */
  peekBatch(count: number): QueueMessage[] {
    return this.queue.slice(0, count);
  }

  /**
   * 获取队列大小
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * 检查队列是否为空
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * 检查队列是否已满
   */
  isFull(): boolean {
    return this.queue.length >= this.maxSize;
  }

  /**
   * 清空队列
   */
  clear(): void {
    const clearedCount = this.queue.length;
    this.queue = [];
    this.emit('queue-cleared', clearedCount);
    this.emit('queue-size-changed', 0);
  }

  /**
   * 获取队列统计信息
   */
  getStats() {
    return {
      size: this.queue.length,
      maxSize: this.maxSize,
      isEmpty: this.isEmpty(),
      isFull: this.isFull(),
      utilizationRate: (this.queue.length / this.maxSize) * 100,
      oldestMessage: this.queue.length > 0 ? this.queue[0] : null,
      newestMessage: this.queue.length > 0 ? this.queue[this.queue.length - 1] : null
    };
  }

  /**
   * 设置最大队列大小
   */
  setMaxSize(maxSize: number): void {
    this.maxSize = maxSize;
    
    // 如果当前队列大小超过新的最大值，移除多余的消息
    if (this.queue.length > maxSize) {
      const removedMessages = this.queue.splice(maxSize);
      this.emit('messages-dropped', removedMessages);
      this.emit('queue-size-changed', this.queue.length);
    }
  }

  /**
   * 根据优先级插入消息
   */
  private insertByPriority(message: QueueMessage): void {
    if (this.queue.length === 0 || !message.priority) {
      this.queue.push(message);
      return;
    }

    // 找到合适的插入位置（优先级高的在前面）
    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      const currentPriority = this.queue[i].priority || 0;
      if ((message.priority || 0) > currentPriority) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, message);
  }

  /**
   * 生成唯一的消息ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 等待队列有消息可用
   */
  async waitForMessage(timeout?: number): Promise<QueueMessage | null> {
    if (!this.isEmpty()) {
      return this.dequeue();
    }

    return new Promise((resolve) => {
      const timeoutId = timeout ? setTimeout(() => {
        this.removeListener('message-enqueued', onMessage);
        resolve(null);
      }, timeout) : null;

      const onMessage = () => {
        if (timeoutId) clearTimeout(timeoutId);
        this.removeListener('message-enqueued', onMessage);
        resolve(this.dequeue());
      };

      this.once('message-enqueued', onMessage);
    });
  }

  /**
   * 获取队列中特定条件的消息数量
   */
  countMessages(predicate?: (message: QueueMessage) => boolean): number {
    if (!predicate) {
      return this.queue.length;
    }
    return this.queue.filter(predicate).length;
  }

  /**
   * 移除满足条件的消息
   */
  removeMessages(predicate: (message: QueueMessage) => boolean): QueueMessage[] {
    const removedMessages: QueueMessage[] = [];
    this.queue = this.queue.filter(message => {
      if (predicate(message)) {
        removedMessages.push(message);
        return false;
      }
      return true;
    });

    if (removedMessages.length > 0) {
      this.emit('messages-removed', removedMessages);
      this.emit('queue-size-changed', this.queue.length);
    }

    return removedMessages;
  }
}
