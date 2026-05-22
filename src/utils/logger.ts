import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * 简单的日志工具，替代 electron-log
 * 支持按天切割日志文件
 */
class Logger {
  private logDir: string;
  private currentDate: string;
  private logFile: string;
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    // 日志目录：~/.config/shield/logs
    this.logDir = path.join(os.homedir(), '.config', 'shield', 'logs');

    // 确保日志目录存在
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // 初始化当前日期和日志文件路径
    this.currentDate = this.getDateString();
    this.logFile = path.join(this.logDir, `${this.currentDate}.log`);

    // 启动定时器，每小时检查一次是否需要切换日志文件
    this.timer = setInterval(() => {
      this.checkDate();
    }, 60 * 60 * 1000); // 每小时
  }

  private getDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  private checkDate(): void {
    const today = this.getDateString();
    if (today !== this.currentDate) {
      this.currentDate = today;
      this.logFile = path.join(this.logDir, `${this.currentDate}.log`);
    }
  }

  private serializeArg(arg: any): any {
    if (arg instanceof Error) {
      return {
        name: arg.name,
        message: arg.message,
        stack: arg.stack,
        cause: (arg as any).cause ? this.serializeArg((arg as any).cause) : undefined,
      };
    }
    return arg;
  }

  private writeLog(level: string, message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const logArgs = args.length > 0 ? JSON.stringify(args.map((arg) => this.serializeArg(arg))) : '';
    const logMessage = `[${timestamp}] [${level}] ${message} ${logArgs}\n`;

    // 写入文件
    fs.appendFileSync(this.logFile, logMessage, 'utf8');

    // 同时输出到控制台
    console.log(`[${level}]`, message, ...args);
  }

  /**
   * 销毁方法，清理定时器
   */
  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  info(message: string, ...args: any[]): void {
    this.writeLog('INFO', message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.writeLog('ERROR', message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.writeLog('WARN', message, ...args);
  }

  debug(message: string, ...args: any[]): void {
    this.writeLog('DEBUG', message, ...args);
  }
}

// 创建单例
const logger = new Logger();

export default logger;
