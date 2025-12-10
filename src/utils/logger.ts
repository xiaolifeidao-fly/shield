import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * 简单的日志工具，替代 electron-log
 */
class Logger {
  private logDir: string;
  private logFile: string;

  constructor() {
    // 日志目录：~/.config/shield/logs
    this.logDir = path.join(os.homedir(), '.config', 'shield', 'logs');
    
    // 确保日志目录存在
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // 日志文件：按日期命名
    const today = new Date().toISOString().split('T')[0];
    this.logFile = path.join(this.logDir, `${today}.log`);
  }

  private writeLog(level: string, message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message} ${args.length > 0 ? JSON.stringify(args) : ''}\n`;
    
    // 写入文件
    fs.appendFileSync(this.logFile, logMessage, 'utf8');
    
    // 同时输出到控制台
    console.log(`[${level}]`, message, ...args);
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

