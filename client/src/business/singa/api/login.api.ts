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
 * Singa 用户登录接口
 * 使用 Playwright 自动填写表单并提交登录
 * @param userInfo 用户信息
 * @returns 登录响应（包含是否成功）
 */
export async function login(userInfo: UserInfo, oriUrl : string): Promise<LoginResponse> {
  const { username, password } = userInfo;
  
  if (!username || !password) {
    return {
      success: false,
      message: '用户名或密码不能为空'
    };
  }

  // resourceId = username + businessType
  const resourceId = `${username}_${userInfo.businessType || 'singa'}`;
  const loginUrl = 'https://col.singa.id/login';

  let page: Page | undefined;
  try {
    // 1. 获取登录页面
    page = await getPage(resourceId, loginUrl) as unknown as Page;
    if (!page) {
      throw new Error('无法初始化登录页面');
    }
    log.info(`Singa 登录页面: ${page.url()}`);
    // 等待页面加载完成
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {
      log.warn('页面网络加载超时，继续执行');
    });
    log.info(`Singa 登录页面加载完成: ${page.url()}`);
    // 等待登录表单加载
    await page.waitForSelector('#formLogin', { timeout: 10000 });
    log.info(`Singa 登录表单加载完成: ${page.url()}`);
    // 2. 填写用户名和密码
    await page.fill('#email', username);
    await page.fill('#password', password);
    log.info(`Singa 填写用户名和密码: ${page.url()}`);
    // 3. 提交表单并等待导航
    // 先点击提交按钮，然后等待 URL 变化
    await Promise.all([
      page.waitForURL(
        (url) => !url.href.includes('/login') && (url.href.includes('/my-dashboard') || url.href.includes('my-dashboard')),
        { timeout: 30000, waitUntil: 'networkidle' }
      ).catch(() => {
        // 如果导航超时，继续检查当前 URL
        return null;
      }),
      page.click('button[type="submit"]')
    ]);

    // 4. 等待一段时间确保页面完全加载
    await page.waitForTimeout(2000);

    // 5. 检查当前 URL 是否为成功页面
    const currentUrl = page.url();
    log.info(`Singa 登录后当前URL: ${currentUrl}`);

    if (currentUrl.includes('/my-dashboard') || currentUrl.includes(oriUrl) || currentUrl.includes('my-dashboard')) {
      log.info(`Singa 登录成功: ${username}`);
      return {
        success: false,
        message: '登录失败: 用户名或密码错误，或需要验证码'
      };
    } else {
      log.warn(`Singa 登录失败: 未知错误，当前URL: ${currentUrl}`);
      return {
        success: false,
        message: `登录失败: 未跳转到预期页面，当前URL: ${currentUrl}`
      };
    }
  } catch (error) {
    log.error('Singa 登录过程出错:', error);
    return {
      success: false,
      message: `登录失败: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

