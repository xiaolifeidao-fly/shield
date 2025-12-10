import { Router } from 'express';
import { registerUserRoutes } from './user.routes';
import { registerSystemRoutes } from './system.routes';

/**
 * 注册所有 API 路由
 */
export function registerApiRoutes(router: Router): void {
  // 用户相关路由
  registerUserRoutes(router);
  
  // 系统配置相关路由
  registerSystemRoutes(router);
}

