import { Router, Request, Response } from 'express';
import { UserImpl } from '@src/impl/user/user.impl';
import { UserInfo } from '@model/user.types';
import log from '../../utils/logger';

/**
 * 注册用户相关路由
 */
export function registerUserRoutes(router: Router): void {
  const userImpl = new UserImpl();

  // GET /user/getUserInfoList - 获取用户列表
  router.get('/user/getUserInfoList', async (req: Request, res: Response) => {
    try {
      const result = await userImpl.getUserInfoList();
      res.json({ success: true, data: result });
    } catch (error: any) {
      log.error('getUserInfoList error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /user/getUserInfo - 获取单个用户信息
  router.post('/user/getUserInfo', async (req: Request, res: Response) => {
    try {
      const { username } = req.body;
      if (!username) {
        return res.status(400).json({ success: false, error: 'username is required' });
      }
      const result = await userImpl.getUserInfo(username);
      res.json({ success: true, data: result });
    } catch (error: any) {
      log.error('getUserInfo error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /user/addUser - 添加用户
  router.post('/user/addUser', async (req: Request, res: Response) => {
    try {
      const userInfo: UserInfo = req.body;
      if (!userInfo.username) {
        return res.status(400).json({ success: false, error: 'username is required' });
      }
      await userImpl.addUser(userInfo);
      res.json({ success: true, data: null });
    } catch (error: any) {
      log.error('addUser error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /user/updateUser - 更新用户
  router.post('/user/updateUser', async (req: Request, res: Response) => {
    try {
      const userInfo: UserInfo = req.body;
      if (!userInfo.username && !userInfo.id) {
        return res.status(400).json({ success: false, error: 'username or id is required' });
      }
      await userImpl.updateUser(userInfo);
      res.json({ success: true, data: null });
    } catch (error: any) {
      log.error('updateUser error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /user/deleteUser - 删除用户
  router.post('/user/deleteUser', async (req: Request, res: Response) => {
    try {
      const { username } = req.body;
      if (!username) {
        return res.status(400).json({ success: false, error: 'username is required' });
      }
      await userImpl.deleteUser(username);
      res.json({ success: true, data: null });
    } catch (error: any) {
      log.error('deleteUser error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /user/runUser - 运行用户同步
  router.post('/user/runUser', async (req: Request, res: Response) => {
    try {
      const { username, enableDeduplication = true, enableResume = false } = req.body;
      if (!username) {
        return res.status(400).json({ success: false, error: 'username is required' });
      }
      await userImpl.runUser(username, enableDeduplication, enableResume);
      res.json({ success: true, data: null });
    } catch (error: any) {
      log.error('runUser error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /user/stopUser - 停止用户同步
  router.post('/user/stopUser', async (req: Request, res: Response) => {
    try {
      const { username } = req.body;
      if (!username) {
        return res.status(400).json({ success: false, error: 'username is required' });
      }
      await userImpl.stopUser(username);
      res.json({ success: true, data: null });
    } catch (error: any) {
      log.error('stopUser error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
}

