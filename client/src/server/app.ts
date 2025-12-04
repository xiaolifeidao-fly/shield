import express, { Express, Request, Response, NextFunction, Router } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { registerApiRoutes } from './api';
import { initializeBusinesses } from '@src/business';
import { initializeScheduledTasks } from '@src/task/task';
import { initPlatform } from '@src/engine/engine';
import log from '../utils/logger';

dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * 创建 Express 应用
 */
export function createApp(): Express {
  const app = express();

  // 中间件
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 请求日志中间件
  app.use((req: Request, res: Response, next: NextFunction) => {
    log.info(`${req.method} ${req.path}`);
    next();
  });

  // 健康检查
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 注册 API 路由
  const apiRouter = Router();
  registerApiRoutes(apiRouter);
  const apiPrefix = process.env.APP_URL_PREFIX || '/api';
  app.use(apiPrefix, apiRouter);
  log.info(`API routes registered with prefix: ${apiPrefix}`);

  // 错误处理中间件
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    log.error('Error:', err.message, err.stack);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal Server Error',
    });
  });

  return app;
}

/**
 * 启动服务器
 */
export async function startServer(): Promise<void> {
  try {
    // 初始化业务注册
    log.info('Initializing businesses...');
    initializeBusinesses();

    // 初始化平台
    log.info('Initializing platform...');
    await initPlatform();

    // 创建 Express 应用
    const app = createApp();

    // 获取端口
    const port = process.env.PORT || process.env.SERVER_PORT || 3000;
    const host = process.env.HOST || '0.0.0.0';

    // 启动服务器
    app.listen(Number(port), host, () => {
      log.info(`Server started on http://${host}:${port}`);
      
      // 初始化定时任务（延迟2秒，确保服务已启动）
      setTimeout(async () => {
        try {
          await initializeScheduledTasks();
          log.info('Scheduled tasks initialized successfully');
        } catch (e) {
          log.error('Failed to initialize scheduled tasks:', e);
        }
      }, 2000);
    });
    
  } catch (error) {
    log.error('Failed to start server:', error);
    process.exit(1);
  }
}

