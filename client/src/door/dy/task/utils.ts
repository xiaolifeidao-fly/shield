import { ResourceAccount, ResourceType } from './interfaces';

/**
 * 工具函数集合
 */
export class TaskUtils {
  /**
   * 生成唯一ID
   */
  static generateId(prefix: string = 'id'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}_${timestamp}_${random}`;
  }


  /**
   * 延迟执行
   */
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 重试执行函数
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxRetries) {
          throw lastError;
        }

        console.warn(`Attempt ${attempt} failed, retrying in ${delayMs}ms...`, lastError.message);
        await TaskUtils.delay(delayMs);
      }
    }

    throw lastError!;
  }

  /**
   * 安全的 JSON 解析
   */
  static safeJsonParse<T>(jsonString: string, defaultValue: T): T {
    try {
      return JSON.parse(jsonString);
    } catch {
      return defaultValue;
    }
  }

  /**
   * 安全的 JSON 字符串化
   */
  static safeJsonStringify(obj: any, defaultValue: string = '{}'): string {
    try {
      return JSON.stringify(obj);
    } catch {
      return defaultValue;
    }
  }

  /**
   * 格式化时间戳
   */
  static formatTimestamp(date: Date = new Date()): string {
    return date.toISOString().replace('T', ' ').replace(/\..+/, '');
  }

  /**
   * 计算两个时间之间的差值（毫秒）
   */
  static timeDiff(start: Date, end: Date = new Date()): number {
    return end.getTime() - start.getTime();
  }

  /**
   * 格式化持续时间
   */
  static formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * 限制数值在指定范围内
   */
  static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * 计算平均值
   */
  static average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  /**
   * 获取数组中的随机元素
   */
  static randomChoice<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * 打乱数组
   */
  static shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * 节流函数
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return function(this: any, ...args: Parameters<T>) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * 防抖函数
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    return function(this: any, ...args: Parameters<T>) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  /**
   * 创建性能监控器
   */
  static createPerformanceMonitor(name: string) {
    const startTime = process.hrtime.bigint();
    
    return {
      end: () => {
        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1000000;
        console.log(`[Performance] ${name}: ${durationMs.toFixed(2)}ms`);
        return durationMs;
      }
    };
  }

  /**
   * 创建内存使用监控器
   */
  static getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      rss: `${Math.round(usage.rss / 1024 / 1024 * 100) / 100} MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100} MB`,
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100} MB`,
      external: `${Math.round(usage.external / 1024 / 1024 * 100) / 100} MB`
    };
  }

  /**
   * 创建简单的事件总线
   */
  static createEventBus() {
    const events: { [key: string]: Function[] } = {};

    return {
      on: (event: string, callback: Function) => {
        if (!events[event]) events[event] = [];
        events[event].push(callback);
      },
      off: (event: string, callback: Function) => {
        if (!events[event]) return;
        events[event] = events[event].filter(cb => cb !== callback);
      },
      emit: (event: string, ...args: any[]) => {
        if (!events[event]) return;
        events[event].forEach(callback => callback(...args));
      }
    };
  }

  /**
   * 验证资源账号格式
   */
  static validateResourceAccount(resource: any): resource is ResourceAccount {
    return (
      typeof resource === 'object' &&
      resource !== null &&
      typeof resource.id === 'string' &&
      typeof resource.name === 'string' &&
      typeof resource.isActive === 'boolean' &&
      resource.credentials !== undefined
    );
  }

} 