// express-server.ts
import express from 'express';
import cors from 'cors';
import { callbackDigg } from '../door/dy/task/run';
import log from 'electron-log';
import { secureMiddleware } from '@utils/secure-middleware';

// 统一响应格式
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  code?: number;
}

export class ExpressServer {
  private app = express();
  private server: any;
  private port = 33334; // 使用不同的端口避免冲突
  
  private useSecureMode = true; // 默认启用安全模式
  
  constructor(useSecureMode = true) {
    this.useSecureMode = useSecureMode;
    this.setupMiddleware();
    this.setupRoutes();
    log.info(`ExpressServer 已创建，安全模式: ${this.useSecureMode ? '启用' : '禁用'}`);
  }
  
  
  private setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());

     // 如果启用安全模式，应用安全中间件
     if (this.useSecureMode) {
      log.info('应用安全中间件，启用加密通信');
      this.app.use(secureMiddleware);
    }
    this.app.use(express.static('public')); // 静态文件服务
  }
  
  private setupRoutes() {
      // 任务相关接口
      this.setupTaskRoutes();
      
      // 健康检查
      this.app.get('/health', (req, res) => {
        res.json(this.createSuccessResponse({ status: 'ok' }));
      });
        

      // 统一错误处理中间件（必须放在最后）
      this.app.use(this.errorHandler);
  }
  
  private setupTaskRoutes() {
    const taskRouter = express.Router();
    
    // callbackDigg接口
    taskRouter.post('/callback-digg', async (req, res, next) => {
      try {
        const { taskResponse, data } = req.body;
        if (!taskResponse) {
          return res.status(400).json(this.createErrorResponse('taskResponse是必需的', 400));
        }
        
        if (!data) {
          return res.status(400).json(this.createErrorResponse('data是必需的', 400));
        }
        
        await callbackDigg(taskResponse, data);
        res.json(this.createSuccessResponse(null, 'callbackDigg执行成功'));
      } catch (error) {
        next(error);
      }
    });
    
    // 挂载任务路由
    try{
      this.app.use('/api/task', taskRouter);
    }catch(error){
      log.error("setupTaskRoutes error:", error);
    }
  }
  
  // 创建成功响应
  private createSuccessResponse<T>(data: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      message: message || 'Success'
    };
  }
  
  // 创建错误响应
  private createErrorResponse(message: string, code: number = 500): ApiResponse {
    return {
      success: false,
      message,
      code
    };
  }
  
  // 错误处理中间件
  private errorHandler = (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Server error:', err);
    
    if (res.headersSent) {
      return next(err);
    }
    
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    
    res.status(statusCode).json(this.createErrorResponse(message, statusCode));
  };
  
  // 获取应用实例，用于扩展
  public getApp(): express.Application {
    return this.app;
  }
  
  // 添加路由的方法，用于扩展
  public addRoutes(path: string, router: express.Router): void {
    this.app.use(path, router);
  }

  // 设置是否使用安全模式
  public setSecureMode(enable: boolean): void {
    this.useSecureMode = enable;
    log.info(`服务器安全模式已${enable ? '启用' : '禁用'}`);
    
    // 重新设置中间件
    if (enable) {
      this.app.use(secureMiddleware);
    }
  }
  
  // 获取安全模式状态
  public isSecureModeEnabled(): boolean {
    return this.useSecureMode;
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`Client Server running on port ${this.port}`);
        log.info(`Client Server running on port ${this.port}`);
        resolve();
      });
      
      this.server.on('error', (error: any) => {
        log.error('Server error:', error);
        // reject(error);
      });
    });
  }
  
  stop() {
    if (this.server) {
      this.server.close();
      log.info('Client Server stopped');
    }
  }
}
