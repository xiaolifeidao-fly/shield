import { Router, Request, Response } from 'express';
import { SystemImpl } from '@src/impl/config/system.impl';
import { SyncTimeConfig } from '@model/system.types';
import { BusinessType } from '@model/user.types';
import log from '../../utils/logger';

/**
 * 注册系统配置相关路由
 */
export function registerSystemRoutes(router: Router): void {
  const systemImpl = new SystemImpl();

  // GET /system/getSyncTimeConfig - 获取同步时间配置
  router.get('/system/getSyncTimeConfig', async (req: Request, res: Response) => {
    try {
      const result = await systemImpl.getSyncTimeConfig();
      res.json({ success: true, data: result });
    } catch (error: any) {
      log.error('getSyncTimeConfig error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /system/saveSyncTimeConfig - 保存同步时间配置
  router.post('/system/saveSyncTimeConfig', async (req: Request, res: Response) => {
    try {
      const config: SyncTimeConfig = req.body;
      await systemImpl.saveSyncTimeConfig(config);
      res.json({ success: true, data: null });
    } catch (error: any) {
      log.error('saveSyncTimeConfig error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /system/getSyncTimeConfigByBusiness - 根据业务类型获取配置
  router.get('/system/getSyncTimeConfigByBusiness', async (req: Request, res: Response) => {
    try {
      const { businessType } = req.query;
      if (!businessType) {
        return res.status(400).json({ success: false, error: 'businessType is required' });
      }
      const result = await systemImpl.getSyncTimeConfigByBusiness(businessType as BusinessType);
      res.json({ success: true, data: result });
    } catch (error: any) {
      log.error('getSyncTimeConfigByBusiness error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /system/saveSyncTimeConfigByBusiness - 根据业务类型保存配置
  router.post('/system/saveSyncTimeConfigByBusiness', async (req: Request, res: Response) => {
    try {
      const { businessType, config } = req.body;
      if (!businessType) {
        return res.status(400).json({ success: false, error: 'businessType is required' });
      }
      if (!config) {
        return res.status(400).json({ success: false, error: 'config is required' });
      }
      await systemImpl.saveSyncTimeConfigByBusiness(businessType, config);
      res.json({ success: true, data: null });
    } catch (error: any) {
      log.error('saveSyncTimeConfigByBusiness error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
}

