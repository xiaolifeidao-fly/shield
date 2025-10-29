// secure-server.ts
import { ExpressServer } from './server';
import log from 'electron-log';
import express from 'express';
import { secureMiddleware } from '@utils/secure-middleware';


/**
 * 安全的Express服务器
 * 继承自基本ExpressServer，添加了请求/响应加解密功能
 */
export class SecureExpressServer extends ExpressServer {
  constructor() {
    super();
    this.applySecureMiddleware();
    log.info('[SecureServer] 已创建安全服务器实例');
  }
  
  /**
   * 应用安全中间件
   */
  private applySecureMiddleware(): void {
    // 获取Express应用实例
    const app = this.getApp();
    
    // 在JSON解析之后、路由处理之前应用安全中间件
    app.use(secureMiddleware);
    
    log.info('[SecureServer] 已应用安全中间件');
  }
  
  /**
   * 创建一个安全的路由
   * @param path 路由路径
   * @returns Express路由实例
   */
  public createSecureRouter(path: string): express.Router {
    const router = express.Router();
    this.addRoutes(path, router);
    log.info(`[SecureServer] 已创建安全路由: ${path}`);
    return router;
  }
  
  /**
   * 启动服务器
   */
  async start(): Promise<void> {
    log.info('[SecureServer] 启动安全服务器...');
    return super.start();
  }
  
  /**
   * 停止服务器
   */
  stop(): void {
    log.info('[SecureServer] 停止安全服务器...');
    super.stop();
  }
}

// 导出一个默认实例
let secureServerInstance: SecureExpressServer | null = null;

/**
 * 获取安全服务器实例
 */
export function getSecureServerInstance(): SecureExpressServer {
  if (!secureServerInstance) {
    secureServerInstance = new SecureExpressServer();
  }
  return secureServerInstance;
}

/**
 * 启动默认安全服务器
 */
export async function startSecureServer(): Promise<SecureExpressServer> {
  const server = getSecureServerInstance();
  await server.start();
  return server;
}

/**
 * 停止默认安全服务器
 */
export function stopSecureServer(): void {
  if (secureServerInstance) {
    secureServerInstance.stop();
    secureServerInstance = null;
  }
} 