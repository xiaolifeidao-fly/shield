import { Express, Router } from 'express';
import { registerApiRoutes } from './api';
import log from '../utils/logger';

/**
 * 注册所有路由
 */
export function registerRoutes(app: Express): void {
  // API 路由
  const apiRouter = Router();
  registerApiRoutes(apiRouter);
  
  // 添加 API 前缀
  const apiPrefix = process.env.APP_URL_PREFIX || '/api';
  app.use(apiPrefix, apiRouter);
  
  log.info(`API routes registered with prefix: ${apiPrefix}`);
}

