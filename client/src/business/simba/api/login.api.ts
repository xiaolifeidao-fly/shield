import { UserInfo } from '@eleapi/user/user.api';
import { getPage } from '../../common/engine.manager';
import { Page } from 'playwright-core';
import log from 'electron-log';

/**
 * 登录响应接口
 */
export interface LoginResponse {
  success: boolean;
  message?: string;
}

/**
 * Simba 用户登录接口
 * 使用半自动登录模式：打开浏览器窗口让用户手动输入凭据
 * 等待用户登录成功后自动继续执行
 * @param userInfo 用户信息
 * @param oriUrl 原始目标 URL（登录成功后跳转）
 * @returns 登录响应（包含是否成功）
 */
export async function login(userInfo: UserInfo, oriUrl: string): Promise<LoginResponse> {
  const { username } = userInfo;

  if (!username) {
    return {
      success: false,
      message: '用户名不能为空'
    };
  }

  // resourceId = username + businessType
  const resourceId = `${username}_simba`;
  const loginUrl = 'https://collection.cairin.id/#/login';

  let page: Page | undefined;
  try {
    // 1. 获取登录页面
    page = await getPage(resourceId, loginUrl) as unknown as Page;
    if (!page) {
      throw new Error('无法初始化登录页面');
    }
    log.info(`Simba 登录页面: ${page.url()}`);

    // 等待页面加载完成
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {
      log.warn('页面网络加载超时，继续执行');
    });
    log.info(`Simba 登录页面加载完成: ${page.url()}`);

    // 2. 等待用户手动登录
    // 等待 URL 从 #/login 变化，最多等待 5 分钟
    log.info('等待用户手动登录 Simba...');

    await page.waitForURL(
      (url) => !url.href.includes('#/login') && !url.href.endsWith('/login'),
      { timeout: 300000 } // 5 分钟超时
    );

    // 3. 等待一段时间确保页面完全加载
    await page.waitForTimeout(2000);

    // 4. 检查当前 URL
    const currentUrl = page.url();
    log.info(`Simba 登录后当前URL: ${currentUrl}`);

    if (!currentUrl.includes('#/login') && !currentUrl.endsWith('/login')) {
      log.info(`Simba 登录成功: ${username}`);
      return {
        success: true,
        message: '登录成功'
      };
    } else {
      log.warn(`Simba 登录失败: 未知错误，当前URL: ${currentUrl}`);
      return {
        success: false,
        message: `登录失败: 未跳转到预期页面，当前URL: ${currentUrl}`
      };
    }
  } catch (error) {
    log.error('Simba 登录过程出错:', error);
    return {
      success: false,
      message: `登录失败: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
